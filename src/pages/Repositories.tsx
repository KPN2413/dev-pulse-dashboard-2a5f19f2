import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Plus, GitBranch, Webhook, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

interface DbRepo {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  is_active: boolean;
  webhook_configured: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  github_repo_id: string | null;
}

export default function RepositoriesPage() {
  const { user } = useAuth();
  const [repos, setRepos] = useState<DbRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("repositories").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setRepos((data as DbRepo[]) || []);
      setLoading(false);
    });
  }, []);

  const handleAdd = async () => {
    if (!newOwner || !newName || !user) return;
    const { data, error } = await supabase.from("repositories").insert({
      owner: newOwner,
      name: newName,
      full_name: `${newOwner}/${newName}`,
      user_id: user.id,
    }).select().single();

    if (error) {
      toast.error("Failed to add repository");
      return;
    }
    setRepos([data as DbRepo, ...repos]);
    setNewOwner("");
    setNewName("");
    setShowAdd(false);
    toast.success("Repository added");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
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
              onClick={() => setSelectedRepoId(selectedRepoId === repo.id ? null : repo.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{repo.full_name}</span>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  repo.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                )}>{repo.is_active ? "Active" : "Inactive"}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Webhook className="h-3.5 w-3.5" />
                  <span>Webhook: </span>
                  {repo.webhook_configured ? (
                    <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Configured</span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning"><XCircle className="h-3.5 w-3.5" /> Not configured</span>
                  )}
                </div>
              </div>

              {selectedRepoId === repo.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Owner:</span> {repo.owner}</p>
                  <p><span className="font-medium text-foreground">Name:</span> {repo.name}</p>
                  <p><span className="font-medium text-foreground">Created:</span> {format(new Date(repo.created_at), "PPP")}</p>
                  <p><span className="font-medium text-foreground">GitHub ID:</span> {repo.github_repo_id || "Not linked"}</p>
                </div>
              )}
            </div>
          ))}
          {repos.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No repositories yet. Click "Add Repository" to get started.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
