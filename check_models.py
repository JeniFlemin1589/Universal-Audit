import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("No API Key found.")
        return

    client = genai.Client(api_key=api_key)
    print("Fetching available models...")
    try:
        # Note: syntax might vary by SDK version, trying standard list
        for m in client.models.list():
            print(f"- {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()
