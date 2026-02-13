"""
Detailed Database Diagnostics
"""

from supabase import create_client
import json

SUPABASE_URL = "https://ahmlknnxexsondeeitgz.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobWxrbm54ZXhzb25kZWVpdGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDE2MjQsImV4cCI6MjA4NTQxNzYyNH0.YneOEsdBkMdBxTIGBZ74AWCRFl0IjJlG1suwdpDHmkM"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobWxrbm54ZXhzb25kZWVpdGd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg0MTYyNCwiZXhwIjoyMDg1NDE3NjI0fQ.syynTeIntODq14aia8nyWg8GfYqb5gQeFO0HQ-6vcbU"

print("=" * 70)
print("DETAILED SUPABASE DIAGNOSTICS")
print("=" * 70)

# Test 1: Check if we can connect with service role
print("\n[TEST 1] Connection with SERVICE ROLE key")
print("-" * 70)
try:
    admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✓ Service role client created")
    
    # Try to query profiles
    result = admin.table("profiles").select("id, email, role").limit(5).execute()
    print(f"✓ Profiles query successful - Found {len(result.data)} profiles")
    for profile in result.data:
        print(f"  - {profile.get('email')} ({profile.get('role')})")
except Exception as e:
    print(f"✗ SERVICE ROLE FAILED: {e}")
    error_dict = e.__dict__ if hasattr(e, '__dict__') else {}
    print(f"  Error details: {error_dict}")

# Test 2: Check if we can connect with anon key
print("\n[TEST 2] Connection with ANON key (without auth)")
print("-" * 70)
try:
    anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("✓ Anon client created")
    
    # Try to query profiles (should work if RLS policies allow)
    result = anon.table("profiles").select("id, email, role").limit(5).execute()
    print(f"✓ Profiles query successful - Found {len(result.data)} profiles")
except Exception as e:
    print(f"✗ ANON KEY FAILED (expected if RLS is enabled): {e}")

# Test 3: Check medicine_categories (should be publicly readable)
print("\n[TEST 3] Check medicine_categories table")
print("-" * 70)
try:
    result = admin.table("medicine_categories").select("*").limit(3).execute()
    print(f"✓ Found {len(result.data)} categories")
    for cat in result.data:
        print(f"  - {cat.get('name')}")
except Exception as e:
    print(f"✗ FAILED: {e}")

# Test 4: Check stores table
print("\n[TEST 4] Check stores table")
print("-" * 70)
try:
    result = admin.table("stores").select("id, store_name, city").limit(5).execute()
    print(f"✓ Found {len(result.data)} stores")
    for store in result.data:
        print(f"  - {store.get('store_name')} in {store.get('city')}")
except Exception as e:
    print(f"✗ FAILED: {e}")

# Test 5: Check medicines table
print("\n[TEST 5] Check medicines table")
print("-" * 70)
try:
    result = admin.table("medicines").select("id, name, price").limit(5).execute()
    print(f"✓ Found {len(result.data)} medicines")
    for med in result.data:
        print(f"  - {med.get('name')} - ₹{med.get('price')}")
except Exception as e:
    print(f"✗ FAILED: {e}")

# Test 6: Test auth signup
print("\n[TEST 6] Test Auth Signup (will create test user)")
print("-" * 70)
test_email = f"test_{hash('test')%10000}@example.com"
test_password = "Test123456!"

try:
    auth_response = admin.auth.sign_up({
        "email": test_email,
        "password": test_password,
        "options": {
            "data": {
                "full_name": "Test User",
                "role": "customer"
            }
        }
    })
    
    if hasattr(auth_response, 'user') and auth_response.user:
        print(f"✓ User created: {auth_response.user.email}")
        user_id = auth_response.user.id
        
        # Check if profile was auto-created by trigger
        import time
        time.sleep(2)  # Wait for trigger
        profile_result = admin.table("profiles").select("*").eq("id", user_id).execute()
        
        if profile_result.data and len(profile_result.data) > 0:
            print(f"✓ Profile auto-created by trigger!")
            print(f"  - Full name: {profile_result.data[0].get('full_name')}")
            print(f"  - Role: {profile_result.data[0].get('role')}")
        else:
            print("✗ Profile NOT auto-created - TRIGGER IS MISSING!")
            print("  You need to create the handle_new_user() trigger in Supabase")
    else:
        print(f"✗ Signup failed - no user returned")
        print(f"  Response: {auth_response}")
except Exception as e:
    print(f"✗ Auth signup failed: {e}")

print("\n" + "=" * 70)
print("DIAGNOSIS COMPLETE")
print("=" * 70)

print("\nISSUES FOUND:")
print("1. If TEST 1 failed: Your service role key is incorrect")
print("2. If TEST 6 shows 'Profile NOT auto-created': Missing database trigger")
print("3. If any table query fails: Tables don't exist or wrong schema")

print("\nFIXES:")
print("1. Make sure you ran the COMPLETE supabase_tables.sql in SQL Editor")
print("2. The SQL file includes triggers - make sure they were created")
print("3. Verify your service role key in Supabase dashboard > Settings > API")
