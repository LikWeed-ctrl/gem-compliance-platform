import os
from fpdf import FPDF
import datetime

# Create output dir
out_dir = r"C:\SIH 2026\Project\gem-compliance-node\backend\scratch\demo_pdfs"
os.makedirs(out_dir, exist_ok=True)

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'DEMONSTRATION / SYNTHETIC DOCUMENT', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 10, 'This document is synthetically generated for SIH 2026 Demo purposes only.', 0, 1, 'C')
        self.line(10, 30, 200, 30)
        self.ln(10)

def generate_pdf(filename, title, content_lines, mock_json):
    pdf = PDF()
    pdf.add_page()
    
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, title.upper(), 0, 1, 'C')
    pdf.ln(10)
    
    pdf.set_font('Arial', '', 12)
    for line in content_lines:
        pdf.multi_cell(0, 8, line)
        
    pdf.ln(10)
    pdf.set_font('Courier', '', 6)
    pdf.set_text_color(255, 255, 255) # invisible
    import json
    pdf.multi_cell(0, 4, f"DEMO_MOCK_JSON={json.dumps(mock_json)}=END_MOCK")
        
    filepath = os.path.join(out_dir, filename)
    pdf.output(filepath)
    print(f"Generated {filepath}")

# Helper to format dates
def get_date(days_offset):
    d = datetime.date(2026, 9, 13) + datetime.timedelta(days=days_offset)
    return d.strftime("%d-%m-%Y")

# Data definitions
bidders = [
    # T1 - IT Hardware
    {
        "id": "B1", "name": "TechVision Systems Pvt Ltd", "gstin": "27AAACT1111A1Z1",
        "turnover": 800, "exp_years": 4, "mii": 60, "past_perf": 120, "tender": "T1", "wo_value": 120,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "MII", "OEM"]
    },
    {
        "id": "B2", "name": "InnoTech Solutions Limited", "gstin": "27AAACT2222A1Z1",
        "turnover": 600, "exp_years": 3.5, "mii": 50, "past_perf": 110, "tender": "T1", "wo_value": 110,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "MII", "OEM"],
        "issue": "DATE_INVERSION" # Start date > End date
    },
    {
        "id": "B3", "name": "Apex Hardware Corp", "gstin": "27AAACT3333A1Z1",
        "turnover": 200, "exp_years": 3, "mii": 50, "past_perf": 100, "tender": "T1", "wo_value": 100,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "OEM"] # Missing MII
    },
    # T2 - Medical Equipment
    {
        "id": "B4", "name": "LifeCare Medtech Pvt Ltd", "gstin": "27AAACT4444A1Z1",
        "turnover": 1500, "exp_years": 6, "past_perf": 800, "tender": "T2", "wo_value": 800,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"]
    },
    {
        "id": "B5", "name": "MediEquip India", "gstin": "27AAACT5555A1Z1", # SellerProfile is "MediEquip India Pvt Ltd"
        "turnover": 1100, "exp_years": 5.5, "past_perf": 600, "tender": "T2", "wo_value": 600,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"],
        "issue": "IDENTITY_MISMATCH"
    },
    {
        "id": "B6", "name": "Global Health Systems", "gstin": "27AAACT6666A1Z1",
        "turnover": 1050, "exp_years": 5.5, "past_perf": 500, "tender": "T2", "wo_value": 400, # WO contradicts PastPerf
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"],
        "issue": "CROSS_DOC"
    },
    # T3 - Solar
    {
        "id": "B7", "name": "SunRay Energy Solutions", "gstin": "27AAACT7777A1Z1",
        "turnover": 500, "exp_years": 4, "past_perf": 300, "tender": "T3", "wo_value": 300,
        "docs": ["EXPERIENCE", "PAST_PERFORMANCE", "TURNOVER"]
    },
    {
        "id": "B8", "name": "EcoPower Renewables", "gstin": "27AAACT8888A1Z1",
        "turnover": 250, "exp_years": 3, "past_perf": 160, "tender": "T3", "wo_value": 160,
        "docs": ["EXPERIENCE", "PAST_PERFORMANCE", "TURNOVER"],
        "issue": "TURNOVER_LOW"
    },
    {
        "id": "B9", "name": "VoltTech Electricals", "gstin": "29ZZZCT9999A1Z1", # Wrong GSTIN in doc
        "turnover": 400, "exp_years": 3, "past_perf": 200, "tender": "T3", "wo_value": 200,
        "docs": ["EXPERIENCE", "TURNOVER"], # Missing past perf
        "issue": "GSTIN_MISMATCH"
    },
    # T4 - Infra
    {
        "id": "B10", "name": "Bharat Infra Services Ltd", "gstin": "27AAACT0000A1Z1",
        "turnover": 250, "exp_years": 2, "tender": "T4", "wo_value": 150,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER"]
    },
    {
        "id": "B11", "name": "National Builders", # Slight identity name mismatch
        "turnover": 150, "exp_years": 1.5, "tender": "T4", "wo_value": 110,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER"],
        "issue": "IDENTITY_REVIEW"
    },
    {
        "id": "B12", "name": "Urban Dev Projects", "gstin": "27AAACT1212A1Z1",
        "turnover": 120, "exp_years": 0.5, "tender": "T4", "wo_value": 100,
        "docs": ["EXPERIENCE", "WORK_ORDER", "TURNOVER"],
        "issue": "EXP_LOW"
    }
]

for b in bidders:
    doc_name = b.get("name", "")
    if b.get("issue") == "IDENTITY_MISMATCH":
        doc_name = "Medical Equipments Ltd" # Entirely different
    
    doc_gstin = b.get("gstin", "27AAACT0000A1Z1")
    if b.get("issue") == "GSTIN_MISMATCH":
        doc_gstin = "07BBBBB1111B1Z1"

    # 1. TURNOVER
    if "TURNOVER" in b["docs"]:
        turnover_val = b["turnover"]
        lines = [
            f"This is to certify that {doc_name}",
            f"GSTIN: {doc_gstin}",
            "",
            f"Has achieved an average annual turnover of Rs. {turnover_val} Lakhs over the last 3 financial years.",
            "",
            "Year 1: Rs. 100 Lakhs",
            f"Year 2: Rs. {turnover_val} Lakhs",
            f"Year 3: Rs. {turnover_val} Lakhs",
            "",
            "Certified by: CA Firm Associates",
            f"Date: {get_date(-10)}"
        ]
        generate_pdf(f"{b['id']}_TURNOVER.pdf", "Bidder Turnover Certificate", lines, {
            "bidderName": doc_name,
            "turnoverLakhs": turnover_val,
            "gstin": doc_gstin
        })

    # 2. EXPERIENCE
    if "EXPERIENCE" in b["docs"]:
        exp = b["exp_years"]
        if b.get("issue") == "DATE_INVERSION":
            start_date = get_date(-30)
            end_date = get_date(-365)
        else:
            start_date = get_date(int(-365 * exp))
            end_date = get_date(-30)
            
        lines = [
            f"This is to certify that {doc_name}",
            f"GSTIN: {doc_gstin}",
            "",
            f"Has successfully completed projects and has a total experience of {exp} years.",
            "",
            "Project Reference: PO-999888",
            f"Commencement Date: {start_date}",
            f"Completion Date: {end_date}",
            "Status: Completed",
            "",
            "Authorized Signatory",
            f"Date: {get_date(-5)}"
        ]
        generate_pdf(f"{b['id']}_EXPERIENCE.pdf", "Experience Certificate", lines, {
            "bidderName": doc_name,
            "contractNumber": "PO-999888",
            "commencementDate": start_date,
            "actualCompletionDate": end_date,
            "completionStatus": "Completed",
            "contractValue": b.get("wo_value", 0)
        })
        
    # 3. WORK ORDER
    if "WORK_ORDER" in b["docs"]:
        wo_val = b["wo_value"]
        lines = [
            f"Supplier Name: {doc_name}",
            f"Supplier GSTIN: {doc_gstin}",
            "",
            "We are pleased to place a work order for the following items:",
            "1. Main Equipment",
            "",
            f"Total Order Value: Rs. {wo_val} Lakhs",
            "Order Reference: PO-999888",
            f"Date of Issue: {get_date(-800)}",
            "",
            "Authorized Officer"
        ]
        generate_pdf(f"{b['id']}_WORK_ORDER.pdf", "Work Order / Purchase Order", lines, {
            "supplierName": doc_name,
            "gstin": doc_gstin,
            "totalOrderValue": wo_val,
            "orderReferenceNumber": "PO-999888",
            "dateOfIssue": get_date(-800),
            "productModel": "Main Equipment"
        })
        
    # 4. PAST PERFORMANCE
    if "PAST_PERFORMANCE" in b["docs"]:
        pp_val = b["past_perf"]
        lines = [
            f"This is to certify that {doc_name}",
            f"GSTIN: {doc_gstin}",
            "",
            f"Has successfully supplied and commissioned goods worth Rs. {pp_val} Lakhs.",
            "Order Reference: PO-999888",
            "Status: Satisfactory Performance",
            "",
            "Client Signature",
            f"Date: {get_date(-15)}"
        ]
        generate_pdf(f"{b['id']}_PAST_PERFORMANCE.pdf", "Past Performance Certificate", lines, {
            "supplierName": doc_name,
            "gstin": doc_gstin,
            "totalOrderValue": pp_val,
            "purchaseOrderNumber": "PO-999888"
        })

    # 5. MII
    if "MII" in b["docs"]:
        mii = b["mii"]
        lines = [
            f"This is to certify that {doc_name}",
            f"GSTIN: {doc_gstin}",
            "",
            "Declares that the goods offered comply with Make In India policy.",
            f"Percentage of Local Content: {mii}%",
            "Location of Value Addition: Mumbai, Maharashtra",
            "",
            "Authorized Signatory",
            f"Date: {get_date(-2)}"
        ]
        generate_pdf(f"{b['id']}_MII.pdf", "Make In India (MII) Certificate", lines, {
            "bidderName": doc_name,
            "localContentPercent": mii,
            "model": "Main Equipment"
        })
        
    # 6. OEM
    if "OEM" in b["docs"]:
        lines = [
            "We, Original Equipment Manufacturer Ltd,",
            "",
            f"Hereby authorize {doc_name}",
            f"GSTIN: {doc_gstin}",
            "",
            "To quote, supply, and provide support for our products.",
            "Authorization is valid for the current tender.",
            "",
            "OEM Director",
            f"Date: {get_date(-20)}"
        ]
        generate_pdf(f"{b['id']}_OEM.pdf", "OEM Authorization Certificate", lines, {
            "bidderName": doc_name,
            "oemName": "Original Equipment Manufacturer Ltd",
            "model": "Main Equipment"
        })
