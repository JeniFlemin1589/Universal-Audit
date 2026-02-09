import os
import shutil
import logging
import asyncio
from dotenv import load_dotenv

load_dotenv()

import json
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from backend.file_manager import FileManager
from backend.agents import app_graph
from backend.models import ChatRequest
import tempfile

# Initialize Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize App and FileManager
app = FastAPI(
    title="Universal Audit Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    root_path="/api"
)
file_manager = FileManager()

# CORS config (Allowing Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, verify this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = tempfile.gettempdir()
# No need to makedirs for system temp, it exists.




# Update upload_reference
@app.post("/upload/reference")
def upload_reference(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    session_id: str = Form(...)
):
    try:
        # Save to permanent temp location (files/ directory or similar) to ensure it survives until bg task runs
        # We can use the existing temp pattern but we must NOT delete it here.
        safe_name = f"{session_id}_{file.filename}"
        save_path = os.path.join(TEMP_DIR, safe_name)
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Register Intent
        file_obj = file_manager.register_pending_file(
            file_path=save_path, 
            display_name=file.filename, 
            session_id=session_id, 
            file_type="reference"
        )
        
        # If pending, queue background task
        # If pending, queue background task OR run sync if on Vercel
        if file_obj.status == "pending":
            if os.environ.get("VERCEL"):
                # Vercel kills bg tasks, so run sync
                file_manager.perform_background_upload(file_obj)
            else:
                background_tasks.add_task(file_manager.perform_background_upload, file_obj)
            
        return {"name": file_obj.name, "uri": file_obj.uri, "type": file_obj.type, "status": file_obj.status}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/target")
def upload_target(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    session_id: str = Form(...)
):
    try:
        safe_name = f"{session_id}_{file.filename}"
        save_path = os.path.join(TEMP_DIR, safe_name)
        
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_obj = file_manager.register_pending_file(
            file_path=save_path, 
            display_name=file.filename, 
            session_id=session_id, 
            file_type="target"
        )
        
        if file_obj.status == "pending":
            if os.environ.get("VERCEL"):
                file_manager.perform_background_upload(file_obj)
            else:
                background_tasks.add_task(file_manager.perform_background_upload, file_obj)
            
        return {"name": file_obj.name, "uri": file_obj.uri, "type": file_obj.type, "status": file_obj.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files():
    """List all files uploaded to Gemini."""
    try:
        files = file_manager.list_files()
        return [{"name": f.name, "display_name": f.display_name, "uri": f.uri} for f in files]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/files/{name:path}")
def delete_file(name: str):
    """Delete a file from Gemini."""
    try:
        file_manager.delete_file(name)
        return {"status": "deleted", "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/session/{session_id}")
def get_session_info(session_id: str):
    """Get session details including files and summary."""
    return file_manager.get_session_details(session_id)

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the agents' thought process and final response.
    """
    # Hydrate Session from Request Data (Crucial for Serverless Persistence)
    # This ensures that files already known by the UI are registered in the backend session
    from backend.file_manager import UploadedFile as FMFile
    
    for f in request.reference_files:
        file_manager.add_file_to_session(
            request.session_id, 
            FMFile(name=f.name, uri=f.uri, type="reference", status="uploaded"), 
            "reference"
        )
    for f in request.target_files:
        file_manager.add_file_to_session(
            request.session_id, 
            FMFile(name=f.name, uri=f.uri, type="target", status="uploaded"), 
            "target"
        )

    async def event_generator():
        try:
            # Wait for any background uploads to finish before starting agent
            yield f"data: {json.dumps({'step': 'init', 'status': 'Verifying uploads...'})}\n\n"
            await file_manager.wait_for_uploads(request.session_id)
            
            # Retrieve session files from FileManager (Single Source of Truth)
            # We ignore the files passed in request body for security/consistency if we want, 
            # but for now let's merge or prefer the session store.
            
            # Actually, LangGraph agents need the 'state'.
            # Let's fetch the latest list of files for this session from FileManager
            session_refs = file_manager.get_session_files(request.session_id, "reference")
            session_targets = file_manager.get_session_files(request.session_id, "target")
            
            initial_state = {
                "user_query": request.message,
                "scenario": request.scenario,
                "chat_history": request.history,
                "reference_files": session_refs, # Use server-side session list
                "target_files": session_targets, # Use server-side session list
                "messages": []
            }
            
            # Yield initial handshake
            yield f"data: {json.dumps({'step': 'init', 'status': 'started'})}\n\n"
            
            # Stream events from LangGraph
            async for event in app_graph.astream_events(initial_state, version="v1"):
                kind = event["event"]
                name = event["name"]

                # Log when a node STARTS
                if kind == "on_chain_start" and name in ["strategist", "auditor", "verifier"]:
                     yield f"data: {json.dumps({'step': name, 'status': 'running'})}\n\n"

                # Log when a node COMPLETES
                if kind == "on_chain_end" and name in ["strategist", "auditor", "verifier"]:
                    yield f"data: {json.dumps({'step': name, 'status': 'completed'})}\n\n"
                    
                    # Capture Final Response from Verifier directly
                    if name == "verifier":
                        output = event['data'].get('output')
                        # Verifier returns a dict with 'final_response' key
                        if output and 'final_response' in output:
                            yield f"data: {json.dumps({'step': 'final', 'content': output['final_response']})}\n\n"
                            
                            # Save final response to session summary for Profile Page
                            file_manager.update_session_summary(request.session_id, output['final_response'])

            yield "data: [DONE]\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
