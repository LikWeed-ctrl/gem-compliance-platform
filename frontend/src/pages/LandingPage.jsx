import { Link } from "react-router-dom";
import heroBg from "../assets/hero-bg.png";

function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col">
      {/* Top Gov Header */}
      <div className="h-1 w-full bg-gradient-to-r from-warning via-white to-success"></div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-neutral-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 rounded-md h-12 w-12 flex items-center justify-center text-gold-500 text-xl font-bold border border-slate-900/10">
            G
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">GeM Compliance Platform</h1>
            <p className="text-[10px] text-neutral-500 font-sans tracking-widest uppercase font-semibold">SMART PROCUREMENT PLATFORM</p>
          </div>
        </div>
        <div className="flex gap-6">
          <a href="#about" className="text-sm font-semibold text-neutral-500 hover:text-slate-900 transition-colors">About</a>
          <a href="#contact" className="text-sm font-semibold text-neutral-500 hover:text-slate-900 transition-colors">Contact Us</a>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        className="relative text-white flex-grow flex items-center pt-8 pb-32 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* Moderate navy overlay for text readability, lighter in the middle so faces still show */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/95 via-navy-900/70 to-navy-900/95"></div>

        <div className="relative w-full max-w-7xl mx-auto px-8 flex flex-col items-center text-center">
          <span className="border border-gold-600/30 text-gold-500 text-[10px] font-sans font-semibold px-3 py-1 rounded-full tracking-widest mb-8 uppercase bg-gold-600/10">
            Secure Platform
          </span>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]">
            AI-Powered Bid Compliance <br/> Verification Platform for GeM
          </h2>
          <p className="text-lg text-neutral-200 max-w-2xl mb-20 font-light [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]">
            Multi-portal verification, automated compliance, and human decision governance ensuring transparent and fair public procurement.
          </p>

          <div className="flex flex-col md:flex-row gap-10 w-full max-w-4xl justify-center">
            {/* Officer Portal Card */}
            <div className="flex-1 bg-white rounded-xl p-10 text-left shadow-2xl border border-neutral-200 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800"></div>
              <div className="w-14 h-14 rounded-lg bg-slate-50 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-2">Administrative</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Procurement Officer Portal</h3>
              <p className="text-base text-neutral-500 mb-10 flex-grow">Access the compliance command center, review AI verification findings, and record statutory decisions.</p>
              <Link to="/officer" className="w-full bg-slate-800 text-white text-center py-4 rounded-md font-semibold hover:bg-slate-900 transition-colors">
                Open Dashboard →
              </Link>
            </div>

            {/* Bidder Portal Card */}
            <div className="flex-1 bg-white rounded-xl p-10 text-left shadow-2xl border border-neutral-200 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-success"></div>
              <div className="w-14 h-14 rounded-lg bg-success/10 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-2">Vendor</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Secure Bidder Portal</h3>
              <p className="text-base text-neutral-500 mb-10 flex-grow">Submit bids, upload verifiable documents, and track compliance status in a secure environment.</p>
              <Link to="/bidder/login" className="w-full border-2 border-slate-800 text-slate-900 text-center py-3.5 rounded-md font-semibold hover:bg-slate-50 transition-colors">
                Secure Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="bg-neutral-50 py-20 border-b border-neutral-200 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-12">
            <span className="text-slate-800 font-mono text-xs tracking-widest uppercase mb-3 block">About the Platform</span>
            <h3 className="text-3xl font-bold text-slate-900">Built for Transparent, Compliant Procurement</h3>
            <p className="text-neutral-500 max-w-2xl mx-auto mt-4">
              The GeM Compliance Platform combines automated statutory verification with human oversight, giving procurement officers and vendors a single, auditable place to manage bid compliance from submission to decision.
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-10 text-center shadow-lg border border-slate-900 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gold-600"></div>
             <h3 className="text-gold-500 font-mono text-xs tracking-widest uppercase mb-4">Core Safety & Governance Architecture</h3>
             <h4 className="text-2xl font-bold text-white mb-6">Deterministic Rules Decide Facts — AI Generates Reasoning</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                <div className="text-left border-l-2 border-slate-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">Statutory Verification</h5>
                  <p className="text-sm text-neutral-400">Strict rule-engine checking against mock public registries and compliance requirements.</p>
                </div>
                <div className="text-left border-l-2 border-slate-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">AI Discrepancy Engine</h5>
                  <p className="text-sm text-neutral-400">Analyzes semantic mismatches and generates human-readable advisory reasoning.</p>
                </div>
                <div className="text-left border-l-2 border-slate-700 pl-4">
                  <h5 className="text-white font-semibold mb-2">Human Governance</h5>
                  <p className="text-sm text-neutral-400">Final administrative decisions remain firmly with the authorized Procurement Officer.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" className="bg-white py-20 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-12">
            <span className="text-slate-800 font-mono text-xs tracking-widest uppercase mb-3 block">Get in Touch</span>
            <h3 className="text-3xl font-bold text-slate-900">Contact Us</h3>
            <p className="text-neutral-500 max-w-2xl mx-auto mt-4">
              Have a question about compliance verification, onboarding, or a specific tender? Reach out through any of the channels below.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-50 rounded-xl p-8 text-center border border-neutral-200 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h5 className="font-semibold text-slate-900 mb-1">Email</h5>
              <p className="text-sm text-neutral-500">support@gemcompliance.gov.in</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-8 text-center border border-neutral-200 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h5 className="font-semibold text-slate-900 mb-1">Toll Free</h5>
              <p className="text-sm text-neutral-500">1800-419-3436</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-8 text-center border border-neutral-200 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h5 className="font-semibold text-slate-900 mb-1">Office</h5>
              <p className="text-sm text-neutral-500">Ministry of MSME, New Delhi</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default LandingPage;
