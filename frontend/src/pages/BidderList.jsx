import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBiddersByTender } from "../api/bidders";
import { getTenderById } from "../api/tenders";

const RISK_STYLES = {
  LOW: "bg-success/10 text-success border-success/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-error/10 text-error border-error/20",
};

const DECISION_STYLES = {
  PENDING: "bg-neutral-100 text-neutral-600 border-neutral-200",
  QUALIFIED: "bg-success/10 text-success border-success/20",
  DISQUALIFIED: "bg-error/10 text-error border-error/20",
  CLARIFICATION_REQUESTED: "bg-warning/10 text-warning border-warning/20",
};

function BidderList() {
  const { tenderId } = useParams();
  const [tender, setTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getTenderById(tenderId), getBiddersByTender(tenderId)])
      .then(([tenderData, bidderData]) => {
        setTender(tenderData);
        setBidders(bidderData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenderId]);

  if (loading) return <div className="p-8 max-w-7xl mx-auto text-neutral-500 font-mono text-sm animate-pulse">Accessing Tender Queue...</div>;
  if (error) return <div className="p-8 max-w-7xl mx-auto text-error font-mono text-sm">System Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6">
        <Link to="/officer" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-navy-900 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Tenders
        </Link>
      </div>

      {tender && (
        <div className="bg-navy-900 rounded-xl p-8 shadow-lg mb-8 relative overflow-hidden border border-navy-800">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold-600"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <span className="text-gold-500 font-mono text-xs tracking-widest uppercase mb-2 block">Evaluation Workspace</span>
              <h1 className="text-2xl font-bold text-white mb-2">{tender.title}</h1>
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <span className="font-mono bg-navy-800 px-2 py-0.5 rounded text-neutral-300 border border-navy-700">{tender.tenderId}</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  {tender.department}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-1">Queue Status</p>
              <p className="text-xl font-bold text-white font-mono">{bidders.length} BIDS RECEIVED</p>
            </div>
          </div>
        </div>
      )}

      {bidders.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-xl shadow-sm border border-neutral-200">
          <svg className="w-12 h-12 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p className="text-neutral-500 font-mono text-sm">No bids submitted for this tender yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Bidder Details</th>
                <th className="px-6 py-4 text-center">AI Compliance Score</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4">Officer Decision</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {bidders.map((bidder) => (
                <tr key={bidder._id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-navy-900 text-base">{bidder.sellerProfile.companyName}</span>
                      <span className="text-xs text-neutral-500 font-mono">{bidder.sellerProfile.panNumber}</span>
                      
                      {/* Flag logic */}
                      {bidder.officerDecision === "QUALIFIED" && bidder.complianceScore !== null && bidder.complianceScore < 50 && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-error/10 text-error border border-error/20 w-max" title="Officer qualified a bidder with very low compliance score!">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          SUSPICIOUS APPROVAL (AUDIT FLAG)
                        </div>
                      )}
                      {bidder.officerDecision === "QUALIFIED" && bidder.riskLevel === "HIGH" && bidder.complianceScore >= 50 && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-error/10 text-error border border-error/20 w-max" title="Officer qualified a HIGH RISK bidder!">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          HIGH RISK APPROVAL (AUDIT FLAG)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {bidder.complianceScore !== null ? (
                      <div className="flex flex-col items-center">
                        <span className={`text-xl font-bold font-mono ${bidder.complianceScore < 50 ? "text-error" : "text-navy-900"}`}>{bidder.complianceScore}</span>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">/ 100</span>
                      </div>
                    ) : (
                      <span className="text-neutral-400 font-mono text-sm">PENDING</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {bidder.riskLevel ? (
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${RISK_STYLES[bidder.riskLevel]}`}>
                        {bidder.riskLevel}
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-mono text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${DECISION_STYLES[bidder.officerDecision]}`}>
                      {bidder.officerDecision.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link
                      to={`/officer/bidders/${bidder._id}`}
                      className="inline-flex items-center gap-1 bg-white border border-neutral-200 text-navy-900 hover:bg-neutral-50 hover:border-navy-200 px-4 py-2 rounded text-sm font-semibold transition-all shadow-sm"
                    >
                      Verify Compliance <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BidderList;