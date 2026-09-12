import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTenders } from "../api/tenders";

function TenderList() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTenders()
      .then((data) => setTenders(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-neutral-500 font-mono text-sm animate-pulse">Initializing Command Center...</div>;
  if (error) return <div className="p-8 text-error font-mono text-sm">System Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Active Tenders Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage public procurements and review incoming compliance verified bids.</p>
        </div>
        <Link to="/officer/tenders/new" className="bg-gold-600 hover:bg-gold-500 text-white text-sm px-6 py-2.5 rounded-md shadow-sm font-semibold transition-colors uppercase tracking-wide">
          Publish New Tender
        </Link>
      </div>

      {tenders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Total Tenders</p>
              <p className="text-3xl font-bold text-navy-900 font-mono">{tenders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-800">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Active / Open</p>
              <p className="text-3xl font-bold text-navy-900 font-mono">{tenders.filter(t => t.isActive).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">Closed Tenders</p>
              <p className="text-3xl font-bold text-navy-900 font-mono">{tenders.filter(t => !t.isActive).length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
          </div>
        </div>
      )}

      {tenders.length === 0 && (
        <div className="bg-white p-16 text-center rounded-xl shadow-sm border border-neutral-200 mb-8">
          <p className="text-neutral-500 mb-6 font-mono text-sm">No active procurements found in the registry.</p>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <h3 className="font-semibold text-navy-900 text-sm uppercase tracking-wider">Procurement Registry</h3>
        </div>
        <div className="divide-y divide-neutral-200">
          {tenders.map((tender) => (
            <div key={tender._id} className="p-6 hover:bg-neutral-50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-navy-900 bg-navy-50 px-2.5 py-1 rounded border border-navy-100 font-bold">{tender.tenderId}</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      tender.isActive ? "bg-success/10 text-success border border-success/20" : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}
                  >
                    {tender.isActive ? "Active" : "Closed"}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {new Date(tender.bidSubmissionDeadline).toLocaleDateString()}</span>
                </div>
                <h2 className="font-semibold text-lg text-navy-900 mb-1">{tender.title}</h2>
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> {tender.department}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                  <span className="font-mono">Est: {tender.estimatedValue?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) || 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex gap-4 items-center">
                <div className="flex flex-col gap-1.5 text-xs text-right mr-4 hidden sm:flex">
                   {tender.minLocalContent > 0 && <span className="text-neutral-500 font-mono">MII: {tender.minLocalContent}% Req</span>}
                   {tender.msmePreference && <span className="text-neutral-500 font-mono">MSME Pref: Yes</span>}
                </div>
                <Link
                  to={`/officer/tenders/${tender._id}`}
                  className="bg-navy-800 hover:bg-navy-900 text-white px-5 py-2.5 rounded font-semibold text-sm transition-colors shadow-sm whitespace-nowrap"
                >
                  Open Bid Queue →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TenderList;