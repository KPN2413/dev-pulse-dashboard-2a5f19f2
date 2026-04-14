import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getUserToken(admin: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("github_credentials")
    .select("token_encrypted, is_valid")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.is_valid && data.token_encrypted) return data.token_encrypted;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { action, owner, name, token, repoId } = await req.json();

    if (action === "validate") {
      if (!owner || !name) {
        return new Response(
          JSON.stringify({ error: "Owner and name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use provided token, or fall back to saved credential
      const effectiveToken = token || await getUserToken(admin, user.id);

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevPulse",
      };
      if (effectiveToken) {
        headers["Authorization"] = `Bearer ${effectiveToken}`;
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
        { headers }
      );

      if (ghRes.status === 401) {
        // Mark token as invalid if it was the saved one
        if (!token && effectiveToken) {
          await admin.from("github_credentials").update({ is_valid: false }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({
            valid: false,
            error: "GitHub token is invalid or expired. Please update your token in Settings.",
            tokenIssue: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (ghRes.status === 403) {
        const remaining = ghRes.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          return new Response(
            JSON.stringify({
              valid: false,
              error: "GitHub API rate limit exceeded. Try again later or add a token in Settings.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Access denied. The token may lack required scopes. Ensure 'repo' scope is enabled.",
            tokenIssue: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (ghRes.status === 404) {
        const msg = effectiveToken
          ? "Repository not found. Check the owner/name."
          : "Repository not found. If it's private, add a GitHub token in Settings.";
        return new Response(
          JSON.stringify({ valid: false, error: msg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!ghRes.ok) {
        const text = await ghRes.text();
        return new Response(
          JSON.stringify({ valid: false, error: `GitHub API error (${ghRes.status}): ${text}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ghData = await ghRes.json();
      return new Response(
        JSON.stringify({
          valid: true,
          repo: {
            full_name: ghData.full_name,
            owner: ghData.owner?.login,
            name: ghData.name,
            github_repo_id: String(ghData.id),
            private: ghData.private,
            default_branch: ghData.default_branch,
          },
          usedSavedToken: !token && !!effectiveToken,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test-connection") {
      if (!repoId) {
        return new Response(
          JSON.stringify({ error: "repoId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: repo, error: repoErr } = await supabase
        .from("repositories")
        .select("*")
        .eq("id", repoId)
        .single();

      if (repoErr || !repo) {
        return new Response(
          JSON.stringify({ ok: false, error: "Repository not found in database" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: events } = await supabase
        .from("webhook_events")
        .select("id, status, received_at")
        .eq("repository_id", repoId)
        .order("received_at", { ascending: false })
        .limit(1);

      const hasEvents = events && events.length > 0;
      const lastEvent = hasEvents ? events[0] : null;

      // Check if user has a saved token
      const savedToken = await getUserToken(admin, user.id);

      return new Response(
        JSON.stringify({
          ok: true,
          repoExists: true,
          webhookConfigured: repo.webhook_configured,
          isActive: repo.is_active,
          hasRecentEvents: hasEvents,
          lastEventAt: lastEvent?.received_at ?? null,
          lastEventStatus: lastEvent?.status ?? null,
          hasToken: !!savedToken,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
