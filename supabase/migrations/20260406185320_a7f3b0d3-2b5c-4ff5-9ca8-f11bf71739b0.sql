
-- Helper: check if user owns the repository
CREATE OR REPLACE FUNCTION public.owns_repository(_user_id UUID, _repo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repositories WHERE id = _repo_id AND user_id = _user_id
  )
$$;

-- Pull Requests: tighten insert/update
DROP POLICY "Authenticated users can insert PRs" ON public.pull_requests;
DROP POLICY "Authenticated users can update PRs" ON public.pull_requests;

CREATE POLICY "Repo owners can insert PRs"
  ON public.pull_requests FOR INSERT TO authenticated
  WITH CHECK (public.owns_repository(auth.uid(), repository_id));

CREATE POLICY "Repo owners can update PRs"
  ON public.pull_requests FOR UPDATE TO authenticated
  USING (public.owns_repository(auth.uid(), repository_id));

-- Pull Request Reviews: tighten insert
DROP POLICY "Authenticated users can insert reviews" ON public.pull_request_reviews;

CREATE POLICY "Repo owners can insert reviews"
  ON public.pull_request_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pull_requests pr
      WHERE pr.id = pull_request_id
      AND public.owns_repository(auth.uid(), pr.repository_id)
    )
  );

-- Commits: tighten insert
DROP POLICY "Authenticated users can insert commits" ON public.commits;

CREATE POLICY "Repo owners can insert commits"
  ON public.commits FOR INSERT TO authenticated
  WITH CHECK (public.owns_repository(auth.uid(), repository_id));

-- Deployments: tighten insert
DROP POLICY "Authenticated users can insert deployments" ON public.deployments;

CREATE POLICY "Repo owners can insert deployments"
  ON public.deployments FOR INSERT TO authenticated
  WITH CHECK (public.owns_repository(auth.uid(), repository_id));

-- Webhook Events: tighten insert
DROP POLICY "Authenticated users can insert webhook events" ON public.webhook_events;

CREATE POLICY "Repo owners can insert webhook events"
  ON public.webhook_events FOR INSERT TO authenticated
  WITH CHECK (
    repository_id IS NULL OR public.owns_repository(auth.uid(), repository_id)
  );

-- Metric Snapshots: tighten insert
DROP POLICY "Authenticated users can insert metric snapshots" ON public.metric_snapshots;

CREATE POLICY "Repo owners can insert metric snapshots"
  ON public.metric_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.owns_repository(auth.uid(), repository_id));
