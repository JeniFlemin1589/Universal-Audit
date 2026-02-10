import markdown2
from xhtml2pdf import pisa
import os
import re

# Read the markdown file
report_path = r"C:\Users\DELL\.gemini\antigravity\brain\a2c0df58-0f4d-4a35-914c-39f2b0dffe63\technical_report.md"

with open(report_path, "r", encoding="utf-8") as f:
    md_content = f.read()

# Remove mermaid code blocks entirely - we'll replace with HTML diagrams
md_content = re.sub(r'```mermaid.*?```', '', md_content, flags=re.DOTALL)

# Remove ALL code blocks and replace with styled text
def replace_code_blocks(md):
    # Replace fenced code blocks with plain styled text
    def code_replacer(match):
        lang = match.group(1) or ""
        code = match.group(2).strip()
        # Return as a blockquote-style instead of code block
        lines = code.split('\n')
        formatted = '<br/>'.join(f'&nbsp;&nbsp;{line}' for line in lines)
        return f'\n\n<div class="code-box"><p class="code-label">{lang.upper()}</p>{formatted}</div>\n\n'
    
    result = re.sub(r'```(\w*)\n(.*?)```', code_replacer, md, flags=re.DOTALL)
    return result

md_content = replace_code_blocks(md_content)

# Convert markdown to HTML
html_body = markdown2.markdown(md_content, extras=["tables", "fenced-code-blocks", "header-ids", "code-friendly"])

# Architecture diagram as pure HTML
architecture_diagram = """
<div class="diagram-container">
    <div class="diagram-title">System Architecture Overview</div>
    
    <div class="layer layer-blue">
        <div class="layer-header">FRONTEND — Next.js 16 on Vercel</div>
        <div class="layer-content">
            <div class="box">User Interface</div>
            <div class="box">File Uploader</div>
            <div class="box">Chat Interface</div>
            <div class="box">Profile Page</div>
        </div>
    </div>
    
    <div class="arrow-down">▼ REST API + SSE Stream ▼</div>
    
    <div class="layer layer-purple">
        <div class="layer-header">BACKEND — FastAPI Serverless Functions</div>
        <div class="layer-content">
            <div class="box">FileManager<br/><span class="box-sub">Upload, Cache, Session</span></div>
            <div class="box">LangGraph Pipeline<br/><span class="box-sub">Multi-Agent Orchestration</span></div>
        </div>
    </div>
    
    <div class="arrow-down">▼ Gemini API Calls ▼</div>
    
    <div class="layer layer-dark">
        <div class="layer-header">GOOGLE CLOUD SERVICES</div>
        <div class="layer-content">
            <div class="box box-light">Gemini 2.5 Flash Lite<br/><span class="box-sub">AI Model</span></div>
            <div class="box box-light">Gemini File API<br/><span class="box-sub">Document Storage</span></div>
            <div class="box box-light">Cloud Firestore<br/><span class="box-sub">Session Database</span></div>
            <div class="box box-light">Firebase Auth<br/><span class="box-sub">Authentication</span></div>
        </div>
    </div>
</div>
"""

# Agent pipeline diagram
agent_diagram = """
<div class="diagram-container">
    <div class="diagram-title">Multi-Agent Pipeline (LangGraph StateGraph)</div>
    <div class="pipeline">
        <div class="pipeline-input">User Query + Files</div>
        <div class="pipeline-arrow">→</div>
        <div class="agent agent-strategy">
            <div class="agent-icon">🧠</div>
            <div class="agent-name">STRATEGIST</div>
            <div class="agent-desc">Extracts audit rules from references</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="agent agent-audit">
            <div class="agent-icon">🔍</div>
            <div class="agent-name">AUDITOR</div>
            <div class="agent-desc">Checks targets against rules</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="agent agent-verify">
            <div class="agent-icon">✅</div>
            <div class="agent-name">VERIFIER</div>
            <div class="agent-desc">Cross-references and generates report</div>
        </div>
        <div class="pipeline-arrow">→</div>
        <div class="pipeline-output">Audit Report</div>
    </div>
</div>
"""

# Data flow diagram
dataflow_diagram = """
<div class="diagram-container">
    <div class="diagram-title">End-to-End Data Flow</div>
    <table class="flow-table">
        <tr>
            <td class="flow-step">
                <div class="flow-num">1</div>
                <div class="flow-title">Authentication</div>
            </td>
            <td class="flow-detail">User → Firebase Auth (Google OAuth / Email) → JWT Token → Session UID</td>
        </tr>
        <tr>
            <td class="flow-step">
                <div class="flow-num">2</div>
                <div class="flow-title">File Upload</div>
            </td>
            <td class="flow-detail">User drops PDF → FormData POST → Temp Save → Gemini File API Upload → URI returned → Stored in Firestore sessions/{uid}</td>
        </tr>
        <tr>
            <td class="flow-step">
                <div class="flow-num">3</div>
                <div class="flow-title">Audit Execution</div>
            </td>
            <td class="flow-detail">User sends query → POST /chat/stream (SSE) → Files hydrated from request → LangGraph pipeline: Strategist extracts rules → Auditor checks targets → Verifier cross-references → Markdown Report streamed back</td>
        </tr>
        <tr>
            <td class="flow-step">
                <div class="flow-num">4</div>
                <div class="flow-title">Report & Export</div>
            </td>
            <td class="flow-detail">Markdown → ReactMarkdown renderer → Professional Report UI → jsPDF text-based export → PDF Download</td>
        </tr>
    </table>
</div>
"""

# Deployment diagram
deployment_diagram = """
<div class="diagram-container">
    <div class="diagram-title">Deployment Architecture</div>
    <div class="deploy-grid">
        <div class="deploy-box deploy-vercel">
            <div class="deploy-header">Vercel Edge Network</div>
            <div class="deploy-item">Next.js Frontend<br/><span class="deploy-url">universal-audit-v5.vercel.app</span></div>
            <div class="deploy-item">Serverless Python Functions<br/><span class="deploy-url">universal-audit-v5.vercel.app/api/*</span></div>
        </div>
        <div class="arrow-down">▼ API Calls ▼</div>
        <div class="deploy-box deploy-google">
            <div class="deploy-header">Google Cloud Platform</div>
            <div class="deploy-row">
                <div class="deploy-item-small">Gemini AI</div>
                <div class="deploy-item-small">File API</div>
                <div class="deploy-item-small">Firestore</div>
                <div class="deploy-item-small">Firebase Auth</div>
            </div>
        </div>
    </div>
</div>
"""

# Structured output example (as table instead of code)
structured_output = """
<div class="diagram-container">
    <div class="diagram-title">Pydantic Data Models</div>
    <table>
        <tr><th>Model</th><th>Fields</th><th>Purpose</th></tr>
        <tr><td><b>AuditRule</b></td><td>rule_id, description, severity</td><td>Rules extracted by Strategist</td></tr>
        <tr><td><b>Finding</b></td><td>rule_id, description, status, evidence, file_name</td><td>Audit results by Auditor</td></tr>
        <tr><td><b>VerifiedFinding</b></td><td>+ verification_status, reference_citation, explanation</td><td>Verified results by Verifier</td></tr>
        <tr><td><b>UploadedFile</b></td><td>name, uri, type, status, local_path</td><td>File tracking across pipeline</td></tr>
        <tr><td><b>ChatRequest</b></td><td>message, scenario, session_id, reference_files, target_files, history</td><td>API request payload</td></tr>
    </table>
</div>
"""

# SSE events table (instead of code block)
sse_flow = """
<div class="diagram-container">
    <div class="diagram-title">SSE Streaming Events</div>
    <table>
        <tr><th>Event Data</th><th>UI Display</th></tr>
        <tr><td>step: "strategist", status: "running"</td><td>⚡ Strategist analyzing references...</td></tr>
        <tr><td>step: "strategist", status: "completed"</td><td>✅ Strategist done — rules extracted</td></tr>
        <tr><td>step: "auditor", status: "running"</td><td>🔍 Auditor checking target files...</td></tr>
        <tr><td>step: "auditor", status: "completed"</td><td>✅ Auditor done — findings compiled</td></tr>
        <tr><td>step: "verifier", status: "running"</td><td>📋 Verifier compiling final report...</td></tr>
        <tr><td>step: "final", content: "...markdown..."</td><td>📄 Full audit report rendered on screen</td></tr>
    </table>
</div>
"""

# Pipeline flow simple
pipeline_simple = """
<div class="pipeline-simple">
    <span class="ps-box">User Query + Files</span>
    <span class="ps-arrow">→</span>
    <span class="ps-box ps-highlight">Strategist</span>
    <span class="ps-arrow">→</span>
    <span class="ps-box ps-highlight">Auditor</span>
    <span class="ps-arrow">→</span>
    <span class="ps-box ps-highlight">Verifier</span>
    <span class="ps-arrow">→</span>
    <span class="ps-box">Markdown Report</span>
</div>
"""

# Now inject these diagrams into the HTML at the right places
# We'll replace placeholders we add to the HTML

# Insert diagrams after specific headings
html_body = html_body.replace(
    '<h2>3. System Architecture</h2>',
    '<h2>3. System Architecture</h2>' + architecture_diagram
)

html_body = html_body.replace(
    '<h3>Pipeline Flow (LangGraph StateGraph)</h3>',
    '<h3>Pipeline Flow (LangGraph StateGraph)</h3>' + agent_diagram
)

# Replace Step sections with our data flow diagram
html_body = re.sub(
    r'<h3>Step 1: Authentication</h3>.*?(?=<h2>6\.)',
    dataflow_diagram + '\n<hr/>\n',
    html_body, flags=re.DOTALL
)

# Replace deployment architecture section's code
html_body = html_body.replace(
    '<h2>12. Deployment Architecture</h2>',
    '<h2>12. Deployment Architecture</h2>' + deployment_diagram
)

# Replace structured output code block
html_body = re.sub(
    r'<p>Universal Audit enforces.*?no free-text ambiguity\.</p>',
    '<p>Universal Audit enforces <strong>structured JSON output</strong> from AI agents using Pydantic schemas:</p>' + structured_output + '<p>This ensures every agent output is <strong>deterministic, parseable, and auditable</strong> — no free-text ambiguity.</p>',
    html_body, flags=re.DOTALL
)

# Replace SSE architecture section
html_body = html_body.replace(
    '<h2>9. Real-Time Streaming Architecture</h2>',
    '<h2>9. Real-Time Streaming Architecture</h2>' + sse_flow
)

# Remove remaining code-box divs that look bad
html_body = re.sub(r'<div class="code-box">.*?</div>', '', html_body, flags=re.DOTALL)

# Wrap in styled HTML
html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{
        size: A4;
        margin: 18mm;
    }}
    body {{
        font-family: Helvetica, Arial, sans-serif;
        font-size: 11px;
        line-height: 1.6;
        color: #1a1a2e;
    }}
    h1 {{
        font-size: 28px;
        color: #0f0f23;
        border-bottom: 3px solid #4361ee;
        padding-bottom: 10px;
        margin-top: 30px;
    }}
    h2 {{
        font-size: 18px;
        color: #1a1a40;
        border-bottom: 2px solid #4361ee;
        padding-bottom: 6px;
        margin-top: 28px;
    }}
    h3 {{
        font-size: 14px;
        color: #3a0ca3;
        margin-top: 18px;
    }}
    h4 {{
        font-size: 12px;
        color: #4361ee;
        margin-top: 12px;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 10px;
    }}
    th {{
        background-color: #1a1a2e;
        color: white;
        padding: 8px 10px;
        text-align: left;
        font-weight: bold;
    }}
    td {{
        padding: 6px 10px;
        border-bottom: 1px solid #e0e0e0;
        vertical-align: top;
    }}
    tr:nth-child(even) td {{
        background-color: #f8f9fa;
    }}
    code {{
        background-color: #eef0f8;
        padding: 1px 5px;
        border-radius: 3px;
        font-family: Courier;
        font-size: 10px;
        color: #4361ee;
    }}
    blockquote {{
        border-left: 4px solid #4361ee;
        padding: 10px 15px;
        margin: 14px 0;
        background-color: #f0f4ff;
        color: #333;
    }}
    hr {{
        border: none;
        border-top: 2px solid #e0e0e0;
        margin: 22px 0;
    }}
    strong {{
        color: #0f0f23;
    }}
    p {{
        margin: 6px 0;
    }}
    ul, ol {{
        margin: 6px 0;
        padding-left: 25px;
    }}
    li {{
        margin: 3px 0;
    }}
    
    /* --- Architecture Diagram Styles --- */
    .diagram-container {{
        margin: 16px 0;
        padding: 0;
    }}
    .diagram-title {{
        font-size: 13px;
        font-weight: bold;
        color: #1a1a2e;
        text-align: center;
        margin-bottom: 12px;
        padding: 6px;
        background-color: #f0f4ff;
        border-radius: 4px;
    }}
    .layer {{
        margin: 8px 0;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #ddd;
    }}
    .layer-header {{
        padding: 8px 14px;
        font-weight: bold;
        font-size: 11px;
        color: white;
        letter-spacing: 0.5px;
    }}
    .layer-blue .layer-header {{ background-color: #2563eb; }}
    .layer-purple .layer-header {{ background-color: #7c3aed; }}
    .layer-dark .layer-header {{ background-color: #1a1a2e; }}
    
    .layer-content {{
        padding: 10px 14px;
        background-color: #fafbff;
    }}
    .box {{
        display: inline-block;
        padding: 8px 14px;
        margin: 4px 6px;
        background-color: #ffffff;
        border: 1px solid #d0d5e8;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
        color: #1a1a2e;
    }}
    .box-light {{
        background-color: #ffffff;
        color: #1a1a2e;
    }}
    .box-sub {{
        font-size: 8px;
        font-weight: normal;
        color: #888;
    }}
    .arrow-down {{
        text-align: center;
        font-size: 11px;
        color: #7c3aed;
        font-weight: bold;
        padding: 4px 0;
    }}
    
    /* Agent Pipeline */
    .pipeline {{
        text-align: center;
        padding: 10px;
    }}
    .agent {{
        display: inline-block;
        width: 120px;
        padding: 10px;
        margin: 4px;
        border-radius: 8px;
        text-align: center;
        vertical-align: top;
    }}
    .agent-strategy {{ background-color: #ede9fe; border: 2px solid #7c3aed; }}
    .agent-audit {{ background-color: #dbeafe; border: 2px solid #2563eb; }}
    .agent-verify {{ background-color: #d1fae5; border: 2px solid #059669; }}
    .agent-icon {{ font-size: 20px; }}
    .agent-name {{ font-size: 11px; font-weight: bold; color: #1a1a2e; margin: 4px 0; }}
    .agent-desc {{ font-size: 8px; color: #666; }}
    .pipeline-arrow {{ font-size: 18px; color: #7c3aed; font-weight: bold; display: inline-block; margin: 0 4px; vertical-align: middle; }}
    .pipeline-input, .pipeline-output {{
        display: inline-block;
        padding: 8px 12px;
        background-color: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 20px;
        font-size: 10px;
        font-weight: bold;
        vertical-align: middle;
    }}
    
    /* Data Flow */
    .flow-table {{
        width: 100%;
        border-collapse: collapse;
    }}
    .flow-step {{
        width: 100px;
        text-align: center;
        padding: 10px;
        vertical-align: middle;
    }}
    .flow-num {{
        display: inline-block;
        width: 28px;
        height: 28px;
        line-height: 28px;
        background-color: #4361ee;
        color: white;
        font-weight: bold;
        border-radius: 50%;
        text-align: center;
        font-size: 14px;
    }}
    .flow-title {{
        font-weight: bold;
        font-size: 11px;
        margin-top: 4px;
        color: #1a1a2e;
    }}
    .flow-detail {{
        padding: 10px 14px;
        font-size: 10px;
        color: #333;
        border-left: 3px solid #4361ee;
    }}
    
    /* Deployment */
    .deploy-grid {{
        text-align: center;
    }}
    .deploy-box {{
        margin: 8px auto;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #ddd;
        width: 90%;
    }}
    .deploy-header {{
        padding: 8px;
        font-weight: bold;
        font-size: 12px;
        color: white;
    }}
    .deploy-vercel .deploy-header {{ background-color: #000; }}
    .deploy-google .deploy-header {{ background-color: #4285f4; }}
    .deploy-item {{
        display: inline-block;
        margin: 8px;
        padding: 8px 14px;
        background: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 10px;
        font-weight: bold;
    }}
    .deploy-item-small {{
        display: inline-block;
        margin: 6px;
        padding: 6px 12px;
        background: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 9px;
        font-weight: bold;
    }}
    .deploy-url {{
        font-size: 8px;
        color: #666;
        font-weight: normal;
    }}
    .deploy-row {{
        padding: 8px;
    }}
    
    /* Simple pipeline */
    .pipeline-simple {{
        text-align: center;
        padding: 8px;
        margin: 10px 0;
        background: #f8f9fa;
        border-radius: 6px;
    }}
    .ps-box {{
        display: inline-block;
        padding: 6px 10px;
        background: white;
        border: 1px solid #d0d5e8;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
    }}
    .ps-highlight {{ background-color: #ede9fe; border-color: #7c3aed; }}
    .ps-arrow {{ color: #7c3aed; font-weight: bold; margin: 0 4px; }}
</style>
</head>
<body>
{html_body}
</body>
</html>
"""

# Generate PDF
output_path = os.path.join(os.path.expanduser("~"), "Desktop", "Universal_Audit_Technical_Report.pdf")

with open(output_path, "wb") as pdf_file:
    pisa_status = pisa.CreatePDF(html, dest=pdf_file)

if pisa_status.err:
    print(f"Error generating PDF: {pisa_status.err}")
else:
    print(f"PDF generated successfully: {output_path}")
