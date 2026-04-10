
CREATE TABLE public.github_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  token_encrypted text NOT NULL,
  token_last_four text NOT NULL,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.github_credentials ENABLE ROW LEVEL SECURITY;

-- No client-side access at all. Edge functions use service role key.
-- This ensures tokens are never exposed to the browser.

CREATE TRIGGER update_github_credentials_updated_at
  BEFORE UPDATE ON public.github_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
