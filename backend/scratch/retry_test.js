require('dotenv').config();
const mongoose = require('mongoose');
const { processDocument } = require('../services/ocrService');
const Tender = require('../models/Tender');

async function retryTests() {
    await mongoose.connect(process.env.MONGODB_URI);
    const tender = await Tender.findOne({ tenderId: "GEM/2026/B/DEMO001" });
    const tenderDocReq = tender.documentRequirements.find(r => r.documentType === "OEM_AUTHORIZATION_CERTIFICATE");
    
    const files = [
        "C:/SIH 2026/Project/gem-compliance-node/backend/scratch/test_pdfs/03A_oem_auth_test.pdf",
        "C:/SIH 2026/Project/gem-compliance-node/backend/scratch/test_pdfs/03B_oem_auth_test.pdf"
    ];
    
    for (const f of files) {
        console.log(`\nTesting ${f}...`);
        try {
            const result = await processDocument(f, "OEM_AUTHORIZATION_CERTIFICATE", "TENDER_SPECIFIC", tenderDocReq);
            console.log(result.extractedFields);
        } catch(e) {
            console.log("Failed:", e.message);
        }
        await new Promise(r => setTimeout(r, 15000));
    }
    mongoose.connection.close();
}
retryTests();
