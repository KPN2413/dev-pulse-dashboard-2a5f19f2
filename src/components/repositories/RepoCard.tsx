import React, { useState } from "react";
import { GitBranch, Settings, Zap, Loader2, Trash2, RefreshCw, Clock, Webhook, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { RepoStatusBadge } from "./RepoStatusBadge";
import { getRepoStatus, testRepoConnection, type RepoRow } from "@/hooks/use-repositories";
import type { SyncStatus } from "@/hooks/use-repo-sync";
import type { WebhookProvisionStatus } from "@/hooks/use-webhook-provision";

interface RepoCardProps {
  repo: RepoRow;
  onSetupWebhook: (repo: RepoRow) => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, fields: Partial<RepoRow>) => Promise<boolean>;
  syncStatus: SyncStatus;
  onSync: (repoId: string) => void;
  webhookProvisionStatus: WebhookProvisionStatus;
  onProvisionWebhook: (repoId: string) => void;
  onVerifyWebhook: (repoId: string) => void;
}

export function RepoCard({
  repo,
  onSetupWebhook,
  onDelete,
  onUpdate,
  syncStatus,
  onSync,
  webhookProvisionStatus,
  onProvisionWebhook,
  onVerifyWebhook,
}: RepoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const status = getRepoStatus(repo);
  const isSyncing = syncStatus.state === "syncing";
  const isProvisioning = webhookProvisionStatus.state === "provisioning";
  const isVerifying = webhookProvisionStatus.state === "verifying";

  const webhookStatus = (repo as any).webhook_status as string | undefined;
  const hasWebhook = webhookStatus === "active";
  const isMisconfigured = webhookStatus === "misconfigured" || webhookStatus === "failed";

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testRepoConnection(repo.id);
      if (result.ok) {
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

  const handleSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSync(repo.id);
  };

  const handleProvision = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProvisionWebhook(repo.id);
  };

  const handleVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVerifyWebhook(repo.id);
  };

  const lastSynced = syncStatus.lastSyncedAt || (repo as any).last_synced_at;

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
        <div className="flex items-center gap-2">
          {syncStatus.state === "syncing" && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
            </span>
          )}
          {syncStatus.state === "success" && (
            <span className="inline-flex items-center gap-1 text-xs text-primary">✓ Synced</span>
          )}
          {syncStatus.state === "failed" && (
            <span className="inline-flex items-center gap-1 text-xs text-destructive">✗ Failed</span>
          )}
          <WebhookStatusBadge status={webhookStatus} />
          <RepoStatusBadge status={status} />
        </div>
      </div>

      {lastSynced && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Clock className="h-3 w-3" />
          Last synced: {format(new Date(lastSynced), "PPp")}
        </div>
      )}

      {syncStatus.state === "failed" && syncStatus.error && (
        <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          {syncStatus.error}
        </div>
      )}

      {syncStatus.state === "success" && syncStatus.stats && (
        <div className="mb-3 rounded-lg bg-primary/5 p-2 text-xs text-muted-foreground">
          Imported: {syncStatus.stats.prs} PRs · {syncStatus.stats.reviews} reviews · {syncStatus.stats.commits} commits · {syncStatus.stats.deployments} deployments
        </div>
      )}

      {/* Webhook provision feedback */}
      {webhookProvisionStatus.state === "failed" && webhookProvisionStatus.error && (
        <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{webhookProvisionStatus.error}</span>
        </div>
      )}

      {webhookProvisionStatus.state === "success" && webhookProvisionStatus.result && (
        <div className="mb-3 rounded-lg bg-primary/5 p-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          Webhook {(webhookProvisionStatus.result as any).action || "configured"} successfully
        </div>
      )}

      {/* Verify results */}
      {webhookProvisionStatus.result?.issues && (webhookProvisionStatus.result.issues as string[]).length > 0 && (
        <div className="mb-3 rounded-lg bg-yellow-500/10 p-2 text-xs text-yellow-600 dark:text-yellow-400">
          <p className="font-medium mb-1">Webhook issues found:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {(webhookProvisionStatus.result.issues as string[]).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
          Sync Now
        </Button>

        {/* Automatic webhook provisioning */}
        {!hasWebhook && (
          <Button variant="outline" size="sm" onClick={handleProvision} disabled={isProvisioning}>
            {isProvisioning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Webhook className="mr-1.5 h-3.5 w-3.5" />}
            Set Up Webhook
          </Button>
        )}
        {isMisconfigured && (
          <Button variant="outline" size="sm" onClick={handleProvision} disabled={isProvisioning}>
            {isProvisioning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Webhook className="mr-1.5 h-3.5 w-3.5" />}
            Repair Webhook
          </Button>
        )}
        {hasWebhook && (
          <Button variant="outline" size="sm" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
            Verify Webhook
          </Button>
        )}

        {/* Manual fallback */}
        {webhookProvisionStatus.fallback && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSetupWebhook(repo); }}>
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Manual Setup
          </Button>
        )}
        {!webhookProvisionStatus.fallback && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSetupWebhook(repo); }}>
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Manual Setup
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
          Test
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
          {webhookStatus && (
            <p><span className="font-medium text-foreground">Webhook Status:</span> {webhookStatus.replace(/_/g, " ")}</p>
          )}
          {(repo as any).webhook_configured_at && (
            <p><span className="font-medium text-foreground">Webhook Configured:</span> {format(new Date((repo as any).webhook_configured_at), "PPp")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function WebhookStatusBadge({ status }: { status?: string }) {
  if (!status || status === "not_configured") return null;

  const config: Record<string, { label: string; className: string }> = {
    configuring: { label: "Configuring…", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    active: { label: "Webhook Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    misconfigured: { label: "Misconfigured", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    failed: { label: "Webhook Failed", className: "bg-destructive/10 text-destructive" },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
