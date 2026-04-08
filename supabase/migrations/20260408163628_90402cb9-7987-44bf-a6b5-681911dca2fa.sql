
-- Allow service role to update webhook events status
CREATE POLICY "Service role can update webhook events"
ON public.webhook_events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add unique constraint on github_pr_id for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_requests_github_pr_id
ON public.pull_requests (github_pr_id)
WHERE github_pr_id IS NOT NULL;

-- Add unique constraint on commit sha + repo to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_commits_sha_repo
ON public.commits (sha, repository_id);
