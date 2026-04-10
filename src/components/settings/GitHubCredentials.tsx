import React, { useState } from "react";
import { useGitHubCredentials, CredentialStatus } from "@/hooks/use-github-credentials";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  Eye, EyeOff, Trash2, RefreshCw, Unplug
} from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ status }: { status: CredentialStatus }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
        </Badge>
      );
    case "invalid_token":
      return (
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
          <XCircle className="mr-1 h-3 w-3" /> Invalid Token
        </Badge>
      );
    case "token_needs_update":
      return (
        <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="mr-1 h-3 w-3" /> Needs Update
        </Badge>
      );
    case "not_connected":
      return (
        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
          <Unplug className="mr-1 h-3 w-3" /> Not Connected
        </Badge>
      );
    default:
      return null;
  }
}

export function GitHubCredentials() {
  const {
    status, tokenLastFour, updatedAt, error,
    saving, testing,
    saveToken, removeToken, testConnection,
  } = useGitHubCredentials();

  const [tokenInput, setTokenInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showTokenField, setShowTokenField] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const isConnected = status === "connected";
  const isInvalid = status === "invalid_token" || status === "token_needs_update";

  const handleSave = async () => {
    if (!tokenInput.trim()) return;
    const result = await saveToken(tokenInput.trim());
    if (result.success) {
      toast.success(`Connected as ${result.githubLogin}`);
      setTokenInput("");
      setShowTokenField(false);
      setTestResult(null);
    } else {
      toast.error(result.error || "Failed to save token");
    }
  };

  const handleRemove = async () => {
    const ok = await removeToken();
    if (ok) {
      toast.success("GitHub token removed");
      setTestResult(null);
    } else {
      toast.error("Failed to remove token");
    }
  };

  const handleTest = async () => {
    const result = await testConnection();
    setTestResult(result);
    if (result.ok) {
      toast.success(`Connected as ${result.githubLogin}`);
    } else {
      toast.error(result.error || "Connection test failed");
    }
  };

  if (status === "loading") {
    return (
      <div className="glass-card rounded-xl p-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading GitHub credentials…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold">GitHub Credentials</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Save a GitHub Personal Access Token to validate private repositories and sync data.
        The token is stored securely and never shown again after saving.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connected state */}
      {isConnected && !showTokenField && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Token ending in ••••{tokenLastFour}</p>
              {updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {testResult && (
            <div className={`rounded-lg p-3 text-sm ${testResult.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
              {testResult.ok ? (
                <div className="space-y-1">
                  <p className="font-medium">✓ Connection successful — {testResult.githubLogin}</p>
                  {testResult.scopes && (
                    <p className="text-xs opacity-80">Scopes: {testResult.scopes || "none"}</p>
                  )}
                  {testResult.rateLimit && (
                    <p className="text-xs opacity-80">
                      Rate limit: {testResult.rateLimit.remaining}/{testResult.rateLimit.limit}
                    </p>
                  )}
                </div>
              ) : (
                <p>{testResult.error}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Test Connection
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowTokenField(true); setTestResult(null); }}>
              Replace Token
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Invalid token state */}
      {isInvalid && !showTokenField && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Your saved token is invalid or expired. Please update it to continue using private repository features.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowTokenField(true)}>
              Update Token
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={saving}>
              <Trash2 className="mr-1 h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      )}

      {/* Not connected / show input */}
      {(status === "not_connected" || showTokenField) && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gh-token">Personal Access Token</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="gh-token"
                  type={showInput ? "text" : "password"}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-sm pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowInput(!showInput)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a token at{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                github.com/settings/tokens
              </a>
              {" "}with <code className="bg-muted px-1 py-0.5 rounded text-xs">repo</code> scope.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !tokenInput.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {isConnected || isInvalid ? "Update Token" : "Save Token"}
            </Button>
            {showTokenField && (
              <Button variant="outline" onClick={() => { setShowTokenField(false); setTokenInput(""); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
