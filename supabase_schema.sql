-- Run this in your Supabase SQL Editor

create table if not exists sessions (
  session_id text primary key,
  reference jsonb default '[]'::jsonb,
  target jsonb default '[]'::jsonb,
  summary text,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
-- Add user_id column (run this manually first if not exists)
-- Changed to TEXT to support Firebase UID (no FK to auth.users)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Enable RLS
alter table sessions enable row level security;

-- Remove insecure public access policy (if it exists)
-- drop policy if exists "Public Access" on sessions;

-- Policy: Allow Service Role (backend admin) full access
-- We need this because the Backend (using Service Role Key) will manage access.
-- The Anon Key (frontend) should NOT have access if we want privacy.
-- So we can drop Public Access and only allow Service Role.
-- create policy "Service Role Full Access" on sessions for all to service_role using (true) with check (true);
