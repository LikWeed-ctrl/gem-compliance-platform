import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import TenderList from "./pages/TenderList";
import BidderList from "./pages/BidderList";
import BidderDetail from "./pages/BidderDetail";
import CreateTender from "./pages/CreateTender";
import BidderSignup from "./pages/BidderSignup";
import BidderLogin from "./pages/BidderLogin";
import OfficerLogin from "./pages/OfficerLogin";
import OfficerSignup from "./pages/OfficerSignup";
import BidderDashboard from "./pages/BidderDashboard";
import TenderApply from "./pages/TenderApply";
import Layout from "./components/Layout";

function GovHeader() {
  return (
    <>
      {/* Tricolor Strip - Slimmer for premium feel */}
      <div className="h-1 w-full bg-gradient-to-r from-warning via-white to-success"></div>
    </>
  );
}

function BidderLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col">
      <GovHeader />
      <nav className="bg-slate-800 text-white px-8 py-5 flex justify-between items-center border-b border-slate-900 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-success/10 p-2 rounded-lg border border-success/20 flex items-center justify-center text-success">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <Link to="/bidder/dashboard" className="font-semibold text-lg tracking-wide text-white block">
              Vendor Application Portal
            </Link>
            <span className="text-xs text-success uppercase tracking-widest font-mono">Secure Connection</span>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem("sellerProfileId"); window.location.href = "/bidder/login"; }} className="text-sm px-5 py-2 border border-neutral-500/30 rounded-md hover:bg-slate-900 transition-colors uppercase tracking-wide text-neutral-300">
          Secure Logout
        </button>
      </nav>
      <main className="pb-16 flex-grow">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Officer Routes */}
        <Route path="/officer/login" element={<OfficerLogin />} />
        <Route path="/officer/signup" element={<OfficerSignup />} />
        <Route path="/officer" element={<Layout><TenderList /></Layout>} />
        <Route path="/officer/tenders/new" element={<Layout><CreateTender /></Layout>} />
        <Route path="/officer/tenders/:tenderId" element={<Layout><BidderList /></Layout>} />
        <Route path="/officer/bidders/:id" element={<Layout><BidderDetail /></Layout>} />

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
