require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const connectDB = require("./config/db");
const Tender = require("./models/Tender");
const SellerProfile = require("./models/SellerProfile");
const BidSubmission = require("./models/BidSubmission");
const Document = require("./models/Document");
const ComplianceCheck = require("./models/ComplianceCheck");
const AuditLog = require("./models/AuditLog");
const { processDocument } = require("./services/ocrService");
const { runBidSubmissionChecks } = require("./services/verificationOrchestrator");
const { calculateComplianceScore } = require("./services/scoringEngine");

async function generatePDF(textContent, mockJson, filename) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const lines = textContent.split('\n');
  let y = 800;
  for (const line of lines) {
    if (y < 50) {
      // Very naive pagination
      break;
    }
    page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) });
    y -= 15;
  }
  
  // Hidden mock JSON text (white color or tiny size)
  page.drawText(`DEMO_MOCK_JSON=${mockJson}=END_MOCK`, {
    x: 10, y: 10, size: 2, font, color: rgb(1, 1, 1) // almost invisible white
  });

  const pdfBytes = await pdfDoc.save();
  
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
  const filePath = path.join(uploadsDir, filename);
  
  fs.writeFileSync(filePath, pdfBytes);
  return filename;
}

function buildOemAuthContent(bidderName, oemName, product) {
  return {
    text: `ORIGINAL EQUIPMENT MANUFACTURER (OEM) AUTHORIZATION\n\nDate: 2026-08-01\nRef No: OEM-AUTH-2026-88\n\nTo,\nThe General Manager (Procurement)\nIndian Oil Corporation Limited (IOCL)\n\nSubject: OEM Authorization for Provision of Petroleum Equipment Maintenance\n\nDear Sir/Madam,\nWe, ${oemName}, who are established and reputable manufacturers of\n${product}, do hereby authorize ${bidderName}\nto submit a bid, and subsequently negotiate and sign the contract with you.\n\nWe extend our full guarantee and warranty for the goods and services offered.\n\nAuthorized Signatory\n${oemName}`,
    json: `{"oemName":"${oemName}","bidderName":"${bidderName}","product":"${product}","authorizationDate":"2026-08-01"}`
  };
}

function buildMiiContent(bidderName, localContent, product) {
  return {
    text: `SELF-DECLARATION FOR MAKE IN INDIA (MII)\nUnder Public Procurement (Preference to Make in India), Order 2017\n\nDate: 2026-08-05\n\nI/We, representing ${bidderName}, hereby solemnly declare and certify\nthat the percentage of local content for ${product} offered\nagainst the subject tender is ${localContent}%.\n\nWe understand that false declarations will be in breach of the Code of Integrity.\n\nLocation of value addition: MIDC Industrial Area, Maharashtra\n\nAuthorized Signatory\n${bidderName}`,
    json: `{"bidderName":"${bidderName}","localContentPercent":${localContent},"product":"${product}","manufacturerName":"${bidderName}"}`
  };
}

function buildTurnoverContent(bidderName, turnoverLakhs) {
  const turnoverAmount = turnoverLakhs * 100000;
  return {
    text: `CA CERTIFIED TURNOVER CERTIFICATE\nGupta & Associates, Chartered Accountants\n\nTo Whom It May Concern\n\nThis is to certify that the Annual Turnover of ${bidderName}\nfor the last financial year is as follows:\n\nFinancial Year: 2025-2026\nTurnover (INR): Rs ${turnoverAmount}\nTurnover (Lakhs): ${turnoverLakhs} Lakhs\n\nCA Name: CA Ramesh Gupta\nMembership No: 123456\nUDIN: 26123456AAAAAA1234\n\nChartered Accountant`,
    json: `{"bidderName":"${bidderName}","financialYear":"2025-2026","turnoverAmount":${turnoverAmount},"turnoverCurrency":"INR","turnoverUnit":"Lakhs","turnoverLakhs":${turnoverLakhs},"caName":"CA Ramesh Gupta","caMembershipNumber":"123456"}`
  };
}

function buildExperienceContent(bidderName, startYMD, endYMD) {
  return {
    text: `EXPERIENCE CERTIFICATE\nHindustan Petroleum Corporation Limited\n\nRef: EXP-2026/09\n\nThis is to certify that ${bidderName} has successfully\nexecuted petroleum equipment maintenance services for our refineries.\n\nWork Description: Annual Maintenance of High-Pressure Petroleum Pumps\nCommencement Date: ${startYMD}\nCompletion Date: ${endYMD}\n\nTheir performance during the contract period was highly satisfactory.\n\nChief Engineer (Maintenance)\nHPCL`,
    json: `{"bidderName":"${bidderName}","buyerName":"HPCL","workDescription":"Annual Maintenance of High-Pressure Petroleum Pumps","commencementDate":"${startYMD}","actualCompletionDate":"${endYMD}"}`
  };
}

function buildWorkOrderContent(bidderName, orderValueRaw) {
  return {
    text: `WORK ORDER / PAST PERFORMANCE\nOil and Natural Gas Corporation (ONGC)\n\nWork Order No: ONGC/WO/2025/112\nDate: 2025-02-10\nTo: ${bidderName}\n\nWe are pleased to award the work order for the supply and maintenance\nof industrial valves and testing equipment.\n\nDescription: Supply & Servicing of Petroleum Testing Equipment\nTotal Order Value (INR): Rs ${orderValueRaw}\n\nPlease acknowledge receipt and commence work as per schedule.\n\nProcurement Manager\nONGC`,
    json: `{"supplierName":"${bidderName}","purchaserOrganization":"ONGC","purchaseOrderNumber":"ONGC/WO/2025/112","totalOrderValue":${orderValueRaw},"product":"Petroleum Testing Equipment"}`
  };
}

async function runSeeding() {
  await connectDB();
  console.log("Clearing existing specific demo data for Petroleum...");
  await Tender.deleteMany({ title: "Provision of Petroleum Equipment Maintenance, Inspection and Technical Support Services" });
  await SellerProfile.deleteMany({ companyName: { $in: ["PetroTech Solutions", "Bharat Oil & Gas Services", "Global DrillCorp"] } });
  
  console.log("Creating Petroleum Tender...");
  const tender = await Tender.create({
    tenderId: "GEM/2026/P/PETRO002",
    title: "Provision of Petroleum Equipment Maintenance, Inspection and Technical Support Services",
    department: "Indian Oil Corporation Limited (IOCL)",
    eligibilityRules: {
      msmePreference: true,
      makeInIndiaMinPercent: 60, // 60%
      oemAuthorizationRequired: true,
      nsicEmdWaiverApplicable: false,
      minTurnoverLakhs: 500, // 5 Crore
      startupIndiaRelaxation: false,
      minExperienceYears: 3, // 3 Years
      pastPerformanceMinValueLakhs: 200, // 2 Crore
    },
    documentRequirements: [
      { documentType: "OEM_AUTHORIZATION_CERTIFICATE", requirements: [] },
      { documentType: "MII_CERTIFICATE", requirements: [{ rule: "MIN_PERCENT", targetField: "localContentPercent" }] },
      { documentType: "EXPERIENCE_CRITERIA", requirements: [{ rule: "MIN_DURATION_YEARS", startField: "commencementDate", endField: "actualCompletionDate" }] },
      { documentType: "PAST_PERFORMANCE", requirements: [{ rule: "MIN_VALUE", targetField: "totalOrderValue" }] },
      { documentType: "BIDDER_TURNOVER", requirements: [{ rule: "MIN_VALUE", targetField: "turnoverLakhs" }] }
    ],
    bidSubmissionDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  });

  const biddersData = [
    {
      name: "PetroTech Solutions",
      pan: "PETRO1234F", gstin: "27PETRO1234F1Z5", cin: "U12345MH2010PTC123456",
      docs: {
        turnoverLakhs: 850,
        mii: 80,
        expStart: "2020-01-01", expEnd: "2024-01-01", // 4 years
        woValue: 30000000, // 300 Lakhs
      }
    },
    {
      name: "Bharat Oil & Gas Services", // MAIN DEMO BIDDER ~70 Score
      pan: "BHART9876G", gstin: "27BHART9876G1Z9", cin: "U98765MH2015PTC987654",
      docs: {
        turnoverLakhs: 480, // FAIL (Warning conceptually, but Engine triggers Major deduction -15)
        mii: 65, // PASS
        expStart: "2022-01-01", expEnd: "2026-07-01", // 4.5 years (PASS)
        woValue: 19500000, // 195 Lakhs FAIL (Major deduction -15)
      }
    },
    {
      name: "Global DrillCorp", // LOW SCORE BIDDER
      pan: "GLOBE4567H", gstin: "27GLOBE4567H1Z2", cin: "U45678MH2020PTC456789",
      docs: {
        turnoverLakhs: 150, // FAIL
        mii: 30, // FAIL
        expStart: "2024-01-01", expEnd: "2025-07-01", // 1.5 years FAIL
        woValue: 5000000, // 50 Lakhs FAIL
      }
    }
  ];

  for (let i = 0; i < biddersData.length; i++) {
    const b = biddersData[i];
    console.log(`\nProcessing Bidder: ${b.name}`);

    // Create Seller Profile
    const profile = await SellerProfile.create({
      companyName: b.name,
      panNumber: b.pan,
      gstin: b.gstin,
      cin: b.cin,
      registrationVerifiedAt: new Date(),
    });

    // Create Bid Submission
    const bid = await BidSubmission.create({
      tender: tender._id,
      sellerProfile: profile._id,
      declaredTurnoverLakhs: b.docs.turnoverLakhs,
      declaredLocalContentPercent: b.docs.mii,
    });

    const docTypes = [
      { type: "OEM_AUTHORIZATION_CERTIFICATE", content: buildOemAuthContent(b.name, "Global Petroleum Equipments", "Petroleum Testing Equipment"), filename: `oem_${i}.pdf` },
      { type: "MII_CERTIFICATE", content: buildMiiContent(b.name, b.docs.mii, "Petroleum Testing Equipment"), filename: `mii_${i}.pdf` },
      { type: "BIDDER_TURNOVER", content: buildTurnoverContent(b.name, b.docs.turnoverLakhs), filename: `turnover_${i}.pdf` },
      { type: "EXPERIENCE_CRITERIA", content: buildExperienceContent(b.name, b.docs.expStart, b.docs.expEnd), filename: `exp_${i}.pdf` },
      { type: "PAST_PERFORMANCE", content: buildWorkOrderContent(b.name, b.docs.woValue), filename: `wo_${i}.pdf` }
    ];

    for (const dt of docTypes) {
      console.log(` Generating ${dt.type}...`);
      await generatePDF(dt.content.text, dt.content.json, dt.filename);
      
      const reqPath = path.join(__dirname, 'uploads', dt.filename);
      // Process using OCR service
      const tenderDocReq = tender.documentRequirements.find(r => r.documentType === dt.type);
      const ocrResult = await processDocument(reqPath, dt.type, "TENDER_SPECIFIC", tenderDocReq);
      
      // Save Document
      await Document.create({
        sellerProfile: profile._id,
        bidSubmission: bid._id,
        documentCategory: "TENDER_SPECIFIC",
        docType: dt.type,
        filePath: dt.filename,
        originalFilename: dt.filename,
        extractedFields: ocrResult.extractedFields,
        ocrConfidence: ocrResult.ocrConfidence,
        verificationStatus: ocrResult.verificationStatus,
      });
    }

    // Run full compliance logic
    console.log(` Running Compliance Engine for ${b.name}...`);
    await runBidSubmissionChecks(bid, profile);
    await calculateComplianceScore(bid._id);
  }

  console.log("\n✅ Seeding of Petroleum Tender & Bidders Complete!");
  process.exit(0);
}

runSeeding().catch(err => {
  console.error(err);
  process.exit(1);
});
