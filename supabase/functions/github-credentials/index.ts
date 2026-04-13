import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();

    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { action, token } = await req.json();

    if (action === "status") {
      const { data: cred } = await admin
        .from("github_credentials")
        .select("token_last_four, is_valid, updated_at")
        .eq("user_id", user.id)
        .single();

      if (!cred) {
        return json({ status: "not_connected" });
      }

      return json({
        status: cred.is_valid ? "connected" : "invalid_token",
        tokenLastFour: cred.token_last_four,
        updatedAt: cred.updated_at,
      });
    }

    if (action === "save") {
      if (!token || typeof token !== "string" || token.length < 10) {
        return json(
          { error: "A valid GitHub personal access token is required" },
          400
        );
      }

      const lastFour = token.slice(-4);

      const ghRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (ghRes.status === 401) {
        return json(
          {
            error:
              "Invalid token. Please check that the token is correct and not expired.",
            status: "invalid_token",
          },
          400
        );
      }

      if (ghRes.status === 403) {
        const remaining = ghRes.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          return json(
            { error: "GitHub rate limit exceeded. Try again later." },
            429
          );
        }

        return json(
          {
            error:
              "Token has insufficient permissions. Ensure it has 'repo' scope.",
            status: "invalid_token",
          },
          400
        );
      }

      if (!ghRes.ok) {
        return json({ error: `GitHub API error: ${ghRes.status}` }, 400);
      }

      const ghUser = await ghRes.json();

      const { error: upsertErr } = await admin
        .from("github_credentials")
        .upsert(
          {
            user_id: user.id,
            token_encrypted: token,
            token_last_four: lastFour,
            is_valid: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        return json({ error: upsertErr.message || "Failed to save credentials" }, 500);
      }

      return json({
        status: "connected",
        tokenLastFour: lastFour,
        githubLogin: ghUser.login,
      });
    }

    if (action === "remove") {
      await admin.from("github_credentials").delete().eq("user_id", user.id);
      return json({ status: "not_connected" });
    }

    if (action === "test") {
      const { data: cred } = await admin
        .from("github_credentials")
        .select("token_encrypted, is_valid")
        .eq("user_id", user.id)
        .single();

      if (!cred) {
        return json({
          status: "not_connected",
          ok: false,
          error: "No GitHub token saved",
        });
      }

      const ghRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${cred.token_encrypted}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (ghRes.status === 401) {
        await admin
          .from("github_credentials")
          .update({ is_valid: false })
          .eq("user_id", user.id);

        return json({
          status: "invalid_token",
          ok: false,
          error: "Token is invalid or has been revoked. Please update your token.",
        });
      }

      if (ghRes.status === 403) {
        const remaining = ghRes.headers.get("x-ratelimit("x-ratelimit-remaining");
        if (remaining === "0") {
          return json({
            ok: false,
            error: "GitHub rate limit exceeded. Try again later.",
          });
        }

        await admin
          .from("github_credentials")
          .update({ is_valid: false })
          .eq("user_id", user.id);

        return json({
          status: "invalid_token",
          ok: false,
          error: "Token has insufficient permissions.",
        });
      }

      if (!ghRes.ok) {
        return json({ ok: false, error: `GitHub error: ${ghRes.status}` });
      }

      if (!cred.is_valid) {
        await admin
          .from("github_credentials")
          .update({ is_valid: true })
          .eq("user_id", user.id);
      }

      const ghUser = await ghRes.json();
      const scopes = ghRes.headers.get("x-oauth-scopes") || "";

      return json({
        status: "connected",
        ok: true,
        githubLogin: ghUser.login,
        scopes,
        rateLimit: {
          remaining: ghRes.headers.get("x-ratelimit-remaining"),
          limit: ghRes.headers.get("x-ratelimit-limit"),
          reset: ghRes.headers.get("x-ratelimit-reset"),
        },
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("github-credentials error:", err.message);
    return json({ error: err.message }, 500);
  }
});