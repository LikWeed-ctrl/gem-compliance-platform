import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getTenders } from "../api/tenders";

function BidderDashboard() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const profileId = localStorage.getItem("sellerProfileId");
    if (!profileId) {
      navigate("/bidder/login");
      return;
    }

    getTenders()
      .then((data) => setTenders(data.filter(t => t.isActive)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="p-8 max-w-7xl mx-auto text-neutral-500 font-mono text-sm animate-pulse">Accessing Opportunities...</div>;
  if (error) return <div className="p-8 max-w-7xl mx-auto text-error font-mono text-sm">System Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 pt-8 px-8 sm:px-12 lg:px-16">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Bidder Workspace</h1>
        <p className="text-neutral-500 mt-2 font-mono text-sm">Discover procurement opportunities and submit compliance applications.</p>
      </div>

      {tenders.length === 0 && (
        <div className="bg-white p-16 text-center rounded-xl shadow-sm border border-neutral-200">
          <svg className="w-12 h-12 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <p className="text-neutral-500 font-mono text-sm">No open tenders found at the moment.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tenders.map((tender) => (
          <div
            key={tender._id}
            className="group flex flex-col bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-navy-900 hover:shadow-card transition-all"
          >
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold bg-navy-50 text-navy-900 border border-navy-200 px-2 py-1 rounded tracking-wider uppercase font-mono">{tender.tenderId}</span>
                <span className="text-[10px] font-bold bg-success/10 text-success border border-success/20 px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> ACTIVE
                </span>
              </div>
              <h2 className="font-bold text-lg text-navy-900 leading-snug mb-4 group-hover:text-gold-600 transition-colors" title={tender.title}>{tender.title}</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <p className="text-sm font-semibold text-neutral-700">{tender.department}</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div>
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Submission Deadline</p>
                    <p className="text-sm font-bold text-navy-900 font-mono">{new Date(tender.bidSubmissionDeadline).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 mt-auto group-hover:bg-navy-900 transition-colors">
               <Link
                 to={`/bidder/tender/${tender._id}/apply`}
                 className="flex items-center justify-between w-full text-navy-900 group-hover:text-white text-sm font-bold tracking-wide uppercase transition-colors"
               >
                 Draft Application <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
               </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BidderDashboard;
