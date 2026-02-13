"""
Database Connection Test Script
Run this to verify your Supabase connection and table setup
"""

from supabase import create_client
import os

# Your Supabase credentials
SUPABASE_URL = "https://ahmlknnxexsondeeitgz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobWxrbm54ZXhzb25kZWVpdGd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg0MTYyNCwiZXhwIjoyMDg1NDE3NjI0fQ.syynTeIntODq14aia8nyWg8GfYqb5gQeFO0HQ-6vcbU"

print("=" * 50)
print("SUPABASE DATABASE CONNECTION TEST")
print("=" * 50)

try:
    # Create client with service role key (bypasses RLS)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✓ Supabase client created successfully")
except Exception as e:
    print(f"✗ Failed to create Supabase client: {e}")
    exit(1)

# Test each table
tables = [
    "profiles",
    "stores", 
    "medicines",
    "medicine_categories",
    "search_history",
    "favorites",
    "reviews",
    "notifications",
    "medicine_alerts"
]

print("\nChecking tables:")
print("-" * 50)

all_ok = True
for table in tables:
    try:
        result = supabase.table(table).select("*").limit(1).execute()
        count = len(result.data)
        print(f"✓ {table:25} - OK (has {count} row(s))")
    except Exception as e:
        error_msg = str(e)
        if "42P01" in error_msg:
            print(f"✗ {table:25} - TABLE DOES NOT EXIST!")
        elif "42501" in error_msg:
            print(f"✗ {table:25} - PERMISSION DENIED (schema not set up)")
        else:
            print(f"✗ {table:25} - Error: {error_msg[:50]}")
        all_ok = False

print("-" * 50)

if all_ok:
    print("\n✓ ALL TABLES ARE READY!")
    print("Your database is properly configured.")
else:
    print("\n✗ TABLES ARE MISSING!")
    print("\nTo fix this:")
    print("1. Go to: https://supabase.com/dashboard/project/ahmlknnxexsondeeitgz")
    print("2. Click 'SQL Editor' in the left sidebar")
    print("3. Copy the content from 'database/supabase_tables.sql'")
    print("4. Paste it in the SQL Editor and click 'Run'")
    print("\nAfter running the SQL, run this test again to verify.")
