const puppeteer = require('puppeteer');
const fs = require('fs');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
    h1 { color: #1e3a8a; text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
    h2 { color: #2563eb; margin-top: 30px; }
    h3 { color: #475569; margin-bottom: 5px; }
    .team-member { margin-bottom: 25px; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
    ul { margin-top: 5px; }
    li { margin-bottom: 4px; font-family: monospace; font-size: 14px; }
    .role-title { font-weight: bold; color: #0f172a; }
  </style>
</head>
<body>
  <h1>Project Code Ownership & File Distribution</h1>
  <p>This document outlines the division of files and responsibilities among the 6 team members for the GeM Compliance Verification Platform.</p>
  
  <h2>Frontend Team (2 Members)</h2>
  
  <div class='team-member'>
    <div class='role-title'>Team Member 1 (Frontend Architecture & Integration)</div>
    <p>Responsible for complex state management, routing, API integrations, and dynamic dashboards.</p>
    <ul>
      <li>frontend/src/App.jsx (Routing)</li>
      <li>frontend/src/components/Layout.jsx (Stateful Navigation)</li>
      <li>frontend/src/pages/BidderDetail.jsx (Complex AI Dashboard & Timeline)</li>
      <li>frontend/src/api/*.js (Backend Communication)</li>
      <li>frontend/vite.config.js & package.json</li>
    </ul>
  </div>

  <div class='team-member'>
    <div class='role-title'>Team Member 2 (UI/UX Development)</div>
    <p>Responsible for building responsive user interfaces, forms, static pages, and CSS styling.</p>
    <ul>
      <li>frontend/src/pages/LandingPage.jsx</li>
      <li>frontend/src/pages/BidderLogin.jsx & BidderSignup.jsx</li>
      <li>frontend/src/pages/CreateTender.jsx</li>
      <li>frontend/src/pages/OfficerDashboard.jsx</li>
      <li>frontend/src/index.css & App.css</li>
      <li>frontend/tailwind.config.js</li>
    </ul>
  </div>

  <h2>Backend Team (4 Members)</h2>

  <div class='team-member'>
    <div class='role-title'>Team Member 3 (Core AI & Orchestration Engine)</div>
    <p>Responsible for the central verification logic, AI integration, scoring mathematics, and OCR pipeline.</p>
    <ul>
      <li>backend/services/verificationOrchestrator.js</li>
      <li>backend/services/recommendationEngine.js (Groq AI)</li>
      <li>backend/services/scoringEngine.js</li>
      <li>backend/services/ruleEngine.js</li>
      <li>backend/services/documentExtractor.js (Tesseract/OCR)</li>
    </ul>
  </div>

  <div class='team-member'>
    <div class='role-title'>Team Member 4 (Database Architecture & Schema Design)</div>
    <p>Responsible for designing MongoDB schemas, data relationships, and synthetic data generation.</p>
    <ul>
      <li>backend/models/BidSubmission.js & SellerProfile.js</li>
      <li>backend/models/Tender.js & Document.js</li>
      <li>backend/models/AuditLog.js & ComplianceCheck.js</li>
      <li>backend/config/db.js</li>
      <li>backend/seed.js (Data Seeding)</li>
    </ul>
  </div>

  <div class='team-member'>
    <div class='role-title'>Team Member 5 (API Routing & Business Logic Controllers)</div>
    <p>Responsible for the REST API structure, handling client requests, and server configuration.</p>
    <ul>
      <li>backend/server.js</li>
      <li>backend/routes/bidderRoutes.js & tenderRoutes.js</li>
      <li>backend/routes/documentRoutes.js</li>
      <li>backend/controllers/bidderController.js</li>
      <li>backend/controllers/tenderController.js</li>
      <li>backend/controllers/sellerProfileController.js</li>
    </ul>
  </div>

  <div class='team-member'>
    <div class='role-title'>Team Member 6 (External API Integration & Mock Services)</div>
    <p>Responsible for government API simulations, third-party integrations (RapidAPI), and file upload handling.</p>
    <ul>
      <li>backend/mock_services/gstService.js (RapidAPI)</li>
      <li>backend/mock_services/panService.js & udyamService.js</li>
      <li>backend/mock_services/registryMock.js</li>
      <li>backend/mock_services/synthetic_data/*</li>
      <li>backend/controllers/documentController.js (Multer)</li>
    </ul>
  </div>
</body>
</html>
`;

fs.writeFileSync('temp.html', htmlContent);

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd().replace(/\\/g, '/') + '/temp.html', {waitUntil: 'networkidle0'});
  await page.pdf({ path: 'C:/Users/agarw/.gemini/antigravity/brain/245fbb37-bc2c-4007-a8f4-7e0b54d4bcf2/Team_Code_Ownership.pdf', format: 'A4', printBackground: true });
  await browser.close();
  fs.unlinkSync('temp.html');
  console.log('PDF Generated');
})();
