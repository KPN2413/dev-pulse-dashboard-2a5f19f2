import React, { useState } from "react";
import { GitBranch, Settings, Zap, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { RepoStatusBadge } from "./RepoStatusBadge";
import { getRepoStatus, testRepoConnection, type RepoRow } from "@/hooks/use-repositories";

interface RepoCardProps {
  repo: RepoRow;
  onSetupWebhook: (repo: RepoRow) => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, fields: Partial<RepoRow>) => Promise<boolean>;
}

export function RepoCard({ repo, onSetupWebhook, onDelete, onUpdate }: RepoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const status = getRepoStatus(repo);

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testRepoConnection(repo.id);
      if (result.ok) {
        // Update local webhook state if backend shows events
        if (result.hasRecentEvents && !repo.webhook_configured) {
          await onUpdate(repo.id, { webhook_configured: true });
        }
        const parts: string[] = [];
        parts.push(result.repoExists ? "✓ Repo in database" : "✗ Repo not found");
        parts.push(result.webhookConfigured ? "✓ Webhook configured" : "○ Webhook not configured");
        if (result.hasRecentEvents) {
          parts.push(`✓ Last event: ${result.lastEventAt ? format(new Date(result.lastEventAt), "PPp") : "unknown"}`);
        } else {
          parts.push("○ No webhook events received yet");
        }
        setTestResult(parts.join("\n"));
        toast.success("Connection test complete");
      } else {
        setTestResult(result.error || "Test failed");
        toast.error("Connection test failed");
      }
    } catch (err: any) {
      setTestResult(err.message);
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(repo.id);
    setDeleting(false);
  };

  return (
    <div
      className="glass-card rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-colors animate-fade-in"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{repo.full_name}</span>
        </div>
        <RepoStatusBadge status={status} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSetupWebhook(repo); }}>
          <Settings className="mr-1.5 h-3.5 w-3.5" /> Setup Webhook
        </Button>
        <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
          Test Connection
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {testResult && (
        <pre className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
          {testResult}
        </pre>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">Owner:</span> {repo.owner}</p>
          <p><span className="font-medium text-foreground">Name:</span> {repo.name}</p>
          <p><span className="font-medium text-foreground">Created:</span> {format(new Date(repo.created_at), "PPP")}</p>
          <p><span className="font-medium text-foreground">GitHub ID:</span> {repo.github_repo_id || "Not linked"}</p>
        </div>
      )}
    </div>
  );
}
