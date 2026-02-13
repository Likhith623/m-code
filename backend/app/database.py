from supabase import create_client, Client
from app.config import settings

# Create Supabase client with anon key for regular operations
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key
)

# Create admin client with service role key for privileged operations
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)


def get_supabase() -> Client:
    """Get Supabase client for dependency injection"""
    return supabase


def get_supabase_admin() -> Client:
    """Get Supabase admin client for privileged operations"""
    return supabase_admin
