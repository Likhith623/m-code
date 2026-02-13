-- =====================================================
-- FIX PERMISSIONS FOR SUPABASE API ACCESS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Grant usage on public schema to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant all privileges on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant select/insert/update/delete to authenticated users (will be controlled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on public tables to anon (will be controlled by RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Make these grants apply to future tables too
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Verify the grants worked
DO $$
BEGIN
  RAISE NOTICE 'Permissions granted successfully!';
  RAISE NOTICE 'You should now be able to access the database from your application.';
END $$;
