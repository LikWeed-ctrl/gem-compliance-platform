require('dotenv').config();
const mongoose = require('mongoose');

const sensibleNames = [
  "EPC of 5MW Solar Plant - IOCL Panipat",
  "SITC of SCADA Systems for Pipelines",
  "CAMC for IT Infrastructure - N. Railways",
  "Hiring of 50 MT Cranes - ONGC Uran",
  "Procurement of Centrifugal Pumps - Barauni",
  "24x7 Security Services - NTPC Ramagundam",
  "Empanelment of Ad Agencies - MoPNG",
  "Supply of Lubricants & Oils - HEMM",
  "Turnkey Pipeline Integrity Mgmt (PIM)",
  "Construction of Residential Quarters - IOCL",
  "Supply & Laying of OFC Network - RailTel",
  "Housekeeping & Catering - ONGC Mumbai",
  "Supply of CS Seamless Pipes - Haldia",
  "Third Party Inspection Services (TPI)",
  "Procurement of HSD for Captive Power - SAIL"
];

async function updateNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const Tender = require('./models/Tender'); // assuming models/Tender.js exists
    
    const tenders = await Tender.find({});
    console.log(`Found ${tenders.length} tenders to update.`);

    for (let i = 0; i < tenders.length; i++) {
      const nameIndex = i % sensibleNames.length;
      tenders[i].title = sensibleNames[nameIndex];
      await tenders[i].save();
    }
    
    console.log("Tender names updated successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating tender names:", error);
    process.exit(1);
  }
}

updateNames();
