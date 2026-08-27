import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBiddersByTender } from "../api/bidders";
import { getTenderById } from "../api/tenders";

const RISK_STYLES = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const DECISION_STYLES = {
  PENDING: "bg-slate-100 text-slate-600",
  QUALIFIED: "bg-green-100 text-green-700",
  DISQUALIFIED: "bg-red-100 text-red-700",
  CLARIFICATION_REQUESTED: "bg-amber-100 text-amber-700",
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

  if (loading) return <div className="p-8 text-slate-500">Loading bidders...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <Link to="/officer" className="text-sm text-blue-600 hover:underline">
        ← Back to Tenders
      </Link>

            {tender && (
        <div className="mt-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{tender.title}</h1>
            <p className="text-slate-500">
              {tender.tenderId} · {tender.department}
            </p>
          </div>
        </div>
      )}

      {bidders.length === 0 && (
        <p className="text-slate-500">No bidders have submitted for this tender yet.</p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Bidder</th>
              <th className="px-4 py-3 font-medium">Compliance Score</th>
              <th className="px-4 py-3 font-medium">Risk Level</th>
              <th className="px-4 py-3 font-medium">Officer Decision</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bidders.map((bidder) => (
              <tr key={bidder._id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {bidder.sellerProfile.companyName}
                  {bidder.officerDecision === "QUALIFIED" && bidder.complianceScore !== null && bidder.complianceScore < 50 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200" title="Officer qualified a bidder with very low compliance score!">
                      ⚠️ SUSPICIOUS APPROVAL
                    </span>
                  )}
                  {bidder.officerDecision === "QUALIFIED" && bidder.riskLevel === "HIGH" && bidder.complianceScore >= 50 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200" title="Officer qualified a HIGH RISK bidder!">
                      ⚠️ HIGH RISK APPROVAL
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {bidder.complianceScore !== null ? (
                    <span className={`font-semibold ${bidder.complianceScore < 50 ? "text-red-600" : ""}`}>{bidder.complianceScore}/100</span>
                  ) : (
                    <span className="text-slate-400">Not checked</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {bidder.riskLevel ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${RISK_STYLES[bidder.riskLevel]}`}>
                      {bidder.riskLevel}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${DECISION_STYLES[bidder.officerDecision]}`}
                  >
                    {bidder.officerDecision.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/officer/bidders/${bidder._id}`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BidderList;