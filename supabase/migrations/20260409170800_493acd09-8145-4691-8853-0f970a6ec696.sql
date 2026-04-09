
-- pull_requests already has a unique index on github_pr_id from prior migration; add if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_requests_github_pr_id ON public.pull_requests (github_pr_id) WHERE github_pr_id IS NOT NULL;

-- commits: unique on sha + repository_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_commits_sha_repo ON public.commits (sha, repository_id);

-- metric_snapshots: unique on repository_id + date for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_snapshots_repo_date ON public.metric_snapshots (repository_id, date);
