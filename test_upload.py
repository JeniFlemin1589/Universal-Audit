import os
import logging
from dotenv import load_dotenv
from google import genai

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_upload():
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            print("ERROR: GOOGLE_API_KEY not found.")
            return

        print(f"Initializing Client with Key: {api_key[:5]}...")
        client = genai.Client(api_key=api_key)

        # Create a dummy file
        with open("test_upload.txt", "w") as f:
            f.write("This is a test file for the Universal Audit Platform.")
        
        print("Uploading test_upload.txt...")
        file_ref = client.files.upload(file="test_upload.txt")
        print(f"SUCCESS! File URI: {file_ref.uri}")
        print(f"File Name: {file_ref.name}")

    except Exception as e:
        print("\n!!! UPLOAD FAILED !!!")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_upload()
