
DROP POLICY "Service role can update webhook events" ON public.webhook_events;

CREATE POLICY "Repo owners can update webhook events"
ON public.webhook_events
FOR UPDATE
TO authenticated
USING (repository_id IS NOT NULL AND owns_repository(auth.uid(), repository_id))
WITH CHECK (repository_id IS NOT NULL AND owns_repository(auth.uid(), repository_id));
