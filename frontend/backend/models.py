from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UploadedFile(BaseModel):
    name: str
    uri: str
    type: str # "reference" or "target"
    status: str = "uploaded" # 'pending', 'uploading', 'uploaded', 'failed'
    local_path: Optional[str] = None
    error_message: Optional[str] = None

class AuditRule(BaseModel):
    rule_id: str = Field(description="Unique identifier for the rule")
    description: str = Field(description="Description of what to check")
    severity: str = Field(description="High, Medium, or Low")

class Finding(BaseModel):
    rule_id: str
    description: str
    status: str = Field(description="Pass/Fail/Warning")
    evidence: str = Field(description="Quote from the target document")
    file_name: str = Field(description="Name of the file where finding was found")
    page_number: Optional[int] = None

class VerifiedFinding(Finding):
    verification_status: str = Field(description="Verified/Hallucination")
    reference_citation: str = Field(description="Citation from the reference document verifying the rule")
    explanation: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    scenario: str = "Universal Audit"
    session_id: str # Required for multi-tenancy
    reference_files: List[UploadedFile] = []
    target_files: List[UploadedFile] = []
    history: List[Dict[str, str]] = []

class AgentStep(BaseModel):
    step_name: str
    status: str
    details: Optional[str] = None
    timestamp: str
