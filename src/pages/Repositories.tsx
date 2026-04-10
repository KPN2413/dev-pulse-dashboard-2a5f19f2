import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepositories, type RepoRow } from "@/hooks/use-repositories";
import { useRepoSync } from "@/hooks/use-repo-sync";
import { useWebhookProvision } from "@/hooks/use-webhook-provision";
import { AddRepoForm } from "@/components/repositories/AddRepoForm";
import { WebhookSetupPanel } from "@/components/repositories/WebhookSetupPanel";
import { RepoCard } from "@/components/repositories/RepoCard";

export default function RepositoriesPage() {
  const { repos, loading, addRepo, updateRepo, deleteRepo, fetchRepos } = useRepositories();
  const { getStatus, triggerSync } = useRepoSync();
  const { getStatus: getProvisionStatus, provision, verify } = useWebhookProvision();
  const [showAdd, setShowAdd] = useState(false);
  const [setupRepo, setSetupRepo] = useState<RepoRow | null>(null);

  const handleAdded = async (fields: {
    owner: string;
    name: string;
    full_name: string;
    github_repo_id?: string;
  }) => {
    const repo = await addRepo(fields);
    if (repo) {
      setShowAdd(false);
      setSetupRepo(repo);
    }
    return repo;
  };

  const handleSync = (repoId: string) => {
    triggerSync(repoId);
  };

  const handleProvision = async (repoId: string) => {
    const result = await provision(repoId);
    if (result?.success) {
      // Refresh repos to get updated webhook metadata
      fetchRepos();
    } else if (result?.fallback) {
      // Show manual setup panel
      const repo = repos.find((r) => r.id === repoId);
      if (repo) setSetupRepo(repo);
    }
  };

  const handleVerify = async (repoId: string) => {
    await verify(repoId);
    fetchRepos();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Repositories</h1>
            <p className="text-sm text-muted-foreground">
              {repos.length} repositor{repos.length === 1 ? "y" : "ies"} connected
            </p>
          </div>
          <Button onClick={() => { setShowAdd(!showAdd); setSetupRepo(null); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Repository
          </Button>
        </div>

        {showAdd && (
          <AddRepoForm onAdded={handleAdded} onCancel={() => setShowAdd(false)} />
        )}

        {setupRepo && (
          <WebhookSetupPanel repo={setupRepo} onClose={() => setSetupRepo(null)} />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onSetupWebhook={(r) => { setSetupRepo(r); setShowAdd(false); }}
              onDelete={deleteRepo}
              onUpdate={updateRepo}
              syncStatus={getStatus(repo.id)}
              onSync={handleSync}
              webhookProvisionStatus={getProvisionStatus(repo.id)}
              onProvisionWebhook={handleProvision}
              onVerifyWebhook={handleVerify}
            />
          ))}
          {repos.length === 0 && !showAdd && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No repositories yet. Click &quot;Add Repository&quot; to connect your first GitHub repo.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
