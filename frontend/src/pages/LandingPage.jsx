import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col">
      {/* Top Gov Header */}
      <div className="h-1 w-full bg-gradient-to-r from-warning via-white to-success"></div>
      <div className="bg-navy-900 text-neutral-500 text-[11px] px-8 py-2 flex justify-end items-center tracking-wide font-mono">
        <div className="flex gap-6">
          <span className="cursor-pointer hover:text-white transition-colors">Skip to main content</span>
          <span className="cursor-pointer hover:text-white transition-colors">English / हिन्दी</span>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-neutral-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-navy-800 rounded-md h-12 w-12 flex items-center justify-center text-gold-500 text-xl font-bold border border-navy-900/10">
            G
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 uppercase tracking-wide">GeM Compliance Platform</h1>
            <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">SMART PROCUREMENT PLATFORM</p>
          </div>
        </div>
        <div className="flex gap-6">
          <a href="#about" className="text-sm font-semibold text-neutral-500 hover:text-navy-900 transition-colors">About</a>
          <a href="#tenders" className="text-sm font-semibold text-neutral-500 hover:text-navy-900 transition-colors">Active Tenders</a>
          <a href="#contact" className="text-sm font-semibold text-neutral-500 hover:text-navy-900 transition-colors">Contact Us</a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-navy-900 text-white flex-grow flex items-center pt-24 pb-32">
        <div className="relative w-full max-w-7xl mx-auto px-8 flex flex-col items-center text-center">
          <span className="border border-gold-600/30 text-gold-500 text-[10px] font-mono px-3 py-1 rounded-full tracking-widest mb-8 uppercase bg-gold-600/10">
            Secure Platform
          </span>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
            AI-Powered Bid Compliance <br/> Verification Platform for GeM
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mb-16 font-light">
            Multi-portal verification, automated compliance, and human decision governance ensuring transparent and fair public procurement.
          </p>

          <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl justify-center">
            {/* Officer Portal Card */}
            <div className="flex-1 bg-white rounded-xl p-8 text-left shadow-2xl border border-neutral-200 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-navy-800"></div>
              <div className="w-12 h-12 rounded-lg bg-navy-50 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-navy-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-2">Administrative</span>
              <h3 className="text-xl font-bold text-navy-900 mb-3">Procurement Officer Portal</h3>
              <p className="text-sm text-neutral-500 mb-8 flex-grow">Access the compliance command center, review AI verification findings, and record statutory decisions.</p>
              <Link to="/officer" className="w-full bg-navy-800 text-white text-center py-3 rounded-md font-semibold hover:bg-navy-900 transition-colors">
                Open Dashboard →
              </Link>
            </div>

            {/* Bidder Portal Card */}
            <div className="flex-1 bg-white rounded-xl p-8 text-left shadow-2xl border border-neutral-200 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-success"></div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-2">Vendor</span>
              <h3 className="text-xl font-bold text-navy-900 mb-3">Secure Bidder Portal</h3>
              <p className="text-sm text-neutral-500 mb-8 flex-grow">Submit bids, upload verifiable documents, and track compliance status in a secure environment.</p>
              <Link to="/bidder/login" className="w-full border-2 border-navy-800 text-navy-900 text-center py-2.5 rounded-md font-semibold hover:bg-navy-50 transition-colors">
                Secure Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Section */}
      <div className="bg-neutral-50 py-20 border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-8">
          <div className="bg-navy-800 rounded-xl p-10 text-center shadow-lg border border-navy-900 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gold-600"></div>
             <h3 className="text-gold-500 font-mono text-xs tracking-widest uppercase mb-4">Core Safety & Governance Architecture</h3>
             <h4 className="text-2xl font-bold text-white mb-6">Deterministic Rules Decide Facts — AI Generates Reasoning</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                <div className="text-left border-l-2 border-navy-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">Statutory Verification</h5>
                  <p className="text-sm text-neutral-400">Strict rule-engine checking against mock public registries and compliance requirements.</p>
                </div>
                <div className="text-left border-l-2 border-navy-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">AI Discrepancy Engine</h5>
                  <p className="text-sm text-neutral-400">Analyzes semantic mismatches and generates human-readable advisory reasoning.</p>
                </div>
                <div className="text-left border-l-2 border-navy-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">Human Governance</h5>
                  <p className="text-sm text-neutral-400">Final administrative decisions remain firmly with the authorized Procurement Officer.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default LandingPage;
