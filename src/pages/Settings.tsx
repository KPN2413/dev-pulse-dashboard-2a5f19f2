import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Info } from "lucide-react";
import { GitHubCredentials } from "@/components/settings/GitHubCredentials";

const webhookEvents = ["pull_request", "pull_request_review", "push", "deployment_status"];

export default function SettingsPage() {
  const { user } = useAuth();
  const webhookUrl = "https://your-api.example.com/api/webhooks/github";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and app configuration</p>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input defaultValue={user?.name || ""} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={user?.email || ""} type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input defaultValue={user?.role || ""} disabled />
            </div>
            <Button>Save Changes</Button>
          </div>
        </div>

        <GitHubCredentials />

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold mb-4">GitHub Webhook Configuration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure a GitHub webhook to receive real-time events from your repositories.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Endpoint</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Required Events</Label>
              <div className="flex flex-wrap gap-2">
                {webhookEvents.map(event => (
                  <code key={event} className="rounded-md bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground">{event}</code>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p>Set a webhook secret in your GitHub repository settings and configure it as the <code className="text-xs bg-background px-1.5 py-0.5 rounded">GITHUB_WEBHOOK_SECRET</code> environment variable on your backend.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Webhook Setup Guide</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>To receive real-time GitHub events, configure a webhook on each repository pointing to your DevPulse webhook endpoint above.</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your GitHub repository - Settings - Webhooks</li>
                  <li>Set the Payload URL to your webhook endpoint</li>
                  <li>Set Content type to <code className="text-xs bg-background px-1.5 py-0.5 rounded">application/json</code></li>
                  <li>Add your webhook secret and select the required events above</li>
                </ol>
                <a href="https://docs.github.com/en/webhooks" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  GitHub Webhook Docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}