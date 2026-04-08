
DROP INDEX IF EXISTS idx_pull_requests_github_pr_id;
ALTER TABLE public.pull_requests ADD CONSTRAINT pull_requests_github_pr_id_key UNIQUE (github_pr_id);
