import os
import json
import sys
from dotenv import load_dotenv

# Try to load .env from parent directory (frontend/)
# assuming we run this from frontend/backend/ or frontend/
import site
import sys
print(f"sys.path: {sys.path}")
print(f"site.getusersitepackages(): {site.getusersitepackages()}")

# Helper to find .env
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
dotenv_path = os.path.join(parent_dir, '.env')

print(f"Looking for .env at: {dotenv_path}")
loaded = load_dotenv(dotenv_path)
print(f"load_dotenv returned: {loaded}")

def check_env():
    print("-" * 20)
    print("Checking Environment Variables...")
    
    # 1. Firebase
    fb_creds = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if fb_creds:
        print("[OK] FIREBASE_SERVICE_ACCOUNT is set.")
        try:
            creds_json = json.loads(fb_creds)
            print(f"   - Project ID: {creds_json.get('project_id')}")
            print("   - JSON parsing successful.")
            
            # Try init
            import firebase_admin
            from firebase_admin import credentials
            if not firebase_admin._apps:
                cred = credentials.Certificate(creds_json)
                firebase_admin.initialize_app(cred)
                print("[OK] Firebase Admin initialized successfully.")
            else:
                print("[OK] Firebase Admin already initialized.")
                
        except Exception as e:
            print(f"[FAIL] Firebase config invalid: {e}")
    else:
        print("[FAIL] FIREBASE_SERVICE_ACCOUNT is NOT set.")

    # 2. Google API Key
    api_key = os.environ.get("GOOGLE_API_KEY")
    if api_key:
        print("[OK] GOOGLE_API_KEY is set.")
        # Minimal check?
        print(f"   - Key length: {len(api_key)}")
    else:
        print("[FAIL] GOOGLE_API_KEY is NOT set.")

    # 3. Supabase
    su_url = os.environ.get("SUPABASE_URL")
    su_key = os.environ.get("SUPABASE_KEY")
    if su_url and su_key:
        print(f"[OK] Supabase Configured: {su_url}")
    else:
        print("[FAIL] Supabase URL or KEY missing.")

if __name__ == "__main__":
    check_env()
