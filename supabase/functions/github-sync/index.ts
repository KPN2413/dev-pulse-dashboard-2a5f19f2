import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return ok({ error: msg }, status);
}

/* ── GitHub helpers ── */

const GH = "https://api.github.com";

async function ghFetch(url: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new Error("GitHub API rate limit exceeded. Try again later or use a personal access token.");
  }
  if (res.status === 401) {
    throw new Error("GitHub token is invalid or expired.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function ghFetchAll(url: string, token?: string, maxPages = 5) {
  const results: any[] = [];
  let page = 1;
  while (page <= maxPages) {
    const sep = url.includes("?") ? "&" : "?";
    const data = await ghFetch(`${url}${sep}per_page=100&page=${page}`, token);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

/* ── Sync logic ── */

async function syncRepo(
  supabase: ReturnType<typeof createClient>,
  repoId: string,
  owner: string,
  name: string,
  token?: string,
  sinceDays = 90
) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const stats = { prs: 0, reviews: 0, commits: 0, deployments: 0 };

  // 1. Pull Requests
  const prs = await ghFetchAll(
    `${GH}/repos/${owner}/${name}/pulls?state=all&sort=updated&direction=desc`,
    token,
    5
  );

  for (const pr of prs) {
    const createdAt = pr.created_at;
    if (new Date(createdAt) < new Date(since)) continue;

    let state: "open" | "merged" | "closed" = "open";
    if (pr.merged_at) state = "merged";
    else if (pr.state === "closed") state = "closed";

    let cycleTimeMinutes: number | null = null;
    if (pr.merged_at && pr.created_at) {
      cycleTimeMinutes = Math.round(
        (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / 60000
      );
    }

    const { error } = await supabase.from("pull_requests").upsert(
      {
        repository_id: repoId,
        github_pr_id: String(pr.id),
        number: pr.number,
        title: pr.title,
        state,
        created_at_github: pr.created_at,
        merged_at: pr.merged_at || null,
        closed_at: pr.closed_at || null,
        cycle_time_minutes: cycleTimeMinutes,
      },
      { onConflict: "github_pr_id" }
    );
    if (!error) stats.prs++;

    // 1b. Reviews for this PR
    try {
      const reviews = await ghFetchAll(
        `${GH}/repos/${owner}/${name}/pulls/${pr.number}/reviews`,
        token,
        2
      );
      for (const rev of reviews) {
        let reviewState: "approved" | "changes_requested" | "commented" | "pending" = "commented";
        const s = (rev.state || "").toUpperCase();
        if (s === "APPROVED") reviewState = "approved";
        else if (s === "CHANGES_REQUESTED") reviewState = "changes_requested";
        else if (s === "PENDING") reviewState = "pending";

        // We need the PR's DB id — look it up
        const { data: dbPr } = await supabase
  .from("pull_requests")
  .select("id")
  .eq("github_pr_id", String(pr.id))
  .maybeSingle();
        if (!dbPr) continue;

        const { error: revErr } = await supabase.from("pull_request_reviews").upsert(
          {
            id: rev.id ? String(rev.id) : undefined,
            pull_request_id: dbPr.id,
            state: reviewState,
            submitted_at: rev.submitted_at || null,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        if (!revErr) stats.reviews++;
      }
    } catch {
      // Reviews fetch can fail for draft PRs, skip
    }
  }

  // 2. Commits
  const commits = await ghFetchAll(
    `${GH}/repos/${owner}/${name}/commits?since=${since}`,
    token,
    5
  );

  for (const c of commits) {
    const { error } = await supabase.from("commits").upsert(
      {
        repository_id: repoId,
        sha: c.sha,
        message: c.commit?.message?.slice(0, 500) || null,
        committed_at: c.commit?.committer?.date || c.commit?.author?.date || new Date().toISOString(),
      },
      { onConflict: "sha,repository_id", ignoreDuplicates: true }
    );
    if (!error) stats.commits++;
  }

  // 3. Deployments
  try {
    const deployments = await ghFetchAll(
      `${GH}/repos/${owner}/${name}/deployments`,
      token,
      2
    );
    for (const d of deployments) {
      if (new Date(d.created_at) < new Date(since)) continue;
      let status: "success" | "failure" | "pending" | "in_progress" = "pending";
      // Fetch latest status
      try {
        const statuses = await ghFetch(
          `${GH}/repos/${owner}/${name}/deployments/${d.id}/statuses?per_page=1`,
          token
        );
        if (Array.isArray(statuses) && statuses.length > 0) {
          const s = statuses[0].state;
          if (s === "success") status = "success";
          else if (s === "failure" || s === "error") status = "failure";
          else if (s === "in_progress") status = "in_progress";
        }
      } catch { /* ignore */ }

      const { error } = await supabase.from("deployments").upsert(
        {
          repository_id: repoId,
          environment: d.environment || "production",
          status,
          deployed_at: d.created_at,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      if (!error) stats.deployments++;
    }
  } catch {
    // Deployments API may not be available
  }

  // 4. Compute metric_snapshots for each day in range
  await refreshMetricSnapshots(supabase, repoId, since);

  // 5. Update last_synced_at
  await supabase
    .from("repositories")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", repoId);

  return stats;
}

async function refreshMetricSnapshots(
  supabase: ReturnType<typeof createClient>,
  repoId: string,
  since: string
) {
  // Get all PRs for this repo in range
  const { data: prs } = await supabase
    .from("pull_requests")
    .select("*")
    .eq("repository_id", repoId)
    .gte("created_at_github", since);

  const { data: commits } = await supabase
    .from("commits")
    .select("*")
    .eq("repository_id", repoId)
    .gte("committed_at", since);

  const { data: deploys } = await supabase
    .from("deployments")
    .select("*")
    .eq("repository_id", repoId)
    .gte("deployed_at", since);

  // Group by date
  const dateMap: Record<string, {
    totalPrs: number;
    cycleTimes: number[];
    reviewTimes: number[];
    commitCount: number;
    deployCount: number;
  }> = {};

  const ensureDate = (d: string) => {
    const key = d.slice(0, 10);
    if (!dateMap[key]) {
      dateMap[key] = { totalPrs: 0, cycleTimes: [], reviewTimes: [], commitCount: 0, deployCount: 0 };
    }
    return key;
  };

  for (const pr of prs || []) {
    const key = ensureDate(pr.created_at_github || pr.created_at);
    dateMap[key].totalPrs++;
    if (pr.cycle_time_minutes) dateMap[key].cycleTimes.push(pr.cycle_time_minutes / 60);
    if (pr.review_turnaround_minutes) dateMap[key].reviewTimes.push(pr.review_turnaround_minutes / 60);
  }

  for (const c of commits || []) {
    const key = ensureDate(c.committed_at);
    dateMap[key].commitCount++;
  }

  for (const d of deploys || []) {
    const key = ensureDate(d.deployed_at);
    dateMap[key].deployCount++;
  }

  // Upsert snapshots
  for (const [date, data] of Object.entries(dateMap)) {
    const avgCycle = data.cycleTimes.length
      ? data.cycleTimes.reduce((a, b) => a + b, 0) / data.cycleTimes.length
      : null;
    const avgReview = data.reviewTimes.length
      ? data.reviewTimes.reduce((a, b) => a + b, 0) / data.reviewTimes.length
      : null;

    await supabase.from("metric_snapshots").upsert(
      {
        repository_id: repoId,
        date,
        total_prs: data.totalPrs,
        avg_cycle_time_hours: avgCycle,
        avg_review_turnaround_hours: avgReview,
        commit_count: data.commitCount,
        deployment_count: data.deployCount,
      },
      { onConflict: "repository_id,date", ignoreDuplicates: false }
    );
  }
}

/* ── Handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return err("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData.user) {
      return err("Unauthorized", 401);
    }
    const userId = claimsData.user.id;

    const body = await req.json();
    const { repoId, token, sinceDays } = body;

    if (!repoId) return err("repoId is required");

    // Use service role for DB writes (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify repo ownership
    const { data: repo } = await adminClient
  .from("repositories")
  .select("*")
  .eq("id", repoId)
  .eq("user_id", userId)
  .maybeSingle();

if (repoErr || !repo) return err("Repository not found or access denied", 404);


    if (!repo) return err("Repository not found or access denied", 404);

    // Resolve token: explicit > saved credential > none
    let effectiveToken = token || undefined;
    if (!effectiveToken) {
      const { data: cred } = await adminClient
  .from("github_credentials")
  .select("token_encrypted, is_valid")
  .eq("user_id", userId)
  .maybeSingle();
      if (cred?.is_valid && cred.token_encrypted) {
        effectiveToken = cred.token_encrypted;
      }
    }

    const stats = await syncRepo(
      adminClient,
      repoId,
      repo.owner,
      repo.name,
      effectiveToken,
      sinceDays || 90
    );

    return ok({ success: true, stats });
  } catch (e: any) {
    console.error("Sync error:", e.message);
    return err(e.message, 500);
  }
});
