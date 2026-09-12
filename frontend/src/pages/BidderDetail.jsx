import api from "../api/client";
import AuditTrail from "../components/AuditTrail";
import { useEffect, useState, Fragment } from "react";
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

const ScoreImpactExplanation = ({ aiDetails, score, status, risk }) => (
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
      <div className="bg-info/10 border border-info/20 rounded-xl p-5 shadow-sm flex flex-col justify-center text-xs text-info-900 font-medium">
          ℹ️ This score is an automated deterministic assessment based on extracted evidence. The procurement officer retains final authority.
      </div>
    </div>
    
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden mt-6">
       <div className="bg-navy-900 text-white px-6 py-4 flex justify-between items-center">
           <h3 className="font-bold uppercase tracking-widest text-sm">Why this score? (Impact Trace)</h3>
           <div className="text-xs font-mono">Starting Assessment: <span className="font-bold text-base">100</span></div>
       </div>
       <div className="divide-y divide-neutral-100">
          {aiDetails?.findings && aiDetails.findings.length > 0 ? (
              aiDetails.findings.map((f, i) => (
                  <div key={i} className="p-6 hover:bg-neutral-50/50">
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{f.requirementName}</span>
                             <span className="text-sm font-bold text-navy-900 mt-1">{f.reason}</span>
                          </div>
                          <div className={`px-3 py-2 rounded-lg font-mono text-sm font-bold flex flex-col items-end ${f.severity === 'CRITICAL' ? 'bg-error/10 text-error' : f.severity === 'MAJOR' ? 'bg-error/10 text-error' : f.severity === 'REVIEW' ? 'bg-warning/10 text-warning' : 'bg-neutral-100 text-neutral-500'}`}>
                             <span>Impact: {f.severity}</span>
                             <span>-{f.points}</span>
                          </div>
                      </div>
                      <EvidenceBlock evidence={f.evidence} />
                  </div>
              ))
          ) : (
              <div className="p-6 text-sm text-neutral-500 italic">No deductions found. Bidder meets all evaluated requirements successfully.</div>
          )}
          <div className="p-6 bg-neutral-50 flex justify-between items-center border-t border-neutral-200">
              <span className="font-bold text-navy-900 uppercase tracking-widest text-sm">Final Compliance Assessment Score</span>
              <span className="font-black font-mono text-xl text-navy-900">{score !== null ? score : '--'}/100</span>
          </div>
       </div>
    </div>
  </div>
);


const StatutoryVerification = ({ checks }) => {
    const statutoryChecks = checks.filter(c => !c.bidSubmission);
    if (!statutoryChecks || statutoryChecks.length === 0) return null;

    const getFriendlyName = (cat) => {
        const map = {
            "GST_REGISTRATION": "GST Registration Verification",
            "GST_RETURN_FILING": "GST Return Verification",
            "PAN_INCOME_TAX": "PAN Verification",
            "UDYAM_MSME": "Udyam Registration",
            "MCA21_STATUS": "Company Registration (MCA)",
            "BLACKLIST_DEBARMENT": "Blacklist / Debarment Check",
            "CROSS_FIELD_CONSISTENCY": "Statutory Field Consistency"
        };
        return map[cat] || cat;
    };

    const passCount = statutoryChecks.filter(c => c.result === "PASS").length;
    const reviewCount = statutoryChecks.filter(c => c.result === "REVIEW" || c.result === "WARNING" || c.result === "NOT_FOUND").length;
    const failCount = statutoryChecks.filter(c => c.result === "FAIL").length;

    return (
        <div className="mb-8">
            <SectionHeader title="Statutory & Registration Verification" icon="🏛️" />
            
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden mb-4">
                <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                    <h3 className="font-bold text-navy-900 tracking-wide text-xs uppercase">Statutory Verification Summary</h3>
                    <div className="text-xs font-mono font-bold">
                        {statutoryChecks.length} checks evaluated: {passCount} PASS, {reviewCount} REVIEW, {failCount} FAIL
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {statutoryChecks.map(c => (
                    <div key={c._id} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="flex-1">
                            <h4 className="font-bold text-navy-900 mb-1">{getFriendlyName(c.category)}</h4>
                            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <span>Source: {c.sourceName || c.sourceType}</span>
                                <span>•</span>
                                <span>{c.sourceType === "SIMULATED" ? "SIMULATED / DEMO VERIFICATION" : c.sourceType}</span>
                                {c.createdAt && (
                                    <>
                                        <span>•</span>
                                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                                    </>
                                )}
                            </div>
                            <div className="text-sm font-medium text-navy-900 mb-2">
                                {c.detail || "No details provided."}
                            </div>
                            {c.rawResponse && <EvidenceBlock evidence={c.rawResponse} />}
                        </div>
                        <div className="flex-shrink-0 mt-1 sm:mt-0">
                            <StatusBadge status={c.result} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RequirementCoverageMatrix = ({ matrix }) => {
  if (!matrix || matrix.length === 0) return null;
  return (
    <div className="mb-8">
      <SectionHeader title="Eligibility & Requirement Coverage" icon="📋" />
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

const DocumentVerificationTimeline = ({ documentType, checks, docs }) => {
    // Collect stages
    const stages = [];
    const doc = docs.find(d => d.docType === documentType);
    
    if (doc) {
        stages.push({ stage: "DOCUMENT RECEIVED", status: "PASS", reason: "Document submitted and successfully uploaded." });
        if (doc.extractedFields) {
            stages.push({ stage: "DATA EXTRACTED", status: "PASS", reason: "Canonical data successfully extracted via AI Semantic Engine." });
        }
    } else {
        stages.push({ stage: "DOCUMENT RECEIVED", status: "NOT_FOUND", reason: "Required document missing from submission." });
        return (
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                    <h3 className="font-bold text-navy-900 tracking-wide">{documentType.replace(/_/g, " ")} Verification</h3>
                    <StatusBadge status="NOT_FOUND" />
                </div>
                <div className="p-6">
                    <div className="flex flex-col gap-4">
                        {stages.map((s, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="mt-1"><StatusBadge status={s.status} /></div>
                                <div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{s.stage}</div>
                                    <div className="text-sm text-navy-900 mt-1">{s.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const docChecks = checks.filter(c => c.documentType === documentType || (c.evidence && JSON.stringify(c.evidence).includes(documentType)));
    
    // Identity Check
    const identity = docChecks.filter(c => c.rule === "BIDDER_OWNERSHIP" || c.rule === "GSTIN_MATCH" || c.rule === "PAN_MATCH" || c.name?.includes("Identity"));
    identity.forEach(c => stages.push({ stage: "IDENTITY CHECK", status: c.status, reason: c.reason, evidence: c.evidence }));

    // Internal Consistency Check
    const internal = docChecks.filter(c => c.rule === "INTERNAL_CONSISTENCY" || c.rule === "INTERNAL_DATE_ORDER" || c.rule === "INTERNAL_PERCENT_VALIDITY");
    internal.forEach(c => stages.push({ stage: "INTERNAL CONSISTENCY CHECK", status: c.status, reason: c.reason, evidence: c.evidence }));

    // Field/Numeric Checks
    const numeric = docChecks.filter(c => c.targetRule || c.rule === "MIN_VALUE" || c.rule === "MIN_DURATION_YEARS" || c.rule === "EXACT_MATCH");
    numeric.forEach(c => stages.push({ stage: "FIELD / NUMERIC CHECKS", status: c.status, reason: c.reason, evidence: c.evidence }));
    
    // Cross-Document Check
    const cross = docChecks.filter(c => c.rule === "EXP_VS_PAST_PERFORMANCE" || c.rule === "MII_VS_OEM_AUTH" || c.sourceDoc === "Cross-Document Engine");
    cross.forEach(c => stages.push({ stage: "CROSS-DOCUMENT CHECK", status: c.status, reason: c.reason, evidence: c.evidence }));

    // Determine overall
    let overallStatus = "PASS";
    if (stages.some(s => s.status === "FAIL")) overallStatus = "FAIL";
    else if (stages.some(s => s.status === "REVIEW" || s.status === "NOT_FOUND")) overallStatus = "REVIEW";

    return (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-bold text-navy-900 tracking-wide">{documentType.replace(/_/g, " ")} Verification</h3>
                <StatusBadge status={overallStatus} />
            </div>
            <div className="p-6">
                <div className="flex flex-col gap-6">
                    {stages.map((s, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="mt-1 w-24 flex-shrink-0"><StatusBadge status={s.status} /></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{s.stage}</div>
                                <div className="text-sm font-medium text-navy-900 mt-1 mb-1 break-words">{s.reason}</div>
                                {s.evidence && <EvidenceBlock evidence={s.evidence} />}
                            </div>
                        </div>
                    ))}
                    <div className="border-t border-neutral-100 pt-4 mt-2 flex items-center gap-4">
                        <div className="text-xs font-bold text-navy-900 uppercase tracking-widest w-24">FINAL RESULT</div>
                        <StatusBadge status={overallStatus} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerificationTimelines = ({ checks, documents }) => {
    // Extract unique document types from required coverage matrix and uploaded docs
    const docTypes = new Set();
    const matrix = checks.find(c => c.sourceName === "Tender Requirement Coverage")?.rawResponse || [];
    matrix.forEach(r => { if (r.documentType) docTypes.add(r.documentType); });
    documents.forEach(d => docTypes.add(d.docType));

    // Flatten all checks to pass them easily
    let allChecks = [];
    checks.forEach(c => {
        if (c.rawResponse && Array.isArray(c.rawResponse)) {
            allChecks = allChecks.concat(c.rawResponse.map(r => ({...r, sourceDoc: c.sourceName})));
        } else if (c.rawResponse) {
            allChecks.push({...c.rawResponse, sourceDoc: c.sourceName});
        }
    });

    return (
        <div className="mb-8">
            <SectionHeader title="Document-Level Verification Timelines" icon="🔍" />
            {Array.from(docTypes).map(dt => (
                <DocumentVerificationTimeline key={dt} documentType={dt} checks={allChecks} docs={documents} />
            ))}
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

const ExtractedData = ({ documents }) => {
    return (
        <div className="mb-8">
            <SectionHeader title="Extracted Canonical Data" icon="🗃️" />
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

  const coverageMatrix = checks.find(c => c.sourceName === "Tender Requirement Coverage")?.rawResponse || [];
  
  const decisionProps = { decision, setDecision, reason, setReason, officerId, setOfficerId, submitting, decisionError, onSubmit: handleSubmitDecision, currentDecision: bidder.officerDecision };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8 pt-6">
      <TenderSummary bidder={bidder} runningChecks={runningChecks} onRunChecks={handleRunChecks} navigate={navigate} />
      <ScoreImpactExplanation aiDetails={bidder.aiAssessmentDetails} score={bidder.complianceScore} status={bidder.complianceStatus} risk={bidder.riskLevel} />
      <VerificationTimelines checks={checks} documents={bidder.documents || []} />
      <StatutoryVerification checks={checks} />
      <RequirementCoverageMatrix matrix={coverageMatrix} />
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
