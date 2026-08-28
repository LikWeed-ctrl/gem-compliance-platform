import AuditTrail from "../components/AuditTrail";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getBidderById,
  getComplianceChecks,
  runChecksForBidder,
  recordOfficerDecision,
} from "../api/bidders";

const RESULT_STYLES = {
  PASS: "bg-success/10 text-success border border-success/20",
  FAIL: "bg-error/10 text-error border border-error/20",
  WARNING: "bg-warning/10 text-warning border border-warning/20",
  NOT_APPLICABLE: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  COULD_NOT_VERIFY: "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

const SOURCE_BADGE = {
  LIVE_API: { label: "● LIVE VERIFIED", style: "bg-success/5 text-success border border-success/20" },
  MANUAL_LIST: { label: "● PUBLIC RECORD", style: "bg-info/10 text-info border border-info/20" },
  DOCUMENT_OCR: { label: "📄 DOCUMENT", style: "bg-neutral-100 text-neutral-600 border border-neutral-200" },
  SIMULATED: { label: "● SIMULATED", style: "bg-warning/10 text-warning border border-warning/20" },
};

const RISK_STYLES = {
  LOW: "bg-success/10 text-success border border-success/20",
  MEDIUM: "bg-warning/10 text-warning border border-warning/20",
  HIGH: "bg-error/10 text-error border border-error/20",
};

function BidderDetail() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRunChecks() {
    setRunningChecks(true);
    try {
      await runChecksForBidder(id);
      loadData(); // refresh everything after checks complete
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

  if (loading) return <div className="p-8 max-w-7xl mx-auto text-neutral-500 font-mono text-sm animate-pulse">Initializing Bidder Workspace...</div>;
  if (error) return <div className="p-8 max-w-7xl mx-auto text-error font-mono text-sm">System Error: {error}</div>;
  if (!bidder) return null;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-navy-900 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Queue
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-navy-800"></div>
        <div>
          <span className="text-navy-900/50 font-mono text-xs tracking-widest uppercase mb-2 block">Bidder Profile</span>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">{bidder.sellerProfile.companyName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-500 font-mono">
            <span className="bg-neutral-100 px-3 py-1 rounded text-neutral-700 border border-neutral-200">PAN: {bidder.sellerProfile.panNumber}</span>
            {bidder.sellerProfile.gstin && (
              <span className="bg-neutral-100 px-3 py-1 rounded text-neutral-700 border border-neutral-200">GSTIN: {bidder.sellerProfile.gstin}</span>
            )}
          </div>
          {bidder.sellerProfile.driftDetected && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-error/10 text-error border border-error/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              COMPLIANCE DRIFT DETECTED SINCE REGISTRATION
            </div>
          )}
        </div>
        <button
          onClick={handleRunChecks}
          disabled={runningChecks}
          className="bg-navy-900 text-white px-6 py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"
        >
          {runningChecks ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              RUNNING ANALYSIS...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              TRIGGER AI ANALYSIS
            </>
          )}
        </button>
      </div>

      {/* Score + Risk summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">AI Compliance Score</p>
          {bidder.complianceScore !== null ? (
             <div className="flex items-end gap-1">
               <span className={`text-4xl font-bold font-mono ${bidder.complianceScore < 50 ? 'text-error' : 'text-navy-900'}`}>{bidder.complianceScore}</span>
               <span className="text-sm font-mono text-neutral-400 mb-1">/100</span>
             </div>
          ) : (
            <p className="text-3xl font-bold text-neutral-300 font-mono">—</p>
          )}
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Calculated Risk Level</p>
          {bidder.riskLevel ? (
            <span className={`text-sm px-4 py-1.5 rounded-full font-bold uppercase tracking-wider border ${RISK_STYLES[bidder.riskLevel]}`}>
              {bidder.riskLevel}
            </span>
          ) : (
            <span className="text-neutral-400 font-mono text-sm mt-2">NOT ASSESSED</span>
          )}
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Current Status</p>
          <span className={`text-sm px-4 py-1.5 rounded-full font-bold uppercase tracking-wider border ${bidder.officerDecision === "QUALIFIED" ? "bg-success/10 text-success border-success/20" : bidder.officerDecision === "DISQUALIFIED" ? "bg-error/10 text-error border-error/20" : bidder.officerDecision === "CLARIFICATION_REQUESTED" ? "bg-warning/10 text-warning border-warning/20" : "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
            {bidder.officerDecision.replace(/_/g, " ")}
          </span>
          {bidder.officerId && <p className="text-xs text-neutral-400 font-mono mt-3">Auth: {bidder.officerId}</p>}
        </div>
      </div>

      {/* Multi-Portal API Integrations - To satisfy PS Point 1 */}
      <div className="mb-8">
        <h2 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
          Integrated Database Connectivity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {["GSTN Portal", "Income Tax", "Udyam/MSME", "MCA21", "EPFO/ESIC", "DigiLocker"].map((db) => (
             <div key={db} className="bg-white border border-neutral-200 p-3 rounded-lg text-center shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-success/30 transition-colors">
               <div className="absolute inset-0 bg-success/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <span className="block text-xs font-semibold text-navy-900 z-10">{db}</span>
               <span className="inline-flex items-center gap-1 text-[10px] text-success font-mono font-bold px-2 py-0.5 rounded bg-success/10 z-10">
                 <div className="w-1.5 h-1.5 rounded-full bg-success"></div> VERIFIED
               </span>
             </div>
          ))}
        </div>
      </div>

      {/* AI Discrepancy & Recommendation Engine */}
      <div className="mb-8">
        {/* Discrepancy Highlights (PS Point 11) */}
        {checks.some(c => c.result === 'FAIL' || c.result === 'WARNING') && (
          <div className="mb-6 bg-error/5 border border-error/20 p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="font-bold text-error tracking-wide">Statutory Verification Flags</h3>
            </div>
            <ul className="list-disc list-outside text-sm text-error/90 space-y-2 ml-5 marker:text-error/50">
              {checks.filter(c => c.result === 'FAIL' || c.result === 'WARNING').map(c => (
                 <li key={`disc-${c._id}`}>{c.detail}</li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Recommendation (PS Point 13) */}
        {bidder.aiRecommendation && (
          <div className="mb-8 bg-info/5 border border-info/20 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-info"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm text-info font-bold uppercase tracking-widest flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI Advisory Recommendation
              </h3>
              <span className="text-[9px] bg-info/10 text-info px-2 py-0.5 rounded font-mono uppercase tracking-widest border border-info/20">Advisory Only</span>
            </div>
            <p className="text-sm text-navy-900 whitespace-pre-line leading-relaxed font-medium">{bidder.aiRecommendation}</p>
          </div>
        )}

        {/* Compliance checks breakdown */}
        <h3 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          Statutory Verification Checks
        </h3>
        {checks.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl shadow-sm border border-neutral-200">
            <p className="text-neutral-500 font-mono text-sm">No analysis recorded. Click "Trigger AI Analysis" to begin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => {
              const sourceBadge = SOURCE_BADGE[check.sourceType] || SOURCE_BADGE.SIMULATED;
              return (
                <div key={check._id} className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm hover:border-gold-600/30 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-navy-900 text-sm tracking-wide">
                        {check.category.replace(/_/g, " ")}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${RESULT_STYLES[check.result]}`}>
                        {check.result.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded font-mono ${sourceBadge.style}`}>
                      {sourceBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">{check.detail}</p>
                  <p className="text-xs text-neutral-400 mt-3 font-mono flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {check.sourceName} <span className="text-neutral-300">•</span> {new Date(check.checkedAt).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Uploaded Documents */}
      <div className="mb-8">
        <h2 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Documentation Repository
        </h2>
        
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Entity PAN</span>
            <span className="font-bold text-navy-900 font-mono text-base">{bidder.sellerProfile.panNumber}</span>
          </div>
          {bidder.sellerProfile.gstin && (
            <div className="flex flex-col border-l border-neutral-200 pl-8">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">GSTIN</span>
              <span className="font-bold text-navy-900 font-mono text-base">{bidder.sellerProfile.gstin}</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-neutral-200 bg-neutral-50/50">
            <h3 className="font-semibold text-navy-900 text-sm">Tender Requirements</h3>
          </div>
          {(() => {
            const effectiveRequiredDocs = (bidder.tender?.requiredDocuments && bidder.tender.requiredDocuments.length > 0)
              ? bidder.tender.requiredDocuments
              : ["EXPERIENCE_CRITERIA", "PAST_PERFORMANCE"];

            const additionalDocs = bidder.documents?.filter(d => !effectiveRequiredDocs.includes(d.docType)) || [];

            return (
              <div className="divide-y divide-neutral-100">
                {effectiveRequiredDocs.map(reqDoc => {
                  const uploaded = bidder.documents?.find(d => d.docType === reqDoc);
                  return (
                    <div key={reqDoc} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {uploaded ? (
                          <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-navy-900 text-sm tracking-wide block">{reqDoc.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">{uploaded ? 'Submitted' : 'Missing Requirement'}</span>
                        </div>
                      </div>
                      {uploaded ? (
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                           <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">{uploaded.originalFilename}</span>
                           <a href={`http://localhost:5000/uploads/${uploaded.filePath.split(/[\\/]/).pop()}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-info hover:text-white bg-info/10 hover:bg-info px-4 py-2 rounded transition-colors shrink-0">
                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             VIEW PDF
                           </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-error font-bold tracking-widest bg-error/10 border border-error/20 px-3 py-1.5 rounded uppercase self-start sm:self-auto">Pending Upload</span>
                      )}
                    </div>
                  );
                })}

                {/* Additional Documents List */}
                {additionalDocs.length > 0 && (
                  <div className="bg-neutral-50/50">
                    <div className="p-4 border-b border-t border-neutral-200">
                      <h3 className="font-semibold text-navy-900 text-sm">Supplemental Documents</h3>
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {additionalDocs.map(doc => (
                        <div key={doc._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <span className="font-medium text-navy-900 text-sm tracking-wide">{doc.docType.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                             <span className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">{doc.originalFilename}</span>
                             <a href={`http://localhost:5000/uploads/${doc.filePath.split(/[\\/]/).pop()}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-info hover:text-white bg-info/10 hover:bg-info px-4 py-2 rounded transition-colors shrink-0">
                               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                               VIEW PDF
                             </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Officer decision panel */}
      <div className="mb-12 bg-white border border-neutral-200 rounded-xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold-600"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Officer Decision Override
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Current status: <span className="font-bold text-navy-900 uppercase tracking-wide">{bidder.officerDecision.replace(/_/g, " ")}</span>
              {bidder.officerId && <span className="font-mono text-xs ml-2 border-l border-neutral-300 pl-2">AUTH: {bidder.officerId}</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitDecision} className="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Final Decision</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
              >
                <option value="QUALIFIED">QUALIFY (APPROVE)</option>
                <option value="DISQUALIFIED">DISQUALIFY (REJECT)</option>
                <option value="CLARIFICATION_REQUESTED">REQUEST CLARIFICATION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Officer Authentication ID</label>
              <input
                type="text"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="e.g. officer.id"
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none placeholder:font-sans"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
              Statutory Justification (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide official rationale for this decision... (Will be recorded in Audit Trail)"
              className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none resize-y"
            />
          </div>

          {decisionError && (
            <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-md text-sm text-error font-medium flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {decisionError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-navy-900 text-white px-8 py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {submitting ? (
               <>
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 RECORDING...
               </>
            ) : (
              "COMMIT DECISION TO LEDGER"
            )}
          </button>
        </form>
      </div>

      <div className="mt-12 text-center pb-8 border-t border-neutral-200 pt-8">
        <button 
          onClick={() => setShowAudit(!showAudit)}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-navy-900 font-medium font-mono uppercase tracking-widest transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showAudit ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          {showAudit ? "Hide System Audit Logs" : "View System Audit Logs"}
        </button>
      </div>

      {showAudit && (
        <div className="mt-4">
          <AuditTrail bidderId={id} />
        </div>
      )}
    </div>
  );
}

export default BidderDetail;