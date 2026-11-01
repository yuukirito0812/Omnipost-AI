-- OmniPost AI isolated tables in the EXISTING EstateFlow Supabase project.
-- Non-destructive to EstateFlow/PesoBase. No changes to existing workspaces or auth settings.
-- Auth is shared across apps; all OmniPost tables are separately namespaced.
CREATE TABLE IF NOT EXISTS public.omnipost_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','youtube','x')),
  external_id text NOT NULL, name text NOT NULL, handle text NOT NULL DEFAULT '',
  avatar text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, external_id)
);
CREATE TABLE IF NOT EXISTS public.omnipost_social_tokens (
  account_id uuid PRIMARY KEY REFERENCES public.omnipost_social_accounts(id) ON DELETE CASCADE,
  access_ciphertext text NOT NULL, refresh_ciphertext text, expires_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.omnipost_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, verifier text, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.omnipost_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.omnipost_publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.omnipost_posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.omnipost_social_accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued', attempted_at timestamptz,
  published_at timestamptz, external_url text, submitted_id text,
  error text, attempts integer NOT NULL DEFAULT 0,
  UNIQUE(post_id,account_id)
);
CREATE TABLE IF NOT EXISTS public.omnipost_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (char_length(content) <= 8000),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS omnipost_posts_schedule ON public.omnipost_posts(status,scheduled_at);
CREATE INDEX IF NOT EXISTS omnipost_jobs_status ON public.omnipost_publish_jobs(status,post_id);
CREATE INDEX IF NOT EXISTS omnipost_ai_messages_recent ON public.omnipost_ai_messages(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS omnipost_posts_user ON public.omnipost_posts(user_id);
CREATE INDEX IF NOT EXISTS omnipost_jobs_user ON public.omnipost_publish_jobs(user_id);
CREATE INDEX IF NOT EXISTS omnipost_accounts_user ON public.omnipost_social_accounts(user_id);

ALTER TABLE public.omnipost_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnipost_social_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnipost_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnipost_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnipost_publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnipost_ai_messages ENABLE ROW LEVEL SECURITY;

-- Reduce default PUBLIC table grants. Browser only requires SELECT for these 3 tables.
REVOKE ALL ON TABLE public.omnipost_social_accounts, public.omnipost_social_tokens, public.omnipost_oauth_states,
 public.omnipost_posts, public.omnipost_publish_jobs, public.omnipost_ai_messages FROM anon, authenticated;
GRANT SELECT ON public.omnipost_social_accounts, public.omnipost_posts, public.omnipost_publish_jobs TO authenticated;
GRANT ALL ON public.omnipost_social_accounts, public.omnipost_social_tokens, public.omnipost_oauth_states,
 public.omnipost_posts, public.omnipost_publish_jobs, public.omnipost_ai_messages TO service_role;

-- All writes, AI chats, token storage and OAuth flow are through user-verified server routes.
-- No direct client policies for encrypted credentials, OAuth states, or AI history.
CREATE POLICY "omnipost_select_own_accounts" ON public.omnipost_social_accounts
 FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "omnipost_select_own_posts" ON public.omnipost_posts
 FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "omnipost_select_own_jobs" ON public.omnipost_publish_jobs
 FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- Public media URLs are required by some social networks for server-side ingestion.
-- Do not store personal/private photos in this bucket.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('omnipost-media','omnipost-media',true,52428800,
 ARRAY['image/png','image/jpeg','image/webp','video/mp4','video/quicktime'])
ON CONFLICT(id) DO NOTHING;

CREATE POLICY "omnipost_insert_media" ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK(bucket_id='omnipost-media' AND (storage.foldername(name))[1]=(select auth.uid())::text);
CREATE POLICY "omnipost_select_own_media" ON storage.objects
 FOR SELECT TO authenticated
 USING(bucket_id='omnipost-media' AND (storage.foldername(name))[1]=(select auth.uid())::text);
CREATE POLICY "omnipost_delete_own_media" ON storage.objects
 FOR DELETE TO authenticated
 USING(bucket_id='omnipost-media' AND (storage.foldername(name))[1]=(select auth.uid())::text);
