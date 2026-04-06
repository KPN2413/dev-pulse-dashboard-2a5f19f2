
-- Create enums
CREATE TYPE public.pr_state AS ENUM ('open', 'merged', 'closed');
CREATE TYPE public.review_state AS ENUM ('approved', 'changes_requested', 'commented', 'pending');
CREATE TYPE public.deployment_status AS ENUM ('success', 'failure', 'pending', 'in_progress');
CREATE TYPE public.webhook_event_status AS ENUM ('received', 'processed', 'failed');

-- Repositories
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  github_repo_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, full_name)
);

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all repos"
  ON public.repositories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own repos"
  ON public.repositories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own repos"
  ON public.repositories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own repos"
  ON public.repositories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Pull Requests
CREATE TABLE public.pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  github_pr_id TEXT,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state public.pr_state NOT NULL DEFAULT 'open',
  created_at_github TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cycle_time_minutes INTEGER,
  review_turnaround_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all PRs"
  ON public.pull_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert PRs"
  ON public.pull_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update PRs"
  ON public.pull_requests FOR UPDATE TO authenticated USING (true);

-- Pull Request Reviews
CREATE TABLE public.pull_request_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  state public.review_state NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pull_request_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all reviews"
  ON public.pull_request_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert reviews"
  ON public.pull_request_reviews FOR INSERT TO authenticated WITH CHECK (true);

-- Commits
CREATE TABLE public.commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sha TEXT NOT NULL,
  message TEXT,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(repository_id, sha)
);

ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all commits"
  ON public.commits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert commits"
  ON public.commits FOR INSERT TO authenticated WITH CHECK (true);

-- Deployments
CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'production',
  status public.deployment_status NOT NULL DEFAULT 'pending',
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all deployments"
  ON public.deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deployments"
  ON public.deployments FOR INSERT TO authenticated WITH CHECK (true);

-- Webhook Events
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
  delivery_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.webhook_event_status NOT NULL DEFAULT 'received',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert webhook events"
  ON public.webhook_events FOR INSERT TO authenticated WITH CHECK (true);

-- Metric Snapshots
CREATE TABLE public.metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_prs INTEGER NOT NULL DEFAULT 0,
  avg_cycle_time_hours NUMERIC(10,2) DEFAULT 0,
  avg_review_turnaround_hours NUMERIC(10,2) DEFAULT 0,
  commit_count INTEGER NOT NULL DEFAULT 0,
  deployment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(repository_id, date)
);

ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view metric snapshots"
  ON public.metric_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert metric snapshots"
  ON public.metric_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_pull_requests_repo ON public.pull_requests(repository_id);
CREATE INDEX idx_pull_requests_author ON public.pull_requests(author_id);
CREATE INDEX idx_pull_requests_state ON public.pull_requests(state);
CREATE INDEX idx_commits_repo ON public.commits(repository_id);
CREATE INDEX idx_commits_author ON public.commits(author_id);
CREATE INDEX idx_commits_committed_at ON public.commits(committed_at);
CREATE INDEX idx_deployments_repo ON public.deployments(repository_id);
CREATE INDEX idx_deployments_status ON public.deployments(status);
CREATE INDEX idx_metric_snapshots_repo_date ON public.metric_snapshots(repository_id, date);
CREATE INDEX idx_webhook_events_repo ON public.webhook_events(repository_id);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_repositories_user ON public.repositories(user_id);

-- Updated_at triggers
CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pull_requests_updated_at
  BEFORE UPDATE ON public.pull_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
