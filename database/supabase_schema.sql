-- ==============================================================================
-- DOCUMENT VERSION MANAGER - Supabase PostgreSQL Schema & Security Policies (RLS)
-- Run this in your Supabase Dashboard SQL Editor
-- ==============================================================================

-- 1. Create profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'SCM User',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  status TEXT NOT NULL DEFAULT 'Active',
  enrolled_course TEXT DEFAULT 'Software Configuration Management (CS804)',
  college TEXT DEFAULT 'Faculty of Computer Engineering',
  roll_no TEXT DEFAULT 'SCM-2026-088',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for phone queries
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  current_version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'Active',
  size TEXT NOT NULL DEFAULT '1.5 MB',
  total_versions INTEGER NOT NULL DEFAULT 1,
  last_updated TEXT NOT NULL DEFAULT 'Just now',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- 3. Create document_versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
  id BIGSERIAL PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  author TEXT NOT NULL,
  size TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON public.document_versions(document_id);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  icon TEXT NOT NULL DEFAULT 'fa-bell',
  icon_color TEXT NOT NULL DEFAULT 'text-primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 5. Create activities audit table
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  document TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access and modify their own records
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Documents: Users can only view, insert, update, delete their own documents
CREATE POLICY "Users can manage own documents" 
  ON public.documents FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Document Versions: Users can only manage versions of documents they own
CREATE POLICY "Users can manage own document versions" 
  ON public.document_versions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = document_versions.document_id 
        AND documents.user_id = auth.uid()
    )
  );

-- Notifications: Users can manage their own notifications
CREATE POLICY "Users can manage own notifications" 
  ON public.notifications FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Activities: Users can view and log their own activities
CREATE POLICY "Users can manage own activities" 
  ON public.activities FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Automatic Profile Creation Trigger on Supabase Auth Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, full_name, email)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.phone, ''), ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'SCM User'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Keep profiles.updated_at current on every UPDATE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- Allow users to update only their own display fields (defense in depth).
-- id, phone_number and role are managed by the server / trigger.
-- ==============================================================================
REVOKE UPDATE (id, phone_number, role) ON public.profiles FROM authenticated;
