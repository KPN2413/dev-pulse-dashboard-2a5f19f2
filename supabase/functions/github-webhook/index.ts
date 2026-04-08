import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-github-event, x-github-delivery",
};

async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const digest = "sha256=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === digest;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET");

  const body = await req.text();
  const event = req.headers.get("x-github-event") || "unknown";
  const deliveryId = req.headers.get("x-github-delivery");
  const signature = req.headers.get("x-hub-signature-256");

  // Verify signature if secret is configured
  if (webhookSecret) {
    const valid = await verifySignature(body, signature, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find matching repository
  const repoFullName = (payload.repository as Record<string, unknown>)?.full_name as string | undefined;
  let repoId: string | null = null;

  if (repoFullName) {
    const { data: repo } = await supabase
      .from("repositories")
      .select("id")
      .eq("full_name", repoFullName)
      .maybeSingle();
    repoId = repo?.id || null;
  }

  // Store raw webhook event
  const { error: eventError } = await supabase.from("webhook_events").insert({
    event_type: event,
    delivery_id: deliveryId,
    repository_id: repoId,
    raw_payload: payload,
    status: "received",
  });

  if (eventError) {
    console.error("Failed to store webhook event:", eventError);
    return new Response(JSON.stringify({ error: "Failed to store event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Process event based on type
  let processed = false;
  try {
    if (event === "pull_request" && repoId) {
      processed = await handlePullRequest(supabase, payload, repoId);
    } else if (event === "push" && repoId) {
      processed = await handlePush(supabase, payload, repoId);
    } else if (event === "deployment_status" && repoId) {
      processed = await handleDeploymentStatus(supabase, payload, repoId);
    } else if (event === "pull_request_review" && repoId) {
      processed = await handlePullRequestReview(supabase, payload, repoId);
    } else if (event === "ping") {
      processed = true;
    }

    // Update webhook event status
    if (deliveryId) {
      await supabase
        .from("webhook_events")
        .update({
          status: processed ? "processed" : "received",
          processed_at: processed ? new Date().toISOString() : null,
        })
        .eq("delivery_id", deliveryId);
    }
  } catch (err) {
    console.error(`Error processing ${event}:`, err);
    if (deliveryId) {
      await supabase
        .from("webhook_events")
        .update({ status: "failed" })
        .eq("delivery_id", deliveryId);
    }
  }

  return new Response(
    JSON.stringify({ received: true, event, processed }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

// ── Handlers ──

async function handlePullRequest(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  repoId: string
): Promise<boolean> {
  const pr = payload.pull_request as Record<string, unknown>;
  if (!pr) return false;

  const ghPrId = String(pr.id);
  const number = pr.number as number;
  const title = pr.title as string;
  const action = payload.action as string;

  const stateMap: Record<string, string> = {
    opened: "open",
    reopened: "open",
    closed: (pr.merged as boolean) ? "merged" : "closed",
    synchronize: "open",
  };
  const state = stateMap[action] || "open";

  const createdAtGithub = pr.created_at as string;
  const mergedAt = pr.merged_at as string | null;
  const closedAt = pr.closed_at as string | null;

  // Calculate cycle time (created → merged) in minutes
  let cycleTimeMinutes: number | null = null;
  if (mergedAt && createdAtGithub) {
    cycleTimeMinutes = Math.round(
      (new Date(mergedAt).getTime() - new Date(createdAtGithub).getTime()) / 60000
    );
  }

  const { error } = await supabase.from("pull_requests").upsert(
    {
      github_pr_id: ghPrId,
      repository_id: repoId,
      number,
      title,
      state,
      created_at_github: createdAtGithub,
      merged_at: mergedAt,
      closed_at: closedAt,
      cycle_time_minutes: cycleTimeMinutes,
    },
    { onConflict: "github_pr_id" }
  );

  if (error) console.error("PR upsert error:", error);
  return !error;
}

async function handlePush(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  repoId: string
): Promise<boolean> {
  const commits = payload.commits as Array<Record<string, unknown>>;
  if (!commits?.length) return false;

  const rows = commits.map((c) => ({
    sha: c.id as string,
    message: (c.message as string)?.substring(0, 500) || null,
    repository_id: repoId,
    committed_at: c.timestamp as string,
  }));

  const { error } = await supabase.from("commits").insert(rows);
  if (error) console.error("Commits insert error:", error);
  return !error;
}

async function handleDeploymentStatus(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  repoId: string
): Promise<boolean> {
  const deploymentStatus = payload.deployment_status as Record<string, unknown>;
  const deployment = payload.deployment as Record<string, unknown>;
  if (!deploymentStatus || !deployment) return false;

  const ghState = deploymentStatus.state as string;
  const statusMap: Record<string, string> = {
    success: "success",
    failure: "failure",
    error: "failure",
    pending: "pending",
    in_progress: "in_progress",
    queued: "pending",
  };

  const { error } = await supabase.from("deployments").insert({
    repository_id: repoId,
    environment: (deployment.environment as string) || "production",
    status: statusMap[ghState] || "pending",
    deployed_at: (deploymentStatus.created_at as string) || new Date().toISOString(),
  });

  if (error) console.error("Deployment insert error:", error);
  return !error;
}

async function handlePullRequestReview(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  repoId: string
): Promise<boolean> {
  const review = payload.review as Record<string, unknown>;
  const pr = payload.pull_request as Record<string, unknown>;
  if (!review || !pr) return false;

  const ghPrId = String(pr.id);

  // Find the PR in our DB
  const { data: dbPr } = await supabase
    .from("pull_requests")
    .select("id, created_at_github")
    .eq("github_pr_id", ghPrId)
    .maybeSingle();

  if (!dbPr) return false;

  const stateMap: Record<string, string> = {
    approved: "approved",
    changes_requested: "changes_requested",
    commented: "commented",
  };
  const state = stateMap[review.state as string] || "commented";
  const submittedAt = review.submitted_at as string;

  // Calculate review turnaround
  let turnaroundMinutes: number | null = null;
  if (submittedAt && dbPr.created_at_github) {
    turnaroundMinutes = Math.round(
      (new Date(submittedAt).getTime() - new Date(dbPr.created_at_github).getTime()) / 60000
    );
  }

  const { error: reviewError } = await supabase.from("pull_request_reviews").insert({
    pull_request_id: dbPr.id,
    state,
    submitted_at: submittedAt,
  });

  // Update review turnaround on the PR
  if (!reviewError && turnaroundMinutes !== null) {
    await supabase
      .from("pull_requests")
      .update({ review_turnaround_minutes: turnaroundMinutes })
      .eq("id", dbPr.id);
  }

  if (reviewError) console.error("Review insert error:", reviewError);
  return !reviewError;
}
