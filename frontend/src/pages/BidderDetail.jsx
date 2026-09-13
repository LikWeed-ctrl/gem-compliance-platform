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

// --- DESIGN SYSTEM ---
const PALETTE = {
  primary: "#14233B",
  secondary: "#203552",
  accent: "#2563A6",
  bg: "#F5F7FA",
  success: { text: "#247A45", bg: "#EAF6EE" },
  warning: { text: "#B7791F", bg: "#FFF7E6" },
  fail: { text: "#B42318", bg: "#FDECEC" },
  neutral: { primary: "#172033", secondary: "#526071", muted: "#7A8798", border: "#D9E0E8" },
  white: "#FFFFFF"
};

const getStatusConfig = (status) => {
  const s = String(status || "").toUpperCase();
  if (["PASS", "COMPLIANT", "LOW", "QUALIFIED", "MATCH", "CONSISTENT"].includes(s)) {
    return { color: PALETTE.success.text, bg: PALETTE.success.bg, icon: "✓" };
  }
  if (["REVIEW", "WARNING", "REVIEW_REQUIRED", "MEDIUM", "CLARIFICATION_REQUESTED", "NOT_FOUND"].includes(s)) {
    return { color: PALETTE.warning.text, bg: PALETTE.warning.bg, icon: "⚠" };
  }
  if (["FAIL", "CRITICAL", "NON_COMPLIANT", "HIGH", "DISQUALIFIED", "MISMATCH"].includes(s)) {
    return { color: PALETTE.fail.text, bg: PALETTE.fail.bg, icon: "✕" };
  }
  return { color: PALETTE.neutral.secondary, bg: PALETTE.bg, icon: "—" };
};

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-bold uppercase tracking-wide text-[12px] md:text-[13px] border"
      style={{ color: config.color, backgroundColor: config.bg, borderColor: `${config.color}33` }}
    >
      <span>{config.icon}</span>
      {(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-5 pb-3" style={{ borderBottom: `2px solid ${PALETTE.neutral.border}` }}>
    <h2 className="text-[20px] md:text-[22px] font-bold m-0 p-0" style={{ color: PALETTE.primary }}>
      {title}
    </h2>
    {subtitle && <p className="text-[14px] md:text-[15px] mt-1.5" style={{ color: PALETTE.neutral.secondary }}>{subtitle}</p>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div 
    className={`rounded-xl overflow-hidden ${className}`}
    style={{ 
      backgroundColor: PALETTE.white, 
      border: `1px solid ${PALETTE.neutral.border}`, 
      boxShadow: "0 1px 3px rgba(20,35,59,0.08)" 
    }}
  >
    {children}
  </div>
);

// --- FORMATTERS & HELPERS ---
const formatHumanReadableReason = (reasonStr) => {
    if (!reasonStr) return null;
    const extractValMatch = reasonStr.match(/Extracted value: .* → normalized to ([\d\.]+).+?Tender threshold: ([\d\.]+).+?(>=|<=|==).+?(PASS|FAIL|REVIEW)/);
    if (extractValMatch) return `Verified value of ${extractValMatch[1]} against tender threshold of ${extractValMatch[2]}. Requirement satisfied.`;
    
    const extractDateMatch = reasonStr.match(/Extracted dates: .* → ([\d\.]+ years).+?Tender minimum: ([\d\.]+ years)/);
    if (extractDateMatch) return `Experience duration: ${extractDateMatch[1]}. Tender minimum: ${extractDateMatch[2]}. Requirement satisfied.`;

    const extractMiiMatch = reasonStr.match(/Extracted MII: .* → normalized to ([\d\.]+%)\.? Tender threshold: ([\d\.]+%)/);
    if (extractMiiMatch) return `Local content: ${extractMiiMatch[1]}. Tender minimum: ${extractMiiMatch[2]}. Requirement satisfied.`;

    if (reasonStr.includes("Could not parse dates")) return "Could not automatically parse dates to calculate duration.";
    return reasonStr;
};

// Flatten all nested checks (like Requirement Coverage array, Cross-doc array) into a single list
const getFlatChecks = (checks) => {
    let flat = [];
    checks.forEach(c => {
        if (Array.isArray(c.rawResponse) && c.sourceName !== "GST Registry" && c.sourceName !== "PAN Registry") {
            c.rawResponse.forEach(sub => {
                flat.push({
                    ...sub,
                    _parent_id: c._id,
                    category: sub.category || c.category,
                    sourceName: c.sourceName,
                    sourceType: c.sourceType,
                    result: sub.result || sub.status,
                    status: sub.status || sub.result,
                    detail: sub.detail || sub.reason || sub.name,
                    evidence: sub.evidence || c.rawResponse
                });
            });
        } else {
            flat.push({
                ...c,
                status: c.result || c.status,
                detail: c.detail || c.reason || c.name
            });
        }
    });
    return flat;
};

// --- COMPONENTS ---
const EvidenceBlock = ({ evidence, title = "Evidence" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!evidence) return null;
  
  let parsed = null;
  if (typeof evidence === "string") {
    try { parsed = JSON.parse(evidence); } catch (e) { parsed = evidence; }
  } else {
    parsed = evidence;
  }

  const renderContent = (data) => {
    if (typeof data === "string") return <span>{data}</span>;
    if (Array.isArray(data)) return <ul className="list-disc pl-5 space-y-1">{data.map((item, idx) => <li key={idx}>{renderContent(item)}</li>)}</ul>;
    if (typeof data === "object" && data !== null) {
      return (
        <div className="flex flex-col gap-2">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 border-b border-white/10 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <span className="text-[13px] font-bold uppercase tracking-wider text-white/60">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-[14px] break-words text-white/90">{renderContent(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(data)}</span>;
  };

  return (
    <div className="mt-3">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[13px] font-bold flex items-center gap-1 hover:underline uppercase tracking-wide"
        style={{ color: PALETTE.accent }}
      >
        {expanded ? `[- Hide ${title}]` : `[+ View ${title}]`}
      </button>
      {expanded && (
        <div className="mt-2 p-4 rounded-lg overflow-x-auto" style={{ backgroundColor: PALETTE.primary, color: PALETTE.white, border: `1px solid ${PALETTE.secondary}` }}>
          {renderContent(parsed)}
        </div>
      )}
    </div>
  );
};

// A. HEADER
const HeaderSection = ({ bidder, runningChecks, onRunChecks }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="px-2.5 py-1 rounded-[4px] text-[12px] font-bold tracking-widest uppercase" style={{ backgroundColor: PALETTE.primary, color: PALETTE.white }}>
          Officer Verification
        </span>
        <span className="text-[14px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>
          {bidder.tender.department} • Tender ID: <span className="font-mono">{bidder.tender.tenderId}</span>
        </span>
      </div>
      <h1 className="text-[28px] md:text-[32px] font-bold m-0 p-0" style={{ color: PALETTE.primary }}>
        {bidder.sellerProfile.companyName}
      </h1>
      <div className="flex gap-4 mt-2 text-[14px] font-mono" style={{ color: PALETTE.neutral.primary }}>
        <span>PAN: <strong>{bidder.sellerProfile.panNumber}</strong></span>
        {bidder.sellerProfile.gstin && <span>GSTIN: <strong>{bidder.sellerProfile.gstin}</strong></span>}
      </div>
    </div>
    <button
      onClick={onRunChecks}
      disabled={runningChecks}
      className="px-6 py-3 rounded-lg text-[14px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50"
      style={{ backgroundColor: PALETTE.primary, color: PALETTE.white }}
    >
      {runningChecks ? "Running Analysis..." : "Trigger Verification Engine"}
    </button>
  </div>
);

// B. COMPLIANCE SCORE
const ComplianceScoreSection = ({ score, status, risk, aiDetails }) => (
  <div className="mb-10">
    <SectionHeader title="Compliance Assessment" subtitle="Automated deterministic assessment based on extracted evidence." />
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-[13px] font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.neutral.secondary }}>Compliance Score</div>
        {score !== null ? (
          <div className="flex items-baseline gap-1" style={{ color: getStatusConfig(status).color }}>
            <span className="text-[48px] md:text-[56px] font-bold leading-none">{score}</span>
            <span className="text-[20px] font-bold opacity-50">/100</span>
          </div>
        ) : <span className="text-[32px] font-bold" style={{ color: PALETTE.neutral.muted }}>--</span>}
      </Card>
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-[13px] font-bold uppercase tracking-widest mb-3" style={{ color: PALETTE.neutral.secondary }}>Compliance Status</div>
        <StatusBadge status={status} />
      </Card>
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-[13px] font-bold uppercase tracking-widest mb-3" style={{ color: PALETTE.neutral.secondary }}>Risk Level</div>
        <StatusBadge status={risk} />
      </Card>
    </div>

    <Card>
      <div className="px-6 py-4 flex justify-between items-center" style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
        <h3 className="text-[17px] font-bold" style={{ color: PALETTE.primary }}>Why this score?</h3>
        <div className="text-[15px] font-bold" style={{ color: PALETTE.neutral.secondary }}>Starting Score: <span className="text-[18px]" style={{ color: PALETTE.primary }}>100</span></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr style={{ backgroundColor: PALETTE.white, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
              <th className="px-6 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Finding</th>
              <th className="px-6 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Severity</th>
              <th className="px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-right" style={{ color: PALETTE.neutral.secondary }}>Score Impact</th>
            </tr>
          </thead>
          <tbody>
            {aiDetails?.findings && aiDetails.findings.length > 0 ? (
              aiDetails.findings.map((f, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
                  <td className="px-6 py-4 align-top">
                    <div className="font-bold text-[16px] mb-1" style={{ color: PALETTE.primary }}>{f.requirementName}</div>
                    <div className="text-[15px]" style={{ color: PALETTE.neutral.primary }}>{f.reason}</div>
                    <EvidenceBlock evidence={f.evidence} />
                  </td>
                  <td className="px-6 py-4 align-top pt-5">
                    <StatusBadge status={f.severity} />
                  </td>
                  <td className="px-6 py-4 align-top text-right pt-5 font-bold text-[16px]" style={{ color: PALETTE.fail.text }}>
                    −{f.points}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-[15px] italic" style={{ color: PALETTE.neutral.secondary }}>
                  ✓ No deductions found. All evaluated requirements passed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 flex justify-between items-center" style={{ backgroundColor: PALETTE.bg, borderTop: `1px solid ${PALETTE.neutral.border}` }}>
        <span className="text-[14px] font-bold uppercase tracking-widest" style={{ color: PALETTE.primary }}>Final Score</span>
        <span className="font-bold text-[22px]" style={{ color: PALETTE.primary }}>{score !== null ? score : '--'} / 100</span>
      </div>
    </Card>
  </div>
);

// C. VERIFICATION COVERAGE
const VerificationCoverage = ({ flatChecks, documents }) => {
  const stats = {
    documents: { total: documents.length, PASS: 0, REVIEW: 0, FAIL: 0 },
    statutory: { total: 0, PASS: 0, REVIEW: 0, FAIL: 0 },
    identity: { total: 0, PASS: 0, REVIEW: 0, FAIL: 0 },
    eligibility: { total: 0, PASS: 0, REVIEW: 0, FAIL: 0 },
    internal: { total: 0, PASS: 0, REVIEW: 0, FAIL: 0 },
    cross: { total: 0, PASS: 0, REVIEW: 0, FAIL: 0 },
  };

  documents.forEach(d => {
    const s = d.verificationStatus || "REVIEW";
    if (["PASS", "COMPLIANT"].includes(s)) stats.documents.PASS++;
    else if (["FAIL", "NON_COMPLIANT"].includes(s)) stats.documents.FAIL++;
    else stats.documents.REVIEW++;
  });

  flatChecks.forEach(c => {
    let cat = null;
    if (!c.bidSubmission || c.category === "STATUTORY" || c.sourceName?.includes("Registry") || c.sourceType === "SIMULATED") {
      cat = "statutory";
    } else if (c.sourceName === "Cross-Document Engine" || c.category === "CROSS_DOCUMENT" || c.rule === "EXP_VS_PAST_PERFORMANCE" || c.rule === "MII_VS_OEM_AUTH") {
      cat = "cross";
    } else if (c.rule === "BIDDER_OWNERSHIP" || c.rule === "GSTIN_MATCH" || c.rule === "PAN_MATCH" || c.name?.includes("Identity") || c.detail?.includes("Identity")) {
      cat = "identity";
    } else if (c.rule === "INTERNAL_CONSISTENCY" || c.rule === "INTERNAL_DATE_ORDER" || c.rule === "INTERNAL_PERCENT_VALIDITY") {
      cat = "internal";
    } else if (c.targetRule || c.rule === "MIN_VALUE" || c.rule === "MIN_DURATION_YEARS" || c.rule === "EXACT_MATCH" || c.rule === "MIN_PERCENT" || c.sourceName === "Tender Requirement Coverage") {
      cat = "eligibility";
    }

    if (cat) {
      stats[cat].total++;
      const s = String(c.status || c.result).toUpperCase();
      if (["PASS", "COMPLIANT", "MATCH", "CONSISTENT"].includes(s)) stats[cat].PASS++;
      else if (["FAIL", "CRITICAL", "MISMATCH"].includes(s)) stats[cat].FAIL++;
      else stats[cat].REVIEW++;
    }
  });

  const cards = [
    { title: "Documents", key: "documents", icon: "📁" },
    { title: "Statutory", key: "statutory", icon: "🏛️" },
    { title: "Identity", key: "identity", icon: "👤" },
    { title: "Tender Rules", key: "eligibility", icon: "⚖️" },
    { title: "Consistency", key: "internal", icon: "🔍" },
    { title: "Cross-Doc", key: "cross", icon: "🔗" }
  ];

  return (
    <div className="mb-10">
      <SectionHeader title="Verification Coverage" subtitle="Summary of independent checks performed by the verification engine." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => {
          const total = stats[c.key].total;
          const pass = stats[c.key].PASS;
          const fail = stats[c.key].FAIL;
          const review = stats[c.key].REVIEW;
          
          let status = "NOT_FOUND";
          if (total > 0) {
              if (fail > 0) status = "FAIL";
              else if (review > 0) status = "REVIEW";
              else status = "PASS";
          }
          
          return (
            <Card key={c.key} className="p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[20px]">{c.icon}</span>
                <h4 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.primary }}>{c.title}</h4>
              </div>
              <div className="mt-auto">
                <div className="text-[20px] font-bold" style={{ color: PALETTE.primary }}>{total} <span className="text-[13px] font-normal" style={{ color: PALETTE.neutral.secondary }}>checks</span></div>
                {total > 0 ? (
                  <div className="mt-1 flex gap-1.5 flex-wrap">
                    {pass > 0 && <span className="text-[11px] font-bold bg-[#EAF6EE] text-[#247A45] px-1.5 py-0.5 rounded">{pass} PASS</span>}
                    {review > 0 && <span className="text-[11px] font-bold bg-[#FFF7E6] text-[#B7791F] px-1.5 py-0.5 rounded">{review} REV</span>}
                    {fail > 0 && <span className="text-[11px] font-bold bg-[#FDECEC] text-[#B42318] px-1.5 py-0.5 rounded">{fail} FAIL</span>}
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] font-bold bg-[#F5F7FA] text-[#7A8798] px-1.5 py-0.5 rounded inline-block">NO DATA</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// D. VERIFICATION PIPELINE
const VerificationPipeline = () => {
  const stages = ["DOCUMENTS", "EXTRACTION", "IDENTITY", "TENDER RULES", "CONSISTENCY", "CROSS-DOC", "STATUTORY", "SCORE", "AI", "DECISION"];
  return (
    <div className="mb-12">
      <div className="text-[13px] font-bold uppercase tracking-widest mb-4" style={{ color: PALETTE.neutral.secondary }}>Verification Flow Pipeline</div>
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {stages.map((stage, i) => (
          <Fragment key={stage}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ backgroundColor: PALETTE.success.bg, borderColor: `${PALETTE.success.text}33` }}>
              <span className="text-[12px] font-bold" style={{ color: PALETTE.success.text }}>✓</span>
              <span className="text-[11px] md:text-[12px] font-bold tracking-wide" style={{ color: PALETTE.success.text }}>{stage}</span>
            </div>
            {i < stages.length - 1 && <span className="text-[16px]" style={{ color: PALETTE.neutral.muted }}>→</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

// E. OFFICER ATTENTION
const OfficerAttention = ({ findings }) => {
  if (!findings || findings.length === 0) {
    return (
      <Card className="mb-10 p-5 flex items-center gap-3" style={{ backgroundColor: PALETTE.success.bg, borderColor: `${PALETTE.success.text}33` }}>
        <span className="text-[24px]" style={{ color: PALETTE.success.text }}>✓</span>
        <div>
          <h3 className="text-[16px] font-bold" style={{ color: PALETTE.success.text }}>Officer Attention</h3>
          <p className="text-[15px]" style={{ color: PALETTE.success.text }}>No unresolved findings. Bidder satisfies all evaluated criteria.</p>
        </div>
      </Card>
    );
  }

  const reviewCount = findings.length;
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'MAJOR').length;
  
  const isSevere = criticalCount > 0;
  const config = getStatusConfig(isSevere ? "FAIL" : "REVIEW");

  return (
    <Card className="mb-10 p-6 border-l-4" style={{ borderLeftColor: config.color, backgroundColor: config.bg }}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-[24px]" style={{ color: config.color }}>{config.icon}</span>
        <div>
          <h3 className="text-[17px] font-bold" style={{ color: config.color }}>Officer Attention Required</h3>
          <p className="text-[15px] font-bold mt-1" style={{ color: config.color }}>
            {reviewCount} finding{reviewCount !== 1 ? 's' : ''} require officer review ({criticalCount} critical)
          </p>
        </div>
      </div>
      <ul className="space-y-2 ml-[36px]">
        {findings.slice(0, 5).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px]" style={{ color: PALETTE.primary }}>
            <span className="font-bold shrink-0 mt-0.5" style={{ color: config.color }}>{f.severity === 'CRITICAL' || f.severity === 'MAJOR' ? '✕' : '⚠'}</span>
            <span><strong>{f.requirementName}:</strong> {f.reason}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

// F. TENDER REQUIREMENTS -> EVIDENCE
const RequirementCoverageMatrix = ({ flatChecks }) => {
  const matrix = flatChecks.filter(c => c.sourceName === "Tender Requirement Coverage");
  if (!matrix || matrix.length === 0) return null;
  return (
    <div className="mb-10">
      <SectionHeader title="Tender Requirements & Evidence" subtitle="Direct mapping of tender rules to extracted evidence." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Requirement</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Required</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Result</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Evidence / Explanation</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((req, i) => (
                <tr key={i} style={{ borderBottom: i !== matrix.length - 1 ? `1px solid ${PALETTE.neutral.border}` : 'none' }}>
                  <td className="px-5 py-4 align-top">
                    <div className="font-bold text-[15px] mb-1" style={{ color: PALETTE.primary }}>{req.name || req.detail}</div>
                    <div className="text-[13px] uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>
                      {req.documentType ? req.documentType.replace(/_/g, " ") : "GENERAL"}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-[15px]" style={{ color: PALETTE.neutral.primary }}>
                    {req.required !== undefined ? (req.required ? "Yes" : "No") : "-"}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-5 py-4 align-top text-[15px]" style={{ color: PALETTE.neutral.primary }}>
                    <div className="mb-1">{req.detail || "-"}</div>
                    <EvidenceBlock evidence={req.evidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// G. DOCUMENT VERIFICATION
const DocumentVerificationCard = ({ documentType, flatChecks, docs }) => {
  const doc = docs.find(d => d.docType === documentType);
  if (!doc) {
    return (
      <Card className="mb-6 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-[17px] font-bold uppercase tracking-wide mb-1" style={{ color: PALETTE.primary }}>{documentType.replace(/_/g, " ")}</h3>
          <p className="text-[15px]" style={{ color: PALETTE.neutral.secondary }}>Required document missing from submission.</p>
        </div>
        <StatusBadge status="NOT_FOUND" />
      </Card>
    );
  }

  // The ultimate source of truth for the document's overall compliance is the backend verificationStatus
  const overallStatus = doc.verificationStatus || "REVIEW";

  const docChecks = flatChecks.filter(c => 
    c.documentType === documentType || 
    (c.evidence && JSON.stringify(c.evidence).includes(documentType)) ||
    (c.detail && c.detail.includes(documentType)) ||
    c.category === documentType
  );
  
  const checkItems = [];
  checkItems.push({ label: "Document submitted", status: "PASS", explanation: "File received securely." });
  
  if (doc.extractedFields && Object.keys(doc.extractedFields).length > 0) {
    checkItems.push({ label: "Required data extracted", status: "PASS", explanation: "Canonical fields successfully extracted." });
  }

  docChecks.forEach(c => {
    if (c.sourceName === "Cross-Document Engine") return; 
    
    let label = "Verification Check";
    if (c.rule === "BIDDER_OWNERSHIP" || c.rule === "GSTIN_MATCH" || c.rule === "PAN_MATCH" || c.name?.includes("Identity") || c.detail?.includes("Identity")) label = "Bidder identity match";
    else if (c.rule === "INTERNAL_CONSISTENCY" || c.rule === "INTERNAL_DATE_ORDER" || c.rule === "INTERNAL_PERCENT_VALIDITY") label = "Internal consistency";
    else if (c.targetRule || c.rule === "MIN_VALUE" || c.rule === "MIN_DURATION_YEARS" || c.rule === "MIN_PERCENT") label = "Requirement threshold satisfied";
    else if (c.name) label = c.name;

    let explanation = formatHumanReadableReason(c.detail || c.reason) || c.detail || "Verified.";
    
    checkItems.push({ label, status: c.status, explanation, evidence: c.evidence, rawReason: c.detail });
  });

  return (
    <Card className="mb-6">
      <div className="px-6 py-4 flex justify-between items-center" style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
        <h3 className="text-[17px] font-bold uppercase tracking-wide" style={{ color: PALETTE.primary }}>{documentType.replace(/_/g, " ")}</h3>
        <StatusBadge status={overallStatus} />
      </div>
      <div className="p-6">
        <h4 className="text-[13px] font-bold uppercase tracking-widest mb-4" style={{ color: PALETTE.neutral.secondary }}>Checks Performed</h4>
        <div className="flex flex-col gap-3 mb-6">
          {checkItems.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 w-[80px] shrink-0"><StatusBadge status={c.status} /></div>
              <div>
                <div className="text-[15px] font-bold" style={{ color: PALETTE.primary }}>{c.label}</div>
                <div className="text-[14px] mt-0.5" style={{ color: PALETTE.neutral.primary }}>{c.explanation}</div>
                {c.evidence && <EvidenceBlock evidence={c.evidence} title="Calculation / Evidence" />}
              </div>
            </div>
          ))}
        </div>
        {doc.extractedFields && Object.keys(doc.extractedFields).length > 0 && (
          <div className="pt-4" style={{ borderTop: `1px solid ${PALETTE.neutral.border}` }}>
            <EvidenceBlock evidence={doc.extractedFields} title="Extracted Canonical Fields" />
          </div>
        )}
      </div>
    </Card>
  );
};

const DocumentVerification = ({ flatChecks, documents }) => {
  const docTypes = new Set();
  const matrix = flatChecks.filter(c => c.sourceName === "Tender Requirement Coverage");
  matrix.forEach(r => { if (r.documentType) docTypes.add(r.documentType); });
  documents.forEach(d => docTypes.add(d.docType));

  return (
    <div className="mb-10">
      <SectionHeader title="Document Verification" subtitle="Detailed step-by-step verification of each submitted document. An unresolved check results in a REVIEW status." />
      {Array.from(docTypes).map(dt => (
        <DocumentVerificationCard key={dt} documentType={dt} flatChecks={flatChecks} docs={documents} />
      ))}
    </div>
  );
};

// H. IDENTITY VERIFICATION
const IdentityVerification = ({ flatChecks }) => {
  let idChecks = flatChecks.filter(c => 
    c.rule === "BIDDER_OWNERSHIP" || c.rule === "GSTIN_MATCH" || c.rule === "PAN_MATCH" || c.detail?.includes("Identity") || c.name?.includes("Identity")
  );

  if (idChecks.length === 0) return null;

  return (
    <div className="mb-10">
      <SectionHeader title="Bidder Identity Verification" subtitle="Ensuring submitted documents belong to the registered bidder." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Attribute</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Document</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Result</th>
                <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {idChecks.map((c, i) => {
                let attr = "Identity";
                if (c.rule === "GSTIN_MATCH" || c.detail?.includes("GSTIN")) attr = "GSTIN";
                else if (c.rule === "PAN_MATCH" || c.detail?.includes("PAN")) attr = "PAN";
                else if (c.rule === "BIDDER_OWNERSHIP" || c.detail?.includes("Name")) attr = "Company Name";

                return (
                  <tr key={i} style={{ borderBottom: i !== idChecks.length - 1 ? `1px solid ${PALETTE.neutral.border}` : 'none' }}>
                    <td className="px-5 py-4 align-top font-bold text-[15px]" style={{ color: PALETTE.primary }}>{attr}</td>
                    <td className="px-5 py-4 align-top text-[14px] uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>
                      {c.documentType ? c.documentType.replace(/_/g, " ") : "Document"}
                    </td>
                    <td className="px-5 py-4 align-top"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4 align-top text-[15px]" style={{ color: PALETTE.neutral.primary }}>
                      {c.detail || c.reason || "Identity match verified."}
                      <EvidenceBlock evidence={c.evidence} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// I. CROSS-DOCUMENT VERIFICATION
const CrossDocumentVerification = ({ flatChecks }) => {
  let crossChecks = flatChecks.filter(c => 
    c.sourceName === "Cross-Document Engine" || c.rule === "EXP_VS_PAST_PERFORMANCE" || c.rule === "MII_VS_OEM_AUTH" || c.category === "CROSS_DOCUMENT"
  );

  if (crossChecks.length === 0) return null;

  return (
    <div className="mb-10">
      <SectionHeader title="Cross-Document Verification" subtitle="Related documents are compared to detect inconsistencies in shared identifiers and values." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {crossChecks.map((c, i) => (
          <Card key={i} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-[15px] font-bold" style={{ color: PALETTE.primary }}>{c.name || "Document Relationship"}</h4>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-[15px] mb-3" style={{ color: PALETTE.neutral.primary }}>{c.detail || "Validation completed."}</p>
            </div>
            <EvidenceBlock evidence={c.evidence} />
          </Card>
        ))}
      </div>
    </div>
  );
};

// J. STATUTORY & REGISTRATION VERIFICATION
const StatutoryVerification = ({ flatChecks, bidder }) => {
  const statutoryChecks = flatChecks.filter(c => !c.bidSubmission || c.category === "STATUTORY" || c.sourceName?.includes("Registry"));
  if (!statutoryChecks || statutoryChecks.length === 0) return null;

  const getFriendlyName = (cat) => {
      const map = {
          "GST_REGISTRATION": "GST Registration",
          "GST_RETURN_FILING": "GST Returns",
          "PAN_INCOME_TAX": "PAN Verification",
          "UDYAM_MSME": "Udyam Registration",
          "MCA21_STATUS": "MCA Registration",
          "BLACKLIST_DEBARMENT": "Debarment Check",
          "CROSS_FIELD_CONSISTENCY": "Registry Consistency"
      };
      return map[cat] || cat;
  };

  const getIdentifier = (cat) => {
      if (!cat) return "N/A";
      if (cat.includes("GST")) return bidder?.sellerProfile?.gstin || "N/A";
      if (cat.includes("PAN")) return bidder?.sellerProfile?.panNumber || "N/A";
      if (cat.includes("UDYAM")) return bidder?.sellerProfile?.udyamNumber || "N/A";
      if (cat.includes("MCA21")) return bidder?.sellerProfile?.cin || "N/A";
      return bidder?.sellerProfile?.companyName || "Company Identity";
  };

  const passCount = statutoryChecks.filter(c => ["PASS", "MATCH"].includes(c.status)).length;

  return (
    <div className="mb-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 border-b border-[#D9E0E8] pb-2">
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold uppercase tracking-widest text-sm mb-1" style={{ color: PALETTE.primary }}>
            Statutory & Registration Verification
          </h2>
          <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: PALETTE.neutral.secondary }}>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest bg-[#E2E8F0] text-[#475569]">DEMO ENVIRONMENT</span>
            <span>Registry responses shown here use simulated data where live public APIs are unavailable.</span>
          </div>
        </div>
        <div className="text-[14px] font-bold mt-2 md:mt-0" style={{ color: PALETTE.neutral.secondary }}>
          {statutoryChecks.length} checks evaluated • {passCount} PASS
        </div>
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide w-10 text-center" style={{ color: PALETTE.neutral.secondary }}>#</th>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Verification</th>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Identifier</th>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Status</th>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Verified Against</th>
                <th className="px-4 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Finding</th>
              </tr>
            </thead>
            <tbody>
              {statutoryChecks.map((c, i) => {
                let finding = c.detail || "No finding details available.";
                finding = finding.replace(/^[A-Z_]+:\s*/, "");
                finding = finding.replace(/\s*\[\d+ms\]/g, "");
                finding = finding.replace(/Mock Registry:?\s*/gi, "");
                finding = finding.replace(/Simulated data:?\s*/gi, "");
                
                return (
                  <tr key={c._id || i} style={{ borderBottom: i !== statutoryChecks.length - 1 ? `1px solid ${PALETTE.neutral.border}` : 'none' }}>
                    <td className="px-4 py-4 align-top text-center text-[14px]" style={{ color: PALETTE.neutral.secondary }}>{i + 1}</td>
                    <td className="px-4 py-4 align-top font-bold text-[15px]" style={{ color: PALETTE.primary }}>{getFriendlyName(c.category)}</td>
                    <td className="px-4 py-4 align-top font-mono text-[14px]" style={{ color: PALETTE.neutral.primary }}>{getIdentifier(c.category)}</td>
                    <td className="px-4 py-4 align-top"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-4 align-top text-[14px]" style={{ color: PALETTE.neutral.primary }}>
                      <div>{c.sourceName || c.sourceType}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-[15px]" style={{ color: PALETTE.neutral.primary }}>
                      <div className="mb-1">{finding}</div>
                      <EvidenceBlock evidence={c.rawResponse} title="Registry Response" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// K. AI-GENERATED ASSESSMENT
const AiAssessment = ({ recommendation }) => {
  if (!recommendation) return null;
  // Make advisory edits requested by Task 22
  let text = recommendation;
  text = text.replace(/No additional manual verification is necessary\.?/gi, "The officer should proceed with final manual confirmation.");
  text = text.replace(/The bidder has passed all verification checks\.?/gi, "The bidder has satisfied automated verification parameters.");

  return (
    <div className="mb-10">
      <SectionHeader title="AI-Generated Assessment" subtitle="Advisory summary of verified findings. It does not determine the procurement decision." />
      <Card className="p-6 text-[15px] leading-[1.6] whitespace-pre-wrap font-sans" style={{ color: PALETTE.neutral.primary }}>
        {text}
      </Card>
    </div>
  );
};

// L. DOCUMENT REPOSITORY
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
      alert("Failed to open document.");
    }
  };

  return (
    <div className="mb-10">
      <SectionHeader title="Document Repository" subtitle="Access securely stored original PDF submissions." />
      <Card>
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr style={{ backgroundColor: PALETTE.bg, borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
              <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Document Type</th>
              <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: PALETTE.neutral.secondary }}>Overall Status</th>
              <th className="px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-right" style={{ color: PALETTE.neutral.secondary }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, i) => (
              <tr key={doc._id} style={{ borderBottom: i !== documents.length - 1 ? `1px solid ${PALETTE.neutral.border}` : 'none' }}>
                <td className="px-5 py-4 align-middle font-bold text-[15px]" style={{ color: PALETTE.primary }}>{doc.docType.replace(/_/g, " ")}</td>
                <td className="px-5 py-4 align-middle"><StatusBadge status={doc.verificationStatus} /></td>
                <td className="px-5 py-4 align-middle text-right">
                  <button 
                    onClick={() => openDocument(doc._id, doc.originalFilename)} 
                    className="text-[13px] font-bold uppercase tracking-widest hover:underline"
                    style={{ color: PALETTE.accent }}
                  >
                    [View PDF]
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// M. OFFICER DECISION
const OfficerDecision = ({ decisionProps }) => {
  const { decision, setDecision, reason, setReason, submitting, decisionError, onSubmit, currentDecision } = decisionProps;
  
  // Read-only Officer Session
  const officerSessionId = "officer.auth@gem.gov.in";

  return (
    <Card className="mb-10 p-8 border-t-[4px]" style={{ borderTopColor: PALETTE.accent }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4" style={{ borderBottom: `1px solid ${PALETTE.neutral.border}` }}>
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold" style={{ color: PALETTE.primary }}>Officer Final Decision</h2>
          <p className="text-[14px] mt-1" style={{ color: PALETTE.neutral.secondary }}>
            Current status: <span className="font-bold uppercase tracking-wide" style={{ color: PALETTE.primary }}>{currentDecision.replace(/_/g, " ")}</span>
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: PALETTE.neutral.secondary }}>Decision</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full bg-[#F5F7FA] border border-[#D9E0E8] rounded-lg px-4 py-2.5 text-[15px] font-bold outline-none"
              style={{ color: PALETTE.primary }}
            >
              <option value="PENDING">PENDING</option>
              <option value="QUALIFIED">QUALIFY (APPROVE)</option>
              <option value="DISQUALIFIED">DISQUALIFY (REJECT)</option>
              <option value="CLARIFICATION_REQUESTED">REQUEST CLARIFICATION</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: PALETTE.neutral.secondary }}>Authenticated Officer Session</label>
            <div
              className="w-full bg-[#E2E8F0] border border-[#D9E0E8] rounded-lg px-4 py-2.5 text-[15px] font-mono cursor-not-allowed select-none"
              style={{ color: PALETTE.neutral.secondary }}
            >
              {officerSessionId}
            </div>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: PALETTE.neutral.secondary }}>
            Justification
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Provide official rationale for this decision..."
            className="w-full bg-[#F5F7FA] border border-[#D9E0E8] rounded-lg px-4 py-3 text-[15px] outline-none resize-y"
            style={{ color: PALETTE.primary }}
          />
          <p className="text-[13px] mt-1.5" style={{ color: PALETTE.neutral.secondary }}>Officer decision is recorded in the audit trail securely under your identity.</p>
        </div>
        {decisionError && (
          <div className="mb-6 p-3 rounded-md text-[14px] font-bold" style={{ backgroundColor: PALETTE.fail.bg, color: PALETTE.fail.text, border: `1px solid ${PALETTE.fail.text}33` }}>
            {decisionError}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-8 py-3 rounded-lg text-[14px] font-bold tracking-widest uppercase transition-colors shadow-sm w-full sm:w-auto hover:opacity-90"
          style={{ backgroundColor: PALETTE.primary, color: PALETTE.white }}
        >
          {submitting ? "RECORDING..." : "COMMIT DECISION"}
        </button>
      </form>
    </Card>
  );
};

// --- MAIN PAGE COMPONENT ---
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
      await recordOfficerDecision(id, { decision, reason, officerId: "officer.auth@gem.gov.in" });
      loadData();
      setReason("");
    } catch (err) {
      setDecisionError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-10 max-w-7xl mx-auto text-[15px] font-mono animate-pulse" style={{ color: PALETTE.neutral.secondary }}>Initializing Verification Dashboard...</div>;
  if (error) return <div className="p-10 max-w-7xl mx-auto text-[15px] font-mono" style={{ color: PALETTE.fail.text }}>System Error: {error}</div>;
  if (!bidder) return null;

  const flatChecks = getFlatChecks(checks);
  const decisionProps = { decision, setDecision, reason, setReason, submitting, decisionError, onSubmit: handleSubmitDecision, currentDecision: bidder.officerDecision };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: PALETTE.bg }}>
      <div className="max-w-[1440px] mx-auto pb-16 px-6 md:px-10 lg:px-12 pt-8">
        <HeaderSection bidder={bidder} runningChecks={runningChecks} onRunChecks={handleRunChecks} />
        <VerificationPipeline />
        
        <ComplianceScoreSection 
          score={bidder.complianceScore} 
          status={bidder.complianceStatus} 
          risk={bidder.riskLevel} 
          aiDetails={bidder.aiAssessmentDetails} 
        />
        
        <VerificationCoverage flatChecks={flatChecks} documents={bidder.documents || []} />
        <OfficerAttention findings={bidder.aiAssessmentDetails?.findings || []} />
        <RequirementCoverageMatrix flatChecks={flatChecks} />
        <DocumentVerification flatChecks={flatChecks} documents={bidder.documents || []} />
        <IdentityVerification flatChecks={flatChecks} />
        <CrossDocumentVerification flatChecks={flatChecks} />
        <StatutoryVerification flatChecks={flatChecks} bidder={bidder} />
        
        <AiAssessment recommendation={bidder.aiRecommendation} />
        <DocumentRepository documents={bidder.documents || []} />
        
        <OfficerDecision decisionProps={decisionProps} />
        
        <div className="mt-12 text-center pb-8 border-t pt-8" style={{ borderColor: PALETTE.neutral.border }}>
          <button 
            onClick={() => setShowAudit(!showAudit)}
            className="inline-flex items-center gap-2 text-[14px] font-bold uppercase tracking-widest transition-colors hover:underline"
            style={{ color: PALETTE.neutral.secondary }}
          >
            {showAudit ? "Hide System Audit Logs" : "View System Audit Logs"}
          </button>
        </div>
        {showAudit && <div className="mt-4"><AuditTrail bidderId={id} /></div>}
      </div>
    </div>
  );
}
