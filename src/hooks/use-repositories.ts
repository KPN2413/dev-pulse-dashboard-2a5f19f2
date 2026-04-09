import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type RepoRow = Tables<"repositories">;

export type RepoStatus = "connected" | "pending_webhook" | "webhook_active" | "sync_needed";

export function getRepoStatus(repo: RepoRow, hasRecentEvents?: boolean): RepoStatus {
  if (!repo.is_active) return "sync_needed";
  if (!repo.webhook_configured) return "pending_webhook";
  if (hasRecentEvents) return "webhook_active";
  return "connected";
}

export function useRepositories() {
  const { user } = useAuth();
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("repositories")
      .select("*")
      .order("created_at", { ascending: false });
    setRepos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const addRepo = async (fields: {
    owner: string;
    name: string;
    full_name: string;
    github_repo_id?: string;
  }): Promise<RepoRow | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("repositories")
      .insert({ ...fields, user_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setRepos((prev) => [data, ...prev]);
    toast.success("Repository added");
    return data;
  };

  const updateRepo = async (id: string, fields: Partial<RepoRow>) => {
    const { error } = await supabase
      .from("repositories")
      .update(fields)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setRepos((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    return true;
  };

  const deleteRepo = async (id: string) => {
    const { error } = await supabase.from("repositories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setRepos((prev) => prev.filter((r) => r.id !== id));
    toast.success("Repository removed");
    return true;
  };

  return { repos, loading, fetchRepos, addRepo, updateRepo, deleteRepo };
}

export async function validateGitHubRepo(owner: string, name: string, token?: string) {
  const { data, error } = await supabase.functions.invoke("validate-repo", {
    body: { action: "validate", owner, name, token: token || undefined },
  });
  if (error) throw new Error(error.message);
  return data as {
    valid: boolean;
    error?: string;
    repo?: {
      full_name: string;
      owner: string;
      name: string;
      github_repo_id: string;
      private: boolean;
      default_branch: string;
    };
  };
}

export async function testRepoConnection(repoId: string) {
  const { data, error } = await supabase.functions.invoke("validate-repo", {
    body: { action: "test-connection", repoId },
  });
  if (error) throw new Error(error.message);
  return data as {
    ok: boolean;
    error?: string;
    repoExists?: boolean;
    webhookConfigured?: boolean;
    isActive?: boolean;
    hasRecentEvents?: boolean;
    lastEventAt?: string | null;
    lastEventStatus?: string | null;
  };
}
