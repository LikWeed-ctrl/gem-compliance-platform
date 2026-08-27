import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import TenderList from "./pages/TenderList";
import BidderList from "./pages/BidderList";
import BidderDetail from "./pages/BidderDetail";
import CreateTender from "./pages/CreateTender";
import BidderSignup from "./pages/BidderSignup";
import BidderLogin from "./pages/BidderLogin";
import BidderDashboard from "./pages/BidderDashboard";
import TenderApply from "./pages/TenderApply";

function GovHeader() {
  return (
    <>
      {/* Tricolor Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
      
      {/* Top Utility Bar */}
      <div className="bg-[#1a1a1a] text-white text-[11px] px-6 py-1.5 flex justify-end items-center opacity-90 tracking-wide">
        <div className="flex gap-4 hidden sm:flex">
          <span className="cursor-pointer hover:underline">Skip to main content</span>
          <span className="cursor-pointer hover:underline">A- | A | A+</span>
          <span className="cursor-pointer hover:underline">English / हिन्दी</span>
        </div>
      </div>
    </>
  );
}

function GlobalFooter() {
  return (
    <footer className="bg-[#1a1a1a] text-slate-400 py-8 text-sm mt-auto border-t-4 border-[#000080]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-xs">About GeM</h4>
          <p className="leading-relaxed">Government e-Marketplace is the National Public Procurement Portal; an end-to-end online Marketplace for Central and State Government Ministries.</p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-xs">Help & Support</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-white transition-colors">Toll Free: 1800-419-3436</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Raise a Ticket</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Training & FAQs</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-xs">Policies</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-white transition-colors">Terms of Use</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Incident Management</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 mt-8 pt-4 border-t border-slate-700 text-center text-xs">
        © {new Date().getFullYear()} Government e-Marketplace (GeM). All rights reserved.
      </div>
    </footer>
  );
}

function OfficerLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans flex flex-col">
      <GovHeader />
      <nav className="bg-[#000080] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-md border-b-4 border-[#FF9933]">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-full h-10 w-10 flex items-center justify-center text-[#000080] font-bold text-xl shadow-inner border border-slate-200">
            ⚖️
          </div>
          <div>
            <Link to="/officer" className="font-bold text-xl tracking-wide uppercase block">
              GeM Procurement Portal
            </Link>
            <span className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Nodal Officer Dashboard</span>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/officer/tenders/new" className="bg-[#FF9933] hover:bg-[#e68a2e] text-white text-sm px-5 py-2.5 rounded shadow font-semibold transition-colors uppercase tracking-wide">
            + Publish New Tender
          </Link>
        </div>
      </nav>
      <main className="pb-12 flex-grow">
        {children}
      </main>
      <GlobalFooter />
    </div>
  );
}

function BidderLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
      <GovHeader />
      <nav className="bg-gradient-to-r from-[#003366] to-[#004080] text-white px-6 py-4 flex justify-between items-center shadow-md border-b-4 border-[#138808]">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded h-10 w-10 flex items-center justify-center text-[#003366] font-bold text-xl shadow-inner">
            🏢
          </div>
          <div>
            <Link to="/bidder/dashboard" className="font-bold text-xl tracking-wide uppercase block">
              GeM Bidder Services
            </Link>
            <span className="text-xs text-green-300 uppercase tracking-widest font-semibold">Vendor Application Portal</span>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem("sellerProfileId"); window.location.href = "/bidder/login"; }} className="text-sm px-4 py-1.5 border border-white/30 rounded hover:bg-white/10 transition-colors uppercase font-medium">
          Secure Logout
        </button>
      </nav>
      <main className="pb-12 flex-grow">
        {children}
      </main>
      <GlobalFooter />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Officer Routes */}
        <Route path="/officer" element={<OfficerLayout><TenderList /></OfficerLayout>} />
        <Route path="/officer/tenders/new" element={<OfficerLayout><CreateTender /></OfficerLayout>} />
        <Route path="/officer/tenders/:tenderId" element={<OfficerLayout><BidderList /></OfficerLayout>} />
        <Route path="/officer/bidders/:id" element={<OfficerLayout><BidderDetail /></OfficerLayout>} />

        {/* Bidder Routes */}
        <Route path="/bidder/login" element={<BidderLogin />} />
        <Route path="/bidder/signup" element={<BidderSignup />} />
        <Route path="/bidder/dashboard" element={<BidderLayout><BidderDashboard /></BidderLayout>} />
        <Route path="/bidder/tender/:tenderId/apply" element={<BidderLayout><TenderApply /></BidderLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;