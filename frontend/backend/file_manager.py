import os
import shutil
import logging
from typing import List, Optional
import google.genai.files
from google import genai
from supabase import create_client, Client
from backend.models import UploadedFile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileManager:
    def __init__(self):
        # Initialize Gemini
        self.api_key = os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not found. File operations will verify.")
        
        try:
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Client: {e}")
            self.client = None

        # Initialize Supabase
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_KEY")
        self.db: Optional[Client] = None

        if self.supabase_url and self.supabase_key:
            try:
                self.db = create_client(self.supabase_url, self.supabase_key)
                logger.info("Supabase initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase: {e}")
        else:
            logger.warning("SUPABASE_URL or SUPABASE_KEY not found. Database operations will fail.")

    def get_session_details(self, session_id: str, user_id: str = None, db_client: Client = None):
        """Returns full session details from Supabase using the provided client or default."""
        client = db_client or self.db
        if not client:
            return {"reference": [], "target": [], "summary": None, "history": []}
        
        try:
            query = client.table("sessions").select("*").eq("session_id", session_id)
            if user_id:
                query = query.eq("user_id", user_id)
            response = query.execute()
            
            if response.data and len(response.data) > 0:
                data = response.data[0]
                
                def parse_files(file_list):
                    valid_files = []
                    if not file_list:
                        return valid_files
                    
                    # Check if file_list is a list of dicts or strings (if legacy data)
                    if isinstance(file_list, str):
                        import json
                        try:
                            file_list = json.loads(file_list)
                        except:
                            return []

                    for f in file_list:
                        try:
                            # Handle potential missing fields by checking dict keys against model
                            valid_files.append(UploadedFile(**f))
                        except Exception as parse_err:
                            logger.error(f"Failed to parse file record in session {session_id}: {f}, Error: {parse_err}")
                    return valid_files

                return {
                    "reference": parse_files(data.get("reference", [])),
                    "target": parse_files(data.get("target", [])),
                    "summary": data.get("summary"),
                    "history": data.get("history", [])
                }
        except Exception as e:
            logger.error(f"Failed to load session {session_id} from Supabase: {e}")
            
        return {"reference": [], "target": [], "summary": None, "history": []}

    def get_session_files(self, session_id: str, file_type: str = "reference", user_id: str = None, db_client: Client = None):
        """Retrieve files for a specific session from Supabase."""
        details = self.get_session_details(session_id, user_id, db_client)
        return details.get(file_type, [])

    def _save_session_to_db(self, session_id: str, data: dict, user_id: str = None, db_client: Client = None):
        """Internal helper to save data to Supabase (Upsert)."""
        client = db_client or self.db
        if not client:
            return
        
        try:
            # Check existence first to decide INSERT vs UPDATE if needed, 
            # OR rely on upsert if we provide all columns.
            # But we often provide partial updates (e.g. only summary).
            # Supabase upsert usually replaces row unless on_conflict handles it?
            # Actually, `table.upsert` behaves as INSERT ON CONFLICT DO UPDATE.
            # BUT if we omit columns, they might get set to DEFAULT (or null).
            # So partial update via `update` is better if record exists.
            
            
            check = client.table("sessions").select("session_id").eq("session_id", session_id).execute()
            exists = len(check.data) > 0
            
            if exists:
                query = client.table("sessions").update(data).eq("session_id", session_id)
                if user_id:
                    # Ensure we only update if user owns it? Or trust the caller?
                    # Generally good to enforce.
                    query = query.eq("user_id", user_id)
                query.execute()
            else:
                # For insert, we need session_id in payload
                payload = {"session_id": session_id, **data}
                if user_id:
                    payload["user_id"] = user_id
                client.table("sessions").insert(payload).execute()

            logger.info(f"Session {session_id} saved to Supabase.")
        except Exception as e:
            logger.error(f"Failed to save session {session_id} to Supabase: {e}")
            raise e

    def add_file_to_session(self, session_id: str, file_obj: UploadedFile, file_type: str, user_id: str = None, db_client: Client = None):
        """Add a file to a session's list in Supabase."""
        details = self.get_session_details(session_id, user_id, db_client)
        
        # Avoid duplicates in session (by URI)
        existing = [f for f in details[file_type] if f.uri == file_obj.uri]
        if not existing:
            details[file_type].append(file_obj)
            
            # Save the updated list.
            db_data = {
                file_type: [f.model_dump() for f in details[file_type]]
            }
            self._save_session_to_db(session_id, db_data, user_id, db_client)

    def update_session_summary(self, session_id: str, summary: str, user_id: str = None, db_client: Client = None):
        """Update the summary field for a session."""
        self._save_session_to_db(session_id, {"summary": summary}, user_id, db_client)

    def get_cached_file(self, file_path: str):
        """Check if file exists in Gemini (via internal cache logic if needed)."""
        # For now, we don't cache locally. We rely on Gemini URIs.
        return None

    def upload_file(self, file: UploadedFile, mime_type: str = None) -> UploadedFile:
        """Uploads file to Gemini and returns the updated file object."""
        # Check if we have a client. If not, return error or mock?
        if not self.client:
           logger.error("Gemini Client not initialized. Cannot upload.")
           file.status = "error"
           file.error_message = "Gemini Client not initialized"
           return file
            
        try:
            # Upload to Gemini
            if not os.path.exists(file.local_path):
                raise FileNotFoundError(f"File not found: {file.local_path}")

            import mimetypes
            if not mime_type:
                mime_type, _ = mimetypes.guess_type(file.local_path)
            
            # If still None, default to octet-stream
            if not mime_type:
                mime_type = "application/octet-stream"

            logger.info(f"Uploading {file.name} to Gemini... Mime: {mime_type}")
            gemini_file = self.client.files.upload(
                file=file.local_path,
                config={'mime_type': mime_type}
            )
            
            logger.info(f"Uploaded to Gemini: {gemini_file.uri}")
            
            file.uri = gemini_file.uri
            file.status = "uploaded"
            return file
            
        except Exception as e:
            logger.error(f"Gemini upload failed: {e}")
            file.status = "error"
            file.error_message = str(e)
            return file

    def register_pending_file(self, file_path: str, display_name: str, session_id: str, file_type: str = "reference", user_id: str = None, db_client: Client = None) -> UploadedFile:
        """Register a file as pending upload in the DB."""
        # Use display_name as name initially or generate unique?
        # status="pending"
        import uuid
        file_obj = UploadedFile(
             name=display_name, # or generate unique?
             uri="",
             type=file_type, # "reference" or "target"
             status="pending",
             local_path=file_path
        )
        self.add_file_to_session(session_id, file_obj, file_type, user_id, db_client)
        return file_obj

    def perform_background_upload(self, file_obj: UploadedFile, session_id: str, file_type: str, user_id: str = None, db_client: Client = None):
        """Uploads the file and updates DB, deleting local temp file after."""
        try:
            self.upload_file(file_obj) # Updates file_obj in place
            
            # Update DB with new status/URI
            self.update_file_status(session_id, file_obj, file_type, user_id, db_client)
            
            # Cleanup temp file? 
            # If we delete it, and file_obj.local_path is still pointing to it, subsequent reads might fail if they try local read.
            # But Gemini usage relies on URI.
            # So safe to delete?
            # upload_file uploads to Gemini.
            pass
        except Exception as e:
            logger.error(f"Background upload for {file_obj.name} failed: {e}")
            file_obj.status = "error"
            file_obj.error_message = str(e)
            try:
                self.update_file_status(session_id, file_obj, file_type, user_id, db_client)
            except:
                pass

    def update_file_status(self, session_id: str, file_obj: UploadedFile, file_type: str, user_id: str = None, db_client: Client = None):
        """Updates a specific file's status in the session list."""
        details = self.get_session_details(session_id, user_id, db_client)
        files = details.get(file_type, [])
        
        # Find and replace
        updated_files = []
        found = False
        for f in files:
            # Identify by local_path? name?
            # Name in UploadedFile is display name initially.
            if f.local_path == file_obj.local_path: # Best proxy for identity if unique per upload request
                updated_files.append(file_obj)
                found = True
            else:
                updated_files.append(f)
        
        if found:
            # Update DB
            db_data = {
                file_type: [f.model_dump() for f in updated_files]
            }
            self._save_session_to_db(session_id, db_data, user_id, db_client)

    def delete_session_files(self, session_id: str):
        """Cleanup files for a session (Optional)."""
        pass
