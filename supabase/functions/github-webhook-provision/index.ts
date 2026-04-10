import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getToken(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("github_credentials")
    .select("token_encrypted, is_valid")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { token: null, error: "No GitHub token saved. Go to Settings → GitHub Credentials." };
  if (!data.is_valid) return { token: null, error: "Your GitHub token is marked invalid. Please update it in Settings." };
  return { token: data.token_encrypted, error: null };
}

async function ghFetch(url: string, token: string, method = "GET", body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, rateLimitRemaining: parseInt(res.headers.get("x-ratelimit-remaining") || "999") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";

  // Authenticate user
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { authorization: authHeader } },
  });
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const action = body.action as string;
  const repoId = body.repoId as string;

  if (!repoId) return jsonResponse({ error: "repoId is required" }, 400);

  // Verify repo ownership
  const { data: repo } = await supabaseAdmin
    .from("repositories")
    .select("*")
    .eq("id", repoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!repo) return jsonResponse({ error: "Repository not found or access denied" }, 404);

  // Get token
  const { token, error: tokenError } = await getToken(supabaseAdmin, user.id);
  if (!token) {
    return jsonResponse({
      error: tokenError,
      fallback: true,
      message: "Automatic webhook setup requires a GitHub token with admin:repo_hook scope.",
    }, 200);
  }

  const projectId = supabaseUrl.replace("https://", "").split(".")[0];
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/github-webhook`;
  const desiredEvents = ["pull_request", "push", "deployment_status", "pull_request_review"];

  if (action === "provision") {
    return await provisionWebhook(supabaseAdmin, repo, token, webhookUrl, webhookSecret, desiredEvents);
  } else if (action === "verify") {
    return await verifyWebhook(supabaseAdmin, repo, token, webhookUrl, desiredEvents);
  } else {
    return jsonResponse({ error: "Invalid action. Use 'provision' or 'verify'." }, 400);
  }
});

async function provisionWebhook(
  supabase: ReturnType<typeof createClient>,
  repo: Record<string, unknown>,
  token: string,
  webhookUrl: string,
  webhookSecret: string,
  events: string[]
) {
  const repoId = repo.id as string;
  const fullName = repo.full_name as string;
  const existingWebhookId = repo.github_webhook_id as number | null;

  // Set status to configuring
  await supabase.from("repositories").update({
    webhook_status: "configuring",
  }).eq("id", repoId);

  const config = {
    url: webhookUrl,
    content_type: "json",
    secret: webhookSecret,
    insecure_ssl: "0",
  };

  try {
    // If we have an existing webhook ID, try to update it first
    if (existingWebhookId) {
      const { status, json } = await ghFetch(
        `https://api.github.com/repos/${fullName}/hooks/${existingWebhookId}`,
        token,
        "PATCH",
        { config, events, active: true }
      );

      if (status === 200) {
        await supabase.from("repositories").update({
          webhook_configured: true,
          webhook_status: "active",
          github_webhook_id: json.id,
          webhook_configured_at: new Date().toISOString(),
          webhook_last_checked_at: new Date().toISOString(),
        }).eq("id", repoId);
        return jsonResponse({ success: true, action: "updated", webhookId: json.id });
      }
      // If 404, the webhook was deleted externally; fall through to create
      if (status !== 404) {
        return handleGitHubError(supabase, repoId, status, json);
      }
    }

    // Check for existing webhooks with our URL
    const { status: listStatus, json: hooks, rateLimitRemaining } = await ghFetch(
      `https://api.github.com/repos/${fullName}/hooks?per_page=100`,
      token
    );

    if (rateLimitRemaining < 5) {
      await supabase.from("repositories").update({ webhook_status: "failed" }).eq("id", repoId);
      return jsonResponse({ error: "GitHub API rate limit nearly exhausted. Please try again later." }, 429);
    }

    if (listStatus === 404) {
      await supabase.from("repositories").update({ webhook_status: "failed" }).eq("id", repoId);
      return jsonResponse({
        error: "Cannot access repository webhooks. Ensure your token has admin:repo_hook scope and you have admin access to this repository.",
        fallback: true,
      }, 200);
    }

    if (listStatus !== 200) {
      return handleGitHubError(supabase, repoId, listStatus, hooks);
    }

    // Find existing webhook with our URL
    const existing = (hooks as Array<Record<string, unknown>>).find(
      (h: Record<string, unknown>) => (h.config as Record<string, unknown>)?.url === webhookUrl
    );

    if (existing) {
      // Update existing webhook with correct config
      const { status, json } = await ghFetch(
        `https://api.github.com/repos/${fullName}/hooks/${existing.id}`,
        token,
        "PATCH",
        { config, events, active: true }
      );

      if (status === 200) {
        await supabase.from("repositories").update({
          webhook_configured: true,
          webhook_status: "active",
          github_webhook_id: json.id,
          webhook_configured_at: new Date().toISOString(),
          webhook_last_checked_at: new Date().toISOString(),
        }).eq("id", repoId);
        return jsonResponse({ success: true, action: "repaired", webhookId: json.id });
      }
      return handleGitHubError(supabase, repoId, status, json);
    }

    // Create new webhook
    const { status, json } = await ghFetch(
      `https://api.github.com/repos/${fullName}/hooks`,
      token,
      "POST",
      { name: "web", active: true, events, config }
    );

    if (status === 201) {
      await supabase.from("repositories").update({
        webhook_configured: true,
        webhook_status: "active",
        github_webhook_id: json.id,
        webhook_configured_at: new Date().toISOString(),
        webhook_last_checked_at: new Date().toISOString(),
      }).eq("id", repoId);
      return jsonResponse({ success: true, action: "created", webhookId: json.id });
    }

    return handleGitHubError(supabase, repoId, status, json);
  } catch (err) {
    console.error("Provision error:", err);
    await supabase.from("repositories").update({ webhook_status: "failed" }).eq("id", repoId);
    return jsonResponse({ error: "Unexpected error during webhook provisioning" }, 500);
  }
}

async function verifyWebhook(
  supabase: ReturnType<typeof createClient>,
  repo: Record<string, unknown>,
  token: string,
  webhookUrl: string,
  desiredEvents: string[]
) {
  const repoId = repo.id as string;
  const fullName = repo.full_name as string;
  const webhookId = repo.github_webhook_id as number | null;

  if (!webhookId) {
    await supabase.from("repositories").update({
      webhook_status: "not_configured",
      webhook_last_checked_at: new Date().toISOString(),
    }).eq("id", repoId);
    return jsonResponse({ status: "not_configured", message: "No webhook has been provisioned yet." });
  }

  try {
    const { status, json } = await ghFetch(
      `https://api.github.com/repos/${fullName}/hooks/${webhookId}`,
      token
    );

    if (status === 404) {
      await supabase.from("repositories").update({
        webhook_status: "misconfigured",
        webhook_configured: false,
        github_webhook_id: null,
        webhook_last_checked_at: new Date().toISOString(),
      }).eq("id", repoId);
      return jsonResponse({
        status: "misconfigured",
        message: "Webhook was deleted on GitHub. Use 'Set Up Webhook' to recreate it.",
      });
    }

    if (status !== 200) {
      return handleGitHubError(supabase, repoId, status, json);
    }

    const hookConfig = json.config as Record<string, unknown>;
    const hookEvents = json.events as string[];
    const active = json.active as boolean;
    const issues: string[] = [];

    if (hookConfig?.url !== webhookUrl) issues.push("Webhook URL doesn't match expected endpoint");
    if (hookConfig?.content_type !== "json") issues.push("Content type should be application/json");
    if (!active) issues.push("Webhook is not active");

    const missingEvents = desiredEvents.filter((e) => !hookEvents.includes(e));
    if (missingEvents.length > 0) issues.push(`Missing events: ${missingEvents.join(", ")}`);

    // Check recent deliveries
    let deliveryHealth = "unknown";
    const { status: delStatus, json: deliveries } = await ghFetch(
      `https://api.github.com/repos/${fullName}/hooks/${webhookId}/deliveries?per_page=5`,
      token
    );

    if (delStatus === 200 && Array.isArray(deliveries) && deliveries.length > 0) {
      const recentFailures = deliveries.filter((d: Record<string, unknown>) =>
        (d.status_code as number) >= 400 || d.status === "error"
      );
      deliveryHealth = recentFailures.length === 0 ? "healthy" : `${recentFailures.length}/${deliveries.length} recent deliveries failed`;
    }

    const webhookStatus = issues.length === 0 ? "active" : "misconfigured";
    await supabase.from("repositories").update({
      webhook_status: webhookStatus,
      webhook_configured: issues.length === 0,
      webhook_last_checked_at: new Date().toISOString(),
    }).eq("id", repoId);

    return jsonResponse({
      status: webhookStatus,
      active,
      url: hookConfig?.url,
      events: hookEvents,
      issues,
      deliveryHealth,
      lastPing: json.last_response,
    });
  } catch (err) {
    console.error("Verify error:", err);
    return jsonResponse({ error: "Failed to verify webhook" }, 500);
  }
}

async function handleGitHubError(
  supabase: ReturnType<typeof createClient>,
  repoId: string,
  status: number,
  json: Record<string, unknown>
) {
  await supabase.from("repositories").update({ webhook_status: "failed" }).eq("id", repoId);

  const message = (json.message as string) || "Unknown GitHub API error";

  if (status === 401) {
    return jsonResponse({ error: "GitHub token is invalid or expired. Update it in Settings.", fallback: true }, 200);
  }
  if (status === 403) {
    if (message.includes("rate limit")) {
      return jsonResponse({ error: "GitHub API rate limit exceeded. Please try again later." }, 429);
    }
    return jsonResponse({
      error: "Insufficient permissions. Your token needs admin:repo_hook scope and you need admin access to this repository.",
      fallback: true,
    }, 200);
  }
  if (status === 404) {
    return jsonResponse({
      error: "Repository not found or insufficient permissions to manage webhooks.",
      fallback: true,
    }, 200);
  }
  if (status === 422) {
    return jsonResponse({ error: `GitHub validation error: ${message}` }, 200);
  }

  return jsonResponse({ error: `GitHub API error (${status}): ${message}` }, 200);
}
