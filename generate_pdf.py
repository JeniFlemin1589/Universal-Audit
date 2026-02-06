from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_medical_record():
    c = canvas.Canvas("e:/10qbit/Universal-Audit/Patient_Medical_Record.pdf", pagesize=letter)
    width, height = letter

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "UNIVERSAL HEALTH CLINIC - PATIENT ENCOUNTER FORM")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 730, "Patient Name: John Doe")
    c.drawString(50, 715, "DOB: 05/12/1980")
    c.drawString(50, 700, "Date of Service: 02/06/2026")
    
    c.line(50, 690, 550, 690)

    # Clinical Notes
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 660, "Clinical Notes:")
    
    c.setFont("Helvetica", 12)
    text = c.beginText(50, 640)
    text.setFont("Helvetica", 12)
    text.setLeading(15)
    
    lines = [
        "Chief Complaint: Patient presents with skin lesion and accidental chemical exposure.",
        "",
        "History of Present Illness:",
        "1. Skin: Patient has a dark, irregular mole on the left forearm.",
        "   Biopsy results confirm Malignant Melanoma of skin (upper limb).",
        "",
        "2. Poisoning: Patient accidentally ingested a small amount of 2-propenol",
        "   while working in the garage 2 hours ago.",
        "",
        "Assessment / Diagnosis:",
        "- Malignant melanoma of skin of left forearm",
        "- Accidental poisoning by 2-propenol",
        "",
        "Plan:",
        "- Refer to Oncology.",
        "- Monitor vitals for chemical exposure response.",
    ]
    
    for line in lines:
        text.textLine(line)
        
    c.drawText(text)
    
    # Coding Section (Intentionally vague or partly wrong to test the Audit)
    c.line(50, 400, 550, 400)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 380, "Pre-Billing Coding (For Audit):")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 350, "1. Melanoma: Code C43.6 (Malignant melanoma of upper limb)")
    c.drawString(50, 330, "2. Poisoning: Code T51.2X2 (Toxic effect of 2-Propanol, Intentional Self-harm)")
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 300, "*Auditor Note: Please verify if 'Intentional Self-harm' matches the clinical notes.*")

    c.save()

if __name__ == "__main__":
    create_medical_record()
    print("PDF Generated: Patient_Medical_Record.pdf")
