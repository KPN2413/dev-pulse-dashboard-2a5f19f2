import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, owner, name, token, repoId } = await req.json();

    if (action === "validate") {
      // Validate repo exists on GitHub
      if (!owner || !name) {
        return new Response(
          JSON.stringify({ error: "Owner and name are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevPulse",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
        { headers }
      );

      if (ghRes.status === 404) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Repository not found. Check the owner/name or provide an access token for private repos.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!ghRes.ok) {
        const text = await ghRes.text();
        return new Response(
          JSON.stringify({
            valid: false,
            error: `GitHub API error (${ghRes.status}): ${text}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "test-connection") {
      if (!repoId) {
        return new Response(
          JSON.stringify({ error: "repoId is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if we've received any webhook events recently
      const { data: events } = await supabase
        .from("webhook_events")
        .select("id, status, received_at")
        .eq("repository_id", repoId)
        .order("received_at", { ascending: false })
        .limit(1);

      const hasEvents = events && events.length > 0;
      const lastEvent = hasEvents ? events[0] : null;

      return new Response(
        JSON.stringify({
          ok: true,
          repoExists: true,
          webhookConfigured: repo.webhook_configured,
          isActive: repo.is_active,
          hasRecentEvents: hasEvents,
          lastEventAt: lastEvent?.received_at ?? null,
          lastEventStatus: lastEvent?.status ?? null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
