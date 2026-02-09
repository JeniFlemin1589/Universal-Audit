import os
import logging
import json
from typing import TypedDict, List, Annotated
from dotenv import load_dotenv

load_dotenv()

from langgraph.graph import StateGraph, END
from google import genai
from google.genai import types
from backend.models import AuditRule, Finding, VerifiedFinding, UploadedFile

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini Client
api_key = os.environ.get("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def get_client():
    if client: return client
    return genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

# Define State
class AgentState(TypedDict):
    user_query: str
    scenario: str
    chat_history: List[dict]
    reference_files: List[UploadedFile]
    target_files: List[UploadedFile]
    
    # Internal state
    audit_plan: str  # Strategist's understanding of what to do
    rules: List[AuditRule]
    draft_findings: List[Finding]
    verified_findings: List[VerifiedFinding]
    final_response: str # Markdown response for the user
    
    messages: List[str] # Log

# --- Nodes ---

def strategist_agent(state: AgentState):
    """Analyzes query and references to define the Audit Strategy/Rules."""
    logger.info("Strategist: analyzing request...")
    
    ref_file_uris = [f.uri for f in state['reference_files']]
    
    # If no references, we can't extract specific rules, but we can still try to answer or use general knowledge?
    # For this system, let's assume references are key.
    
    prompt = f"""
    You are an Expert Audit Strategist.
    
    CONTEXT / SCENARIO: "{state['scenario']}"
    User Query: "{state['user_query']}"
    
    You have access to {len(state['reference_files'])} Reference Documents.
    
    Your goal:
    1. Adopt the persona and expertise required for the SCENARIO (e.g., if 'Medical', think like a Medical Coder. If 'Tax', think like an Auditor).
    2. Analyze the Reference Documents (if any) to extract specific Criteria/Rules relevant to the User's Query.
    3. Output a JSON list of strictly defined `AuditRule` objects that the Auditor needs to check.
    
    CRITICAL FALLBACK:
    If NO Reference Documents are provided, or if they are generic, YOU MUST GENERATE 5-10 STANDARD AUDIT RULES based on the SCENARIO: "{state['scenario']}".
    DO NOT return an empty list. You MUST provide rules for the Auditor to work with.
    """
    
    # Prepare parts
    parts = []
    for uri in ref_file_uris:
        parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf")) # Generic mime
    parts.append(types.Part.from_text(text=prompt))
    
    try:
        response = get_client().models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[AuditRule]
            )
        )
        
        rules = response.parsed
        if not rules: 
            # Double fallback if model returns empty list
            rules = [AuditRule(rule_id="GEN-001", description=f"General compliance check for {state['scenario']}", severity="High")]
        
        logger.info(f"Strategist extracted {len(rules)} rules.")
        return {
            "rules": rules, 
            "messages": state.get("messages", []) + [f"Strategist defined {len(rules)} audit criteria."]
        }

    except Exception as e:
        logger.error(f"Strategist error: {e}")
        # Fallback empty rules
        return {"rules": [], "messages": state.get("messages", []) + [f"Strategist error: {str(e)}"]}


def auditor_agent(state: AgentState):
    """Audits each target file against the rules."""
    logger.info("Auditor: Checking targets...")
    
    rules_json = json.dumps([r.model_dump() for r in state['rules']], indent=2)
    all_findings = []
    
    if not state['target_files']:
        return {"draft_findings": [], "messages": state.get("messages", []) + ["No target files to audit."]}

    for target_file in state['target_files']:
        prompt = f"""
        You are an Expert Auditor.
        Task: Audit this specific file: "{target_file.name}" against the following Rules.
        
        Rules:
        {rules_json}
        
        For EACH rule:
        - Determine Pass/Fail/Warning.
        - Quote the Evidence.
        
        Output a JSON list of Finding objects. 
        IMPORTANT: Include 'file_name': "{target_file.name}" in each finding.
        """
        
        try:
            response = get_client().models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=target_file.uri, mime_type="application/pdf"),
                            types.Part.from_text(text=prompt)
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=list[Finding]
                )
            )
            
            if response.parsed:
                all_findings.extend(response.parsed)
                
        except Exception as e:
            logger.error(f"Auditor error on {target_file.name}: {e}")
            
    logger.info(f"Auditor found {len(all_findings)} total issues.")
    return {
        "draft_findings": all_findings,
        "messages": state.get("messages", []) + [f"Auditor checked {len(state['target_files'])} files, found {len(all_findings)} items."]
    }


def verifier_agent(state: AgentState):
    """Verifies findings and compiles the chat response."""
    logger.info("Verifier: Validating and summarizing...")
    
    findings_json = json.dumps([f.model_dump() for f in state['draft_findings']], indent=2)
    ref_uris = [f.uri for f in state['reference_files']]
    
    prompt = f"""
    You are a Lead Auditor at a Regulatory Body.
    
    1. Review the Draft Findings below:
    {findings_json}
    
    2. Cross-reference EXACTLY with the Reference Documents (attached).
    3. Generate a **COMPREHENSIVE, END-TO-END PROFESSIONAL AUDIT REPORT** in Markdown.
    
    ### Report Philosophy: "Total Transparency"
    The user wants to see *everything*—every detail, every reference, every logic step.
    
    ### Required Structure:
    
    #### 1. Audit Certificate
    - **Outcome**: [PASS / FAIL / RISK DETECTED]
    - **Summary**: Brief overview of the audit scope.
    
    #### 2. Audit Trail & Methodology
    - **Scope**: List files audited.
    - **Standards**: List reference documents used (Source of Truth).
    - **Process**: Explain *how* the decision was reached (e.g., "Compared Clinical Assessment text against ICD-10 Rules").
    
    #### 3. Detailed Findings & Logic (The Core)
    - Use a detailed structure for each finding:
        - **Finding ID**: [e.g., AUD-001]
        - **Rule Checked**: [What was the requirement?]
        - **Evidence Found**: [Quote the text from the target document]
        - **Reference Standard**: [Quote the text/code from the ICD-10/Reference document]
        - **Logic / Rationale**: [EXPLAIN step-by-step why this matches or mismatches. "Because text says X, but code says Y..."]
        - **Result**: [🔴 CRITICAL FAIL / 🟡 WARNING / 🟢 PASS]
    
    #### 4. Final Recommendations
    - Specific corrective actions.
    
    CRITICAL INSTRUCTION:
    If you have received Input Files (Reference or Evidence), YOU MUST GENERATE THE REPORT.
    DO NOT ask the user for files. They are already attached to this prompt.
    If the findings are empty, PERFORM A GENERAL AUDIT based on the file contents and the Scenario.
    
    **Tone**: Exhaustive, precise, forensic. Leave no ambiguity.
    **Output**: ONLY the Markdown report. Do not start with "Okay" or "Here is the report".
    """
    
    parts = []
    for uri in ref_uris:
         # Re-attach references for verification context
        parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf"))
    parts.append(types.Part.from_text(text=prompt))
    
    try:
        response = get_client().models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(
                response_mime_type="text/plain" # Free text markdown for the final chat response
            )
        )
        
        final_text = response.text
        return {
            "final_response": final_text,
            "messages": state.get("messages", []) + ["Verification complete. Response generated."]
        }

    except Exception as e:
        logger.error(f"Verifier error: {e}")
        import traceback
        traceback.print_exc()
        return {"final_response": f"Error generating final report: {str(e)}", "messages": state.get("messages", []) + [f"Verifier error: {str(e)}"]}

# --- Graph ---
workflow = StateGraph(AgentState)

workflow.add_node("strategist", strategist_agent)
workflow.add_node("auditor", auditor_agent)
workflow.add_node("verifier", verifier_agent)

workflow.set_entry_point("strategist")
workflow.add_edge("strategist", "auditor")
workflow.add_edge("auditor", "verifier")
workflow.add_edge("verifier", END)

app_graph = workflow.compile()
