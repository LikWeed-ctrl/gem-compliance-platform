const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const outputDir = path.join(__dirname, 'test_pdfs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function createPdf(filename, content) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(path.join(outputDir, filename)));
  doc.fontSize(12).text(content, { align: 'left' });
  doc.end();
}

// 1. Experience Certificate
createPdf('01_experience_certificate.pdf', `
EXPERIENCE / WORK COMPLETION CERTIFICATE
Issuing Organization: Ministry of Railways
Certificate No: MOR/EXP/2026/001
Issue Date: 2026-05-10
Bidder Name: Zenith Software Solutions
Work Name: Supply and Installation of Office Furniture – Regional Offices
Work Order No: WO-998877
Work Order Date: 2025-01-15
Contract Value: 6000000
Completed Value: 6000000
Completion Date: 2025-12-20
Status: Completed
`);

// 2. Past Performance Certificate
createPdf('02_past_performance.pdf', `
PAST PERFORMANCE CERTIFICATE
Purchaser Name: Ministry of Railways
Bidder Name: Zenith Software Solutions
PO Number: PO-12345
PO Date: 2025-02-01
Product/Service: Office Furniture
Quantity Ordered: 100
Quantity Supplied: 100
Order Value: 8500000
Delivery Status: Completed
Quality Status: Satisfactory
`);

// 3. OEM Authorization Certificate
createPdf('03_oem_authorization.pdf', `
OEM AUTHORIZATION CERTIFICATE
OEM Name: Global Furniture Corp
Bidder Name: Zenith Software Solutions
Tender Number: GEM/2026/B/DEMO001
Product/Model: Premium Office Desk Model X
We, Global Furniture Corp, explicitly authorize Zenith Software Solutions to bid, negotiate, and conclude the contract in regard to this tender.
Authorization Date: 2026-06-01
Signature: John Doe (Authorized Signatory)
`);

// 4. Make In India Certificate
createPdf('04_make_in_india.pdf', `
DECLARATION OF LOCAL CONTENT / MAKE IN INDIA
Bidder Name: Zenith Software Solutions
Tender Number: GEM/2026/B/DEMO001
Product: Premium Office Desk Model X
Local Content Percentage: 65%
Imported Content Percentage: 35%
Supplier Classification: Class-I Local Supplier
We undertake that the item offered meets the local content requirement.
`);

// 5. Work Order
createPdf('05_work_order.pdf', `
WORK ORDER / PURCHASE ORDER
Purchaser Name: Ministry of Railways
Bidder Name: Zenith Software Solutions
PO Number: PO-12345
PO Date: 2025-02-01
Product/Service: Premium Office Desk Model X
Quantity: 100
Total Value: 8500000
Delivery Location: Delhi Regional Office
`);

console.log("PDFs generated in test_pdfs folder.");
