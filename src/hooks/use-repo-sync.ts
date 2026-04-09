import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SyncState = "idle" | "syncing" | "success" | "failed";

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  error: string | null;
  stats: { prs: number; reviews: number; commits: number; deployments: number } | null;
}

export function useRepoSync() {
  const [syncMap, setSyncMap] = useState<Record<string, SyncStatus>>({});

  const getStatus = useCallback(
    (repoId: string): SyncStatus =>
      syncMap[repoId] ?? { state: "idle", lastSyncedAt: null, error: null, stats: null },
    [syncMap]
  );

  const triggerSync = useCallback(
    async (repoId: string, token?: string, sinceDays = 90) => {
      setSyncMap((prev) => ({
        ...prev,
        [repoId]: { state: "syncing", lastSyncedAt: prev[repoId]?.lastSyncedAt ?? null, error: null, stats: null },
      }));

      try {
        const { data, error } = await supabase.functions.invoke("github-sync", {
          body: { repoId, token: token || undefined, sinceDays },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        const now = new Date().toISOString();
        setSyncMap((prev) => ({
          ...prev,
          [repoId]: { state: "success", lastSyncedAt: now, error: null, stats: data.stats },
        }));
        toast.success(
          `Synced: ${data.stats.prs} PRs, ${data.stats.commits} commits, ${data.stats.deployments} deployments`
        );
        return data.stats;
      } catch (err: any) {
        setSyncMap((prev) => ({
          ...prev,
          [repoId]: { state: "failed", lastSyncedAt: prev[repoId]?.lastSyncedAt ?? null, error: err.message, stats: null },
        }));
        toast.error(`Sync failed: ${err.message}`);
        return null;
      }
    },
    []
  );

  return { getStatus, triggerSync };
}
