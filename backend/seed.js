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
    title: "Supply and Installation of Office Furniture — Regional Offices",
    department: "Ministry of Railways",
    eligibilityRules: {
      msmePreference: true,
      makeInIndiaMinPercent: 50,
      oemAuthorizationRequired: false,
      nsicEmdWaiverApplicable: true,
      minTurnoverLakhs: 50,
      startupIndiaRelaxation: true,
    },
    bidSubmissionDeadline: new Date("2026-12-31"),
    isActive: true,
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