import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { mockRepos } from "@/api/mock-data";
import { Repository } from "@/types";
import { cn } from "@/lib/utils";
import { Plus, GitBranch, Webhook, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>(mockRepos);
  const [showAdd, setShowAdd] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleAdd = () => {
    if (!newOwner || !newName) return;
    const repo: Repository = {
      id: `r${Date.now()}`,
      organizationId: "org1",
      owner: newOwner,
      name: newName,
      fullName: `${newOwner}/${newName}`,
      isActive: true,
      webhookConfigured: false,
      createdAt: new Date().toISOString(),
    };
    setRepos([...repos, repo]);
    setNewOwner("");
    setNewName("");
    setShowAdd(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Repositories</h1>
            <p className="text-sm text-muted-foreground">{repos.length} repositories connected</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" /> Add Repository
          </Button>
        </div>

        {showAdd && (
          <div className="glass-card rounded-xl p-5 animate-fade-in">
            <h3 className="text-sm font-semibold mb-4">Add Repository</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="owner">Owner</Label>
                <Input id="owner" placeholder="organization" value={newOwner} onChange={e => setNewOwner(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="repoName">Repository Name</Label>
                <Input id="repoName" placeholder="my-repo" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd}>Add</Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map(repo => (
            <div
              key={repo.id}
              className="glass-card rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-colors animate-fade-in"
              onClick={() => setSelectedRepo(selectedRepo?.id === repo.id ? null : repo)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{repo.fullName}</span>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  repo.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                )}>{repo.isActive ? "Active" : "Inactive"}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Webhook className="h-3.5 w-3.5" />
                  <span>Webhook: </span>
                  {repo.webhookConfigured ? (
                    <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning"><XCircle className="h-3.5 w-3.5" /> Not configured</span>
                  )}
                </div>
                {repo.lastSyncAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last sync: {format(new Date(repo.lastSyncAt), "MMM dd, HH:mm")}</span>
                  </div>
                )}
              </div>

              {selectedRepo?.id === repo.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Owner:</span> {repo.owner}</p>
                  <p><span className="font-medium text-foreground">Name:</span> {repo.name}</p>
                  <p><span className="font-medium text-foreground">Created:</span> {format(new Date(repo.createdAt), "PPP")}</p>
                  <p><span className="font-medium text-foreground">GitHub ID:</span> {repo.githubRepoId || "Not linked"}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
