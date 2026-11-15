create table if not exists public.omnipost_community_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_username text not null check (char_length(profile_username) between 1 and 130),
  platform text not null check (platform = any (array['instagram','facebook','tiktok','youtube','linkedin','x','threads','bluesky','google_business','whatsapp']::text[])),
  external_contact_id text not null check (char_length(external_contact_id) between 1 and 300),
  display_name text not null default '' check (char_length(display_name) <= 180),
  handle text not null default '' check (char_length(handle) <= 180),
  avatar_url text,
  status text not null default 'new' check (status = any (array['new','open','waiting','resolved']::text[])),
  priority text not null default 'normal' check (priority = any (array['normal','high','urgent']::text[])),
  notes text not null default '' check (char_length(notes) <= 4000),
  tags text[] not null default '{}'::text[],
  follow_up_at timestamptz,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, profile_username, platform, external_contact_id)
);
create index if not exists omnipost_community_contacts_user_profile_activity_idx
  on public.omnipost_community_contacts (user_id, profile_username, last_interaction_at desc);

create table if not exists public.omnipost_community_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.omnipost_community_contacts(id) on delete cascade,
  profile_username text not null,
  platform text not null check (platform = any (array['instagram','facebook','tiktok','youtube','linkedin','x','threads','bluesky','google_business','whatsapp']::text[])),
  source_type text not null check (source_type = any (array['comment','dm','review','comment_reply','dm_reply','review_reply','note']::text[])),
  external_id text,
  direction text not null check (direction = any (array['inbound','outbound','internal']::text[])),
  body text not null default '' check (char_length(body) <= 5000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 100000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, profile_username, platform, source_type, external_id)
);
create index if not exists omnipost_community_events_contact_activity_idx
  on public.omnipost_community_events (user_id, contact_id, occurred_at desc);
create index if not exists omnipost_community_events_user_profile_activity_idx
  on public.omnipost_community_events (user_id, profile_username, occurred_at desc);

alter table public.omnipost_community_contacts enable row level security;
alter table public.omnipost_community_events enable row level security;
grant select, insert, update, delete on public.omnipost_community_contacts to authenticated;
grant select, insert on public.omnipost_community_events to authenticated;

drop policy if exists omnipost_community_contacts_own on public.omnipost_community_contacts;
create policy omnipost_community_contacts_own on public.omnipost_community_contacts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists omnipost_community_events_select_own on public.omnipost_community_events;
create policy omnipost_community_events_select_own on public.omnipost_community_events
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists omnipost_community_events_insert_own on public.omnipost_community_events;
create policy omnipost_community_events_insert_own on public.omnipost_community_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
