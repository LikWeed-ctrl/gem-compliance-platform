require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const Tender = require("./models/Tender");
const SellerProfile = require("./models/SellerProfile");
const BidSubmission = require("./models/BidSubmission");
const ComplianceCheck = require("./models/ComplianceCheck");
const AuditLog = require("./models/AuditLog");

const { loadCompanies } = require("./mock_services/dataLoader");

async function seed() {
  await connectDB();

  console.log("Clearing existing demo data...");
  await Tender.deleteMany({});
  await SellerProfile.deleteMany({});
  await BidSubmission.deleteMany({});
  await ComplianceCheck.deleteMany({});
  await AuditLog.deleteMany({});

  console.log("Creating demo tender...");
  const tender = await Tender.create({
    tenderId: "GEM/2026/B/DEMO001",
    title: "Supply and Installation of Office Furniture – Regional Offices",
    department: "Ministry of Railways",
    eligibilityRules: {
      msmePreference: true,
      makeInIndiaMinPercent: 50,
      oemAuthorizationRequired: true,
      nsicEmdWaiverApplicable: true,
      minTurnoverLakhs: 150,
      startupIndiaRelaxation: false,
      minExperienceYears: 3,
      pastPerformanceMinValueLakhs: 80,
    },
    documentRequirements: [
      {
        documentType: "EXPERIENCE_CRITERIA",
        requirements: [
          { rule: "MIN_COMPLETED_VALUE", targetField: "completedValue" },
          { rule: "SIMILAR_WORK_REQUIRED", isSemantic: true }
        ],
        extractionSchema: {
          fields: [
            { name: "bidderName", type: "string", description: "Name of the contractor or bidder mentioned in the certificate", required: true },
            { name: "bidderAddress", type: "string", description: "Address of the bidder", required: false },
            { name: "gstin", type: "string", description: "GSTIN of the bidder", required: false },
            { name: "pan", type: "string", description: "PAN of the bidder", required: false },
            { name: "issuingOrganization", type: "string", description: "Name of the organization issuing the certificate", required: true },
            { name: "certificateNumber", type: "string", description: "Certificate reference number", required: false },
            { name: "certificateIssueDate", type: "date", description: "Date the certificate was issued", required: false },
            { name: "issuingOfficer", type: "string", description: "Name of the officer issuing the certificate", required: false },
            { name: "officerDesignation", type: "string", description: "Designation of the issuing officer", required: false },
            { name: "workName", type: "string", description: "Name or title of the work", required: false },
            { name: "workDescription", type: "string", description: "Description of the completed work", required: true },
            { name: "workOrderNumber", type: "string", description: "Work order or contract number", required: false },
            { name: "workOrderDate", type: "date", description: "Date of the work order", required: false },
            { name: "commencementDate", type: "date", description: "Date the work commenced", required: false },
            { name: "scheduledCompletionDate", type: "date", description: "Scheduled completion date", required: false },
            { name: "actualCompletionDate", type: "date", description: "Actual completion date", required: false },
            { name: "contractValue", type: "number", description: "Original value of the contract", required: false },
            { name: "completedValue", type: "number", description: "Value of work actually completed", required: false },
            { name: "quantity", type: "number", description: "Quantity of items supplied or installed", required: false },
            { name: "completionStatus", type: "string", description: "Status of completion (e.g., completed, ongoing)", required: false },
            { name: "performanceStatus", type: "string", description: "Performance evaluation (e.g., satisfactory)", required: false },
            { name: "remarks", type: "string", description: "Any additional remarks", required: false }
          ]
        }
      },
      {
        documentType: "PAST_PERFORMANCE",
        requirements: [
          { rule: "MIN_VALUE", targetField: "totalOrderValue" }
        ],
        extractionSchema: {
          fields: [
            { name: "supplierName", type: "string", description: "Name of the supplier", required: true },
            { name: "supplierAddress", type: "string", description: "Address of the supplier", required: false },
            { name: "gstin", type: "string", description: "GSTIN of the supplier", required: false },
            { name: "purchaserOrganization", type: "string", description: "Name of the purchaser organization", required: true },
            { name: "certificateNumber", type: "string", description: "Certificate reference number", required: false },
            { name: "certificateDate", type: "date", description: "Date of the certificate", required: false },
            { name: "issuingOfficer", type: "string", description: "Name of the officer issuing the certificate", required: false },
            { name: "officerDesignation", type: "string", description: "Designation of the issuing officer", required: false },
            { name: "purchaseOrderNumber", type: "string", description: "Purchase order number", required: false },
            { name: "orderDate", type: "date", description: "Date of the purchase order", required: false },
            { name: "product", type: "string", description: "Product supplied", required: true },
            { name: "model", type: "string", description: "Model of the product", required: false },
            { name: "description", type: "string", description: "Description of the product or service", required: false },
            { name: "quantityOrdered", type: "number", description: "Quantity ordered", required: false },
            { name: "quantitySupplied", type: "number", description: "Quantity actually supplied", required: false },
            { name: "totalOrderValue", type: "number", description: "Value of the order", required: false },
            { name: "supplyStartDate", type: "date", description: "Date supply started", required: false },
            { name: "supplyEndDate", type: "date", description: "Date supply ended", required: false },
            { name: "deliveryStatus", type: "string", description: "Status of delivery (e.g., on time)", required: false },
            { name: "qualityStatus", type: "string", description: "Quality evaluation", required: false },
            { name: "rejectionDetails", type: "string", description: "Details of any rejections", required: false },
            { name: "supportStatus", type: "string", description: "Status of post-delivery support", required: false },
            { name: "overallPerformance", type: "string", description: "Overall performance evaluation (e.g., satisfactory)", required: false },
            { name: "remarks", type: "string", description: "Additional remarks", required: false }
          ]
        }
      },
      {
        documentType: "OEM_AUTHORIZATION_CERTIFICATE",
        requirements: [
          { rule: "AUTHORIZATION_SCOPE", isSemantic: true }
        ],
        extractionSchema: {
          fields: [
            { name: "oemName", type: "string", description: "Name of the Original Equipment Manufacturer", required: true },
            { name: "oemAddress", type: "string", description: "Address of the OEM", required: false },
            { name: "bidderName", type: "string", description: "Name of the authorized bidder", required: true },
            { name: "bidderAddress", type: "string", description: "Address of the bidder", required: false },
            { name: "tenderNumber", type: "string", description: "Tender number for which authorization is granted", required: false },
            { name: "tenderTitle", type: "string", description: "Title or subject of the tender", required: false },
            { name: "authorizationDate", type: "date", description: "Date the authorization was issued", required: false },
            { name: "product", type: "string", description: "Product covered by the authorization", required: true },
            { name: "model", type: "string", description: "Specific model covered", required: false },
            { name: "authorizationScope", type: "string", description: "Scope of the authorization (e.g., sales, service)", required: false },
            { name: "authorizationStatus", type: "string", description: "Status of authorization", required: false },
            { name: "validityStart", type: "date", description: "Start date of authorization validity", required: false },
            { name: "validityEnd", type: "date", description: "End date of authorization validity", required: false },
            { name: "warrantyCommitment", type: "boolean", description: "Whether the OEM commits to warranty", required: false },
            { name: "supportCommitment", type: "boolean", description: "Whether the OEM commits to support", required: false },
            { name: "authorizedSignatory", type: "string", description: "Name of the OEM's authorized signatory", required: false },
            { name: "signatoryDesignation", type: "string", description: "Designation of the signatory", required: false },
            { name: "contactDetails", type: "string", description: "Contact details of the OEM", required: false }
          ]
        }
      },
      {
        documentType: "MII_CERTIFICATE",
        requirements: [
          { rule: "MIN_PERCENT", targetField: "localContentPercent" }
        ],
        extractionSchema: {
          fields: [
            { name: "bidderName", type: "string", description: "Name of the bidder declaring MII compliance", required: true },
            { name: "tenderNumber", type: "string", description: "Tender reference number", required: false },
            { name: "tenderTitle", type: "string", description: "Title of the tender", required: false },
            { name: "product", type: "string", description: "Product being offered", required: true },
            { name: "model", type: "string", description: "Model of the product", required: false },
            { name: "localContentPercent", type: "number", description: "Percentage of local content", required: true },
            { name: "importedContentPercent", type: "number", description: "Percentage of imported content", required: false },
            { name: "supplierClassification", type: "string", description: "Classification (e.g., Class-I, Class-II Local Supplier)", required: false },
            { name: "valueAdditionLocation", type: "string", description: "Location where local value addition is made", required: false },
            { name: "calculationBasis", type: "string", description: "Basis of local content calculation", required: false },
            { name: "declarationText", type: "string", description: "The full text of the declaration", required: false },
            { name: "certificationRequired", type: "boolean", description: "Whether external certification was required", required: false },
            { name: "certificationDetails", type: "string", description: "Details of any external certification", required: false },
            { name: "authorizedSignatory", type: "string", description: "Name of the signatory", required: false },
            { name: "designation", type: "string", description: "Designation of the signatory", required: false },
            { name: "declarationDate", type: "date", description: "Date of the declaration", required: false }
          ]
        }
      },
      {
        documentType: "WORK_ORDER",
        requirements: [],
        extractionSchema: {
          fields: [
            { name: "purchaserOrganization", type: "string", description: "Organization issuing the work order", required: true },
            { name: "purchaserAddress", type: "string", description: "Address of the purchaser", required: false },
            { name: "supplierName", type: "string", description: "Name of the supplier receiving the order", required: true },
            { name: "supplierAddress", type: "string", description: "Address of the supplier", required: false },
            { name: "gstin", type: "string", description: "GSTIN of the supplier", required: false },
            { name: "workOrderNumber", type: "string", description: "Work order reference number", required: false },
            { name: "purchaseOrderNumber", type: "string", description: "Purchase order number", required: false },
            { name: "orderDate", type: "date", description: "Date the order was issued", required: false },
            { name: "product", type: "string", description: "Product or service ordered", required: true },
            { name: "model", type: "string", description: "Model of the product", required: false },
            { name: "description", type: "string", description: "Description of the items", required: false },
            { name: "quantity", type: "number", description: "Quantity ordered", required: false },
            { name: "unitPrice", type: "number", description: "Price per unit", required: false },
            { name: "totalOrderValue", type: "number", description: "Total monetary value of the order", required: false },
            { name: "deliveryLocation", type: "string", description: "Location for delivery", required: false },
            { name: "deliverySchedule", type: "string", description: "Schedule or timeline for delivery", required: false },
            { name: "warranty", type: "string", description: "Warranty terms", required: false },
            { name: "installation", type: "string", description: "Installation terms or requirements", required: false },
            { name: "commissioning", type: "string", description: "Commissioning terms", required: false },
            { name: "issuingOfficer", type: "string", description: "Name of the officer issuing the order", required: false },
            { name: "officerDesignation", type: "string", description: "Designation of the issuing officer", required: false },
            { name: "contactDetails", type: "string", description: "Contact details for the purchaser", required: false }
          ]
        }
      }
    ],
    requiredDocuments: [
      "EXPERIENCE_CRITERIA",
      "PAST_PERFORMANCE",
      "BIDDER_TURNOVER",
      "OEM_AUTHORIZATION_CERTIFICATE",
      "MII_CERTIFICATE",
      "WORK_ORDER"
    ],
    bidSubmissionDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
  });

  console.log("Loading synthetic companies...");
  const companies = loadCompanies();

  const scenarioOverrides = {
    fully_compliant: { declaredLocalContentPercent: 65, declaredTurnoverLakhs: 120 },
    gst_returns_lapsed: { declaredLocalContentPercent: 55, declaredTurnoverLakhs: 80 },
    name_mismatch: { declaredLocalContentPercent: 60, declaredTurnoverLakhs: 90 },
    proprietorship_msme: { declaredLocalContentPercent: 70, declaredTurnoverLakhs: 30 },
    blacklisted: { declaredLocalContentPercent: 60, declaredTurnoverLakhs: 100 },
    startup_india_recognized: { declaredLocalContentPercent: 45, declaredTurnoverLakhs: 20 },
    gst_cancelled: { declaredLocalContentPercent: 55, declaredTurnoverLakhs: 60 },
    nsic_registered: { declaredLocalContentPercent: 58, declaredTurnoverLakhs: 75 },
    epfo_mismatch: { declaredLocalContentPercent: 52, declaredTurnoverLakhs: 65 },
    expired_udyam: { declaredLocalContentPercent: 48, declaredTurnoverLakhs: 40 },
    oem_authorized: { declaredLocalContentPercent: 62, declaredTurnoverLakhs: 150 },
    missing_documents: { declaredLocalContentPercent: null, declaredTurnoverLakhs: null },
    low_turnover: { declaredLocalContentPercent: 60, declaredTurnoverLakhs: 15 },
    make_in_india_declared_low: { declaredLocalContentPercent: 35, declaredTurnoverLakhs: 85 },
  };

  console.log(`Creating ${companies.length} seller profiles and bids...`);
  const createdSubmissions = [];

  for (const company of companies) {
    const overrides = scenarioOverrides[company.scenario] || {};

    const profile = await SellerProfile.create({
      companyName: company.company_name,
      panNumber: company.pan,
      gstin: company.gstin,
      udyamNumber: company.udyam_number,
      cin: company.cin,
      epfoEstablishmentId: company.epfo_establishment_id,
      esicNumber: company.esic_number,
      registrationVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // verified 30 days ago
    });

    const bid = await BidSubmission.create({
      tender: tender._id,
      sellerProfile: profile._id,
      declaredLocalContentPercent: overrides.declaredLocalContentPercent ?? null,
      declaredTurnoverLakhs: overrides.declaredTurnoverLakhs ?? null,
    });

    await AuditLog.create({
      sellerProfile: profile._id,
      bidSubmission: bid._id,
      tender: tender._id,
      actionType: "DOCUMENT_UPLOADED",
      actor: "system",
      actorRole: "SYSTEM",
      description: `[SEED DATA] BidSubmission record created for ${profile.companyName}`,
    });

    createdSubmissions.push(bid);
    console.log(`  ✓ ${company.company_name} (${company.scenario})`);
  }

  console.log("\nSeed complete.");
  console.log(`Tender ID: ${tender._id}`);
  console.log(`${createdSubmissions.length} bids created.`);

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});