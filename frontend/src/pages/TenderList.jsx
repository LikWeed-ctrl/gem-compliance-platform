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

  if (loading) return <div className="p-8 text-slate-500">Loading tenders...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#000080]">Active Tenders Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all published procurements and view incoming bids.</p>
        </div>
      </div>

      {tenders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg text-2xl">📋</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Tenders</p>
              <p className="text-2xl font-black text-[#000080]">{tenders.length}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg text-2xl">🟢</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Tenders</p>
              <p className="text-2xl font-black text-[#000080]">{tenders.filter(t => t.isActive).length}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="bg-slate-100 text-slate-600 p-3 rounded-lg text-2xl">🔒</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Closed Tenders</p>
              <p className="text-2xl font-black text-[#000080]">{tenders.filter(t => !t.isActive).length}</p>
            </div>
          </div>
        </div>
      )}

      {tenders.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-slate-200 mb-8">
          <p className="text-slate-500 mb-4">No active procurements found.</p>
          <Link to="/officer/tenders/new" className="bg-[#FF9933] text-white px-6 py-2 rounded font-semibold shadow hover:bg-[#e68a2e]">
            Publish First Tender
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tenders.map((tender) => (
          <Link
            key={tender._id}
            to={`/officer/tenders/${tender._id}`}
            className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#000080] hover:shadow-lg transition-all"
          >
            {/* Tricolor Card Header Strip */}
            <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
            
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tender.tenderId}</span>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                    tender.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tender.isActive ? "● Active" : "Closed"}
                </span>
              </div>
              <h2 className="font-bold text-lg text-slate-800 leading-tight mb-2 group-hover:text-[#000080] transition-colors">{tender.title}</h2>
              <p className="text-sm text-slate-500 font-medium">
                🏛️ {tender.department}
              </p>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Deadline</p>
                <p className="text-sm font-bold text-slate-700">{new Date(tender.bidSubmissionDeadline).toLocaleDateString()}</p>
              </div>
              <span className="text-[#000080] text-sm font-bold group-hover:translate-x-1 transition-transform">
                View Bids →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TenderList;