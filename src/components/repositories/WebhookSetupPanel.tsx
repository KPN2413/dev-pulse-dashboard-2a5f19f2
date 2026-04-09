import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { RepoRow } from "@/hooks/use-repositories";

const WEBHOOK_EVENTS = ["pull_request", "pull_request_review", "push", "deployment_status"];

interface WebhookSetupPanelProps {
  repo: RepoRow;
  onClose: () => void;
}

export function WebhookSetupPanel({ repo, onClose }: WebhookSetupPanelProps) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/github-webhook`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Webhook Setup — <span className="text-primary">{repo.full_name}</span>
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Go to your repository&apos;s <strong>Settings → Webhooks → Add webhook</strong> on GitHub and configure the following:
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Payload URL</Label>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(webhookUrl, "URL")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Content type</Label>
          <Input value="application/json" readOnly className="font-mono text-xs max-w-xs" />
        </div>

        <div className="space-y-1.5">
          <Label>Events to enable</Label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <code
                key={evt}
                className="rounded-md bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground"
              >
                {evt}
              </code>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Secret</Label>
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Use the same secret you configured as{" "}
            <code className="text-xs bg-background px-1.5 py-0.5 rounded">GITHUB_WEBHOOK_SECRET</code>{" "}
            in your backend settings. Never share or expose this value.
          </div>
        </div>
      </div>

      <a
        href={`https://github.com/${repo.full_name}/settings/hooks/new`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Open GitHub Webhook Settings <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
