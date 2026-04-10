
-- Add webhook provisioning metadata to repositories
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS github_webhook_id bigint,
  ADD COLUMN IF NOT EXISTS webhook_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS webhook_configured_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_checked_at timestamptz;
