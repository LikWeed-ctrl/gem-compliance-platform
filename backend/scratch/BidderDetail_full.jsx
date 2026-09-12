import api from "../api/client";
import AuditTrail from "../components/AuditTrail";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getBidderById,
  getComplianceChecks,
  runChecksForBidder,
  recordOfficerDecision,
} from "../api/bidders";

const RESULT_STYLES = {
  PASS: "bg-success/10 text-success border-success/20 text-success",
  FAIL: "bg-error/10 text-error border-error/20 text-error",
  REVIEW: "bg-warning/10 text-warning border-warning/20 text-warning",
  NOT_FOUND: "bg-neutral-100 text-neutral-600 border-neutral-200",
  NOT_APPLICABLE: "bg-neutral-100 text-neutral-600 border-neutral-200",
  COMPLIANT: "bg-success/10 text-success border-success/20",
  REVIEW_REQUIRED: "bg-warning/10 text-warning border-warning/20",
  NON_COMPLIANT: "bg-error/10 text-error border-error/20",
};

const RISK_STYLES = {
  LOW: "bg-success/10 text-success border-success/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-error/10 text-error border-error/20",
};

const SectionHeader = ({ title, icon }) => (
  <h2 className="font-bold text-navy-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-sm border-b border-neutral-200 pb-2">
    <span className="text-gold-600">{icon}</span>
    {title}
  </h2>
);

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border tracking-wider ${RESULT_STYLES[status] || RESULT_STYLES.REVIEW}`}>
    {(status || "UNKNOWN").replace(/_/g, " ")}
  </span>
);

const EvidenceBlock = ({ evidence }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!evidence) {
    return (
      <div className="mt-2">
        <span className="text-[10px] font-mono text-neutral-400 italic">No detailed evidence available.</span>
      </div>
    );
  }
  
  let parsed = null;
  let isString = typeof evidence === "string";
  
  if (isString) {
    try {
      parsed = JSON.parse(evidence);
    } catch (e) {
      parsed = evidence; 
    }
  } else {
    parsed = evidence;
  }

  const renderContent = (data) => {
    if (typeof data === "string") return <span>{data}</span>;
    if (Array.isArray(data)) {
      return (
        <ul className="list-disc pl-4 space-y-1">
          {data.map((item, idx) => <li key={idx}>{renderContent(item)}</li>)}
        </ul>
      );
    }
    if (typeof data === "object" && data !== null) {
      return (
        <div className="flex flex-col gap-1">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b border-neutral-700/50 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="text-neutral-200 break-words">{renderContent(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(data)}</span>;
  };

  return (
    <div className="mt-2">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[10px] font-mono text-info hover:underline uppercase tracking-wider mb-2 flex items-center gap-1"
      >
        {expanded ? "[- Hide Evidence]" : "[+ View Evidence]"}
      </button>
      {expanded && (
        <div className="text-xs bg-navy-900 text-neutral-300 p-4 rounded-md overflow-x-auto font-sans shadow-inner border border-navy-800">
          {renderContent(parsed)}
        </div>
      )}
    </div>
  );
};

const TenderSummary = ({ bidder, runningChecks, onRunChecks, navigate }) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm mb-6 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full bg-navy-800"></div>
    <div className="flex justify-between items-start mb-4">
      <button onClick={() => navigate(-1)} className="text-xs text-neutral-500 hover:text-navy-900 font-mono tracking-widest uppercase flex items-center gap-1 transition-colors">
        <span>←</span> Back to Queue
      </button>
      <button
          onClick={onRunChecks}
          disabled={runningChecks}
          className="bg-navy-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-navy-800 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {runningChecks ? "RUNNING ANALYSIS..." : "TRIGGER VERIFICATION ENGINE"}
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">Bidder / Seller Profile</h3>
        <p className="text-xl font-bold text-navy-900 mb-2">{bidder.sellerProfile.companyName}</p>
        <div className="flex gap-3 text-xs font-mono text-neutral-600">
          <span className="bg-neutral-100 px-2 py-1 rounded border border-neutral-200">PAN: {bidder.sellerProfile.panNumber}</span>
          {bidder.sellerProfile.gstin && <span className="bg-neutral-100 px-2 py-1 rounded border border-neutral-200">GSTIN: {bidder.sellerProfile.gstin}</span>}
        </div>
      </div>
      <div>
         <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">Tender Details</h3>
         <p className="text-lg font-bold text-navy-900 mb-1">{bidder.tender.title}</p>
         <p className="text-xs font-mono text-neutral-600 mb-2">ID: {bidder.tender.tenderId} | Dept: {bidder.tender.department}</p>
      </div>
    </div>
  </div>
);

const ScoreBreakdown = ({ aiDetails, score, status, risk }) => (
  <div className="mb-8">
    <SectionHeader title="Compliance Assessment Score" icon="⊛" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Final Score</span>
        {score !== null ? (
            <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black font-mono ${score < 70 ? 'text-error' : score < 85 ? 'text-warning' : 'text-success'}`}>{score}</span>
                <span className="text-sm font-mono text-neutral-400">/100</span>
            </div>
        ) : <span className="text-2xl font-mono text-neutral-300">--</span>}
      </div>
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Status</span>
        <StatusBadge status={status || "NOT_ASSESSED"} />
      </div>
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Risk Level</span>
        <span className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] border tracking-wider ${RISK_STYLES[risk] || RISK_STYLES.LOW}`}>
            {risk || "NOT_ASSESSED"}
        </span>
      </div>
      <div className="bg-navy-900 text-white rounded-xl p-5 shadow-sm">
         <span className="text-[10px] font-bold text-navy-300 uppercase tracking-widest mb-2 block border-b border-navy-700 pb-2">Score Calculation</span>
         {aiDetails?.scoreBreakdown ? (
             <div className="space-y-1 mt-2 text-xs font-mono">
                 <div className="flex justify-between"><span>Base Score</span><span>{aiDetails.scoreBreakdown.startingScore}</span></div>
                 {aiDetails.scoreBreakdown.criticalDeductions > 0 && <div className="flex justify-between text-error"><span>Critical Deductions</span><span>-{aiDetails.scoreBreakdown.criticalDeductions}</span></div>}
                 {aiDetails.scoreBreakdown.majorDeductions > 0 && <div className="flex justify-between text-error/80"><span>Major Deductions</span><span>-{aiDetails.scoreBreakdown.majorDeductions}</span></div>}
                 {aiDetails.scoreBreakdown.minorDeductions > 0 && <div className="flex justify-between text-warning"><span>Minor Deductions</span><span>-{aiDetails.scoreBreakdown.minorDeductions}</span></div>}
                 {aiDetails.scoreBreakdown.reviewDeductions > 0 && <div className="flex justify-between text-warning/80"><span>Review Deductions</span><span>-{aiDetails.scoreBreakdown.reviewDeductions}</span></div>}
                 <div className="flex justify-between border-t border-navy-700 pt-1 font-bold mt-1"><span>Final</span><span>{aiDetails.scoreBreakdown.finalScore}</span></div>
             </div>
         ) : <div className="text-xs text-navy-400 font-mono mt-2">Not calculated.</div>}
      </div>
    </div>
    <div className="bg-info/10 border border-info/20 rounded p-3 text-xs text-info-900 font-medium">
        ℹ️ This score is an automated deterministic assessment based on extracted evidence. The procurement officer retains final authority.
    </div>
  </div>
);

const RequirementCoverageMatrix = ({ matrix }) => {
  if (!matrix || matrix.length === 0) return null;
  return (
    <div className="mb-8">
      <SectionHeader title="Requirement Coverage Matrix" icon="📋" />
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-4 py-3 border-b">Category / Doc</th>
              <th className="px-4 py-3 border-b">Requirement</th>
              <th className="px-4 py-3 border-b">Result</th>
              <th className="px-4 py-3 border-b">Evidence / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {matrix.map((req, i) => (
              <tr key={i} className="hover:bg-neutral-50/50">
                <td className="px-4 py-3 align-top font-semibold text-navy-900 text-xs">
                  {req.documentType ? req.documentType.replace(/_/g, " ") : "GENERAL"}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-xs mb-1">{req.rule}</div>
                  <div className="text-xs text-neutral-500">{req.name}</div>
                  {req.required !== undefined && <div className="text-[10px] text-neutral-400 mt-1">Required: {String(req.required)}</div>}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={req.status} />
                </td>
                <td className="px-4 py-3 align-top text-xs text-neutral-600">
                  <div className="font-medium mb-1">{req.reason || "-"}</div>
                  <EvidenceBlock evidence={req.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DocumentRepository = ({ documents }) => {
    const openDocument = async (id, filename) => {
        try {
            const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
            const contentType = res.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([res.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            
            const newWindow = window.open(url, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') { 
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
            }
            setTimeout(() => window.URL.revokeObjectURL(url), 60000); 
        } catch (e) {
            const msg = e.response?.status === 401 ? "Unauthorized. Please login again." :
                        e.response?.status === 404 ? "Document not found." : 
                        e.response?.status === 403 ? "Forbidden. You do not have access." : "Failed to open document.";
            alert(msg);
        }
    };
  
    return (
      <div className="mb-8">
        <SectionHeader title="Document Repository" icon="svg-doc" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div key={doc._id} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm flex flex-col">
               <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{doc.documentCategory}</span>
               <h4 className="font-bold text-navy-900 text-sm mb-2">{doc.docType.replace(/_/g, " ")}</h4>
               <div className="flex items-center gap-2 mb-4">
                  <StatusBadge status={doc.verificationStatus} />
               </div>
               <div className="mt-auto pt-3 border-t border-neutral-100 flex justify-between items-center">
                   <span className="text-xs font-mono text-neutral-400 truncate max-w-[120px]" title={doc.originalFilename}>{doc.originalFilename}</span>
                   <button onClick={() => openDocument(doc._id, doc.originalFilename)} className="text-xs font-bold text-info hover:text-info-700 uppercase tracking-widest transition-colors">
                      View / Download
                   </button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
};

const FindingsTable = ({ findings, title, icon }) => {
    if (!findings || findings.length === 0) return null;
    return (
        <div className="mb-8">
            <SectionHeader title={title} icon={icon} />
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-3 border-b">Rule / Source</th>
                            <th className="px-4 py-3 border-b">Result</th>
                            <th className="px-4 py-3 border-b">Reason & Evidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {findings.map((f, i) => (
                            <tr key={i} className="hover:bg-neutral-50/50">
                                <td className="px-4 py-3 align-top">
                                    <div className="font-bold text-navy-900 text-xs mb-1">{f.rule}</div>
                                    <div className="text-[10px] text-neutral-400 font-mono">{f.sourceDoc || "Cross-Document Engine"}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <StatusBadge status={f.status} />
                                </td>
                                <td className="px-4 py-3 align-top text-xs text-neutral-600">
                                    <div className="font-medium mb-1">{f.reason}</div>
                                    <EvidenceBlock evidence={f.evidence} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ExtractedData = ({ documents }) => {
    return (
        <div className="mb-8">
            <SectionHeader title="Extracted Canonical Data" icon="🔍" />
            <div className="space-y-4">
                {documents.filter(d => d.extractedFields).map(doc => (
                    <div key={doc._id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 font-bold text-xs text-navy-900 tracking-wide">
                            {doc.docType.replace(/_/g, " ")}
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(doc.extractedFields).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1">{key}</span>
                                    <span className="text-sm font-medium text-navy-900 bg-neutral-50 px-2 py-1 border border-neutral-100 rounded break-words">
                                        {value !== null && value !== undefined && value !== "" ? String(value) : <span className="text-neutral-300 italic">null</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AiRecommendation = ({ recommendation }) => {
    if (!recommendation) return null;
    return (
        <div className="mb-8">
            <SectionHeader title="AI Assessment / Recommendation" icon="🤖" />
            <div className="bg-navy-900 text-neutral-200 border border-navy-800 rounded-xl p-6 shadow-sm font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {recommendation}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2 italic px-2">This is an advisory text generated by the AI semantic engine. It does not overwrite deterministic verification results.</p>
        </div>
    );
};

const OfficerDecision = ({ decisionProps }) => {
    const { decision, setDecision, reason, setReason, officerId, setOfficerId, submitting, decisionError, onSubmit, currentDecision } = decisionProps;
    return (
      <div className="mb-12 bg-white border border-neutral-200 rounded-xl p-8 shadow-sm relative overflow-hidden mt-8">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold-600"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              Officer Decision Override
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Current recorded decision: <span className="font-bold text-navy-900 uppercase tracking-wide">{currentDecision.replace(/_/g, " ")}</span>
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Final Decision</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none"
              >
                <option value="PENDING">PENDING</option>
                <option value="QUALIFIED">QUALIFY (APPROVE)</option>
                <option value="DISQUALIFIED">DISQUALIFY (REJECT)</option>
                <option value="CLARIFICATION_REQUESTED">REQUEST CLARIFICATION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Officer Authentication ID</label>
              <input
                type="text"
                required
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="e.g. officer.id"
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono outline-none"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
              Statutory Justification (Required)
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide official rationale for this decision... (Will be recorded in Audit Trail)"
              className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm outline-none resize-y"
            />
          </div>
          {decisionError && (
            <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-md text-sm text-error font-medium">
              {decisionError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy-900 text-white px-8 py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md w-full sm:w-auto"
          >
            {submitting ? "RECORDING..." : "COMMIT DECISION TO LEDGER"}
          </button>
        </form>
      </div>
    );
};

export default function BidderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bidder, setBidder] = useState(null);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [error, setError] = useState(null);

  const [decision, setDecision] = useState("QUALIFIED");
  const [reason, setReason] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [showAudit, setShowAudit] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([getBidderById(id), getComplianceChecks(id)])
      .then(([bidderData, checksData]) => {
        setBidder(bidderData);
        setChecks(checksData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleRunChecks() {
    setRunningChecks(true);
    try {
      await runChecksForBidder(id);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningChecks(false);
    }
  }

  async function handleSubmitDecision(e) {
    e.preventDefault();
    setDecisionError(null);
    setSubmitting(true);
    try {
      await recordOfficerDecision(id, { decision, reason, officerId });
      loadData();
      setReason("");
    } catch (err) {
      setDecisionError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 max-w-7xl mx-auto text-neutral-500 font-mono text-sm animate-pulse">Initializing Verification Dashboard...</div>;
  if (error) return <div className="p-8 max-w-7xl mx-auto text-error font-mono text-sm">System Error: {error}</div>;
  if (!bidder) return null;

  // Segment the checks data for specialized views
  const coverageMatrix = checks.find(c => c.sourceName === "Tender Requirement Coverage")?.rawResponse || [];
  const crossChecks = checks.find(c => c.sourceName === "Cross-Document Engine")?.rawResponse || [];
  const layerBCChecks = checks.filter(c => c.sourceName.startsWith("Layer B/C:"));
  
  const identityChecks = [];
  const internalChecks = [];
  
  layerBCChecks.forEach(dlc => {
    if (dlc.rawResponse && Array.isArray(dlc.rawResponse)) {
      dlc.rawResponse.forEach(r => {
        if (r.rule === "BIDDER_OWNERSHIP" || (r.evidence && r.evidence.includes("matches document entity"))) {
          identityChecks.push({...r, sourceDoc: dlc.sourceName});
        } else if (r.rule === "INTERNAL_CONSISTENCY" || (r.evidence && r.evidence.includes("contradicts"))) {
          internalChecks.push({...r, sourceDoc: dlc.sourceName});
        }
      });
    }
  });

  const decisionProps = { decision, setDecision, reason, setReason, officerId, setOfficerId, submitting, decisionError, onSubmit: handleSubmitDecision, currentDecision: bidder.officerDecision };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8 pt-6">
      <TenderSummary bidder={bidder} runningChecks={runningChecks} onRunChecks={handleRunChecks} navigate={navigate} />
      <ScoreBreakdown aiDetails={bidder.aiAssessmentDetails} score={bidder.complianceScore} status={bidder.complianceStatus} risk={bidder.riskLevel} />
      <RequirementCoverageMatrix matrix={coverageMatrix} />
      <IdentityVerification findings={identityChecks} title="Identity Verification" icon="🪪" />
      <CrossDocumentFindings findings={crossChecks} title="Cross-Document Findings" icon="🔗" />
      <InternalConsistencyFindings findings={internalChecks} title="Internal Document Consistency" icon="📄" />
      <ExtractedData documents={bidder.documents || []} />
      <DocumentRepository documents={bidder.documents || []} />
      <AiRecommendation recommendation={bidder.aiRecommendation} />
      <OfficerDecision decisionProps={decisionProps} />
      
      <div className="mt-12 text-center pb-8 border-t border-neutral-200 pt-8">
        <button 
          onClick={() => setShowAudit(!showAudit)}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-navy-900 font-medium font-mono uppercase tracking-widest transition-colors"
        >
          {showAudit ? "Hide System Audit Logs" : "View System Audit Logs"}
        </button>
      </div>
      {showAudit && <div className="mt-4"><AuditTrail bidderId={id} /></div>}
    </div>
  );
}

// Map the sub-components to the generic FindingsTable
const IdentityVerification = FindingsTable;
const CrossDocumentFindings = FindingsTable;
const InternalConsistencyFindings = FindingsTable;
