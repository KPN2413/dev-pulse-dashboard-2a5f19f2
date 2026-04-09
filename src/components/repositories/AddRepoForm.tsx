import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { validateGitHubRepo, type RepoRow } from "@/hooks/use-repositories";

interface AddRepoFormProps {
  onAdded: (fields: {
    owner: string;
    name: string;
    full_name: string;
    github_repo_id?: string;
  }) => Promise<RepoRow | null>;
  onCancel: () => void;
}

type FormState = "idle" | "validating" | "valid" | "invalid" | "saving";

export function AddRepoForm({ onAdded, onCancel }: AddRepoFormProps) {
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [validatedRepo, setValidatedRepo] = useState<{
    full_name: string;
    owner: string;
    name: string;
    github_repo_id: string;
    private: boolean;
  } | null>(null);

  const handleValidate = async () => {
    if (!owner.trim() || !name.trim()) {
      setErrorMsg("Owner and repository name are required");
      setState("invalid");
      return;
    }
    setState("validating");
    setErrorMsg("");
    try {
      const result = await validateGitHubRepo(owner.trim(), name.trim(), token.trim() || undefined);
      if (result.valid && result.repo) {
        setValidatedRepo(result.repo);
        setState("valid");
      } else {
        setErrorMsg(result.error || "Repository not found");
        setState("invalid");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Validation failed");
      setState("invalid");
    }
  };

  const handleSubmit = async () => {
    if (!validatedRepo) return;
    setState("saving");
    const repo = await onAdded({
      owner: validatedRepo.owner,
      name: validatedRepo.name,
      full_name: validatedRepo.full_name,
      github_repo_id: validatedRepo.github_repo_id,
    });
    if (!repo) {
      setState("valid");
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in space-y-4">
      <h3 className="text-sm font-semibold">Connect GitHub Repository</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gh-owner">Owner / Organization</Label>
          <Input
            id="gh-owner"
            placeholder="octocat"
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            disabled={state === "validating" || state === "saving"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gh-name">Repository Name</Label>
          <Input
            id="gh-name"
            placeholder="my-project"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            disabled={state === "validating" || state === "saving"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gh-token">Personal Access Token (optional, for private repos)</Label>
        <div className="relative">
          <Input
            id="gh-token"
            type={showToken ? "text" : "password"}
            placeholder="ghp_xxxx..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={state === "validating" || state === "saving"}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Token is used for validation only and is never stored.
        </p>
      </div>

      {state === "invalid" && errorMsg && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {state === "valid" && validatedRepo && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Found <strong>{validatedRepo.full_name}</strong>
            {validatedRepo.private && " (private)"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {state !== "valid" ? (
          <Button onClick={handleValidate} disabled={state === "validating"}>
            {state === "validating" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate Repository
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={state === "saving"}>
            {state === "saving" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Repository
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel} disabled={state === "validating" || state === "saving"}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
