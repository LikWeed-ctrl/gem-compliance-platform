import React, { useState } from 'react';

const cleanLabel = (str) => {
  if (!str) return "";
  let cleaned = str.replace(/Layer [A-Z](\/[A-Z])?:\s*/gi, '');
  cleaned = cleaned.replace(/TENDER_SPECIFIC/g, 'Tender Requirement');
  cleaned = cleaned.replace(/EXPERIENCE_CRITERIA/g, 'Experience Criteria');
  cleaned = cleaned.replace(/FINANCIAL_STANDING/g, 'Financial Standing');
  cleaned = cleaned.replace(/LOCAL_CONTENT/g, 'Local Content (MII)');
  cleaned = cleaned.replace(/OEM_VERIFICATION/g, 'OEM Status');
  cleaned = cleaned.replace(/EMD_EXEMPTION/g, 'EMD Exemption');
  cleaned = cleaned.replace(/_/g, ' ');
  return cleaned.replace(/\b\w/g, l => l.toUpperCase());
};

const formatSourceName = (sourceName) => {
  if (!sourceName) return "Engine";
  let formatted = sourceName;
  if (formatted.includes("Registry") || formatted.includes("MCA") || formatted.includes("EPFO") || formatted.includes("UDYAM")) {
    return `${formatted} [SIMULATED]`;
  }
  return formatted;
};

const EvidenceBlock = ({ evidence }) => {
  const [expanded, setExpanded] = useState(false);
  const [rawExpanded, setRawExpanded] = useState(false);
  if (!evidence) return null;
  
  let parsed = null;
  if (typeof evidence === "string") {
    try { parsed = JSON.parse(evidence); } catch (e) { parsed = evidence; }
  } else {
    parsed = evidence;
  }

  const renderContent = (data) => {
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") return <span>{String(data)}</span>;
    if (Array.isArray(data)) return <ul className="list-disc pl-4 space-y-0.5 mt-1">{data.map((item, idx) => <li key={idx}>{renderContent(item)}</li>)}</ul>;
    if (typeof data === "object" && data !== null) {
      return (
        <div className="flex flex-col gap-1 mt-1 bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
          {Object.entries(data).map(([k, v]) => {
            // Hide deep raw nodes from main view unless they are simple
            if (typeof v === "object" && v !== null && Object.keys(v).length > 3) {
                return (
                    <div key={k} className="flex flex-col gap-1 border-b border-outline-variant/30 pb-1 mb-1 last:border-0 last:mb-0 last:pb-0">
                      <span className="text-[11px] font-semibold uppercase text-secondary shrink-0">{cleanLabel(k)}:</span>
                      <div className="pl-2 border-l-2 border-outline-variant/30">{renderContent(v)}</div>
                    </div>
                );
            }
            return (
                <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-2 border-b border-outline-variant/30 pb-1 mb-1 last:border-0 last:mb-0 last:pb-0">
                  <span className="text-[11px] font-semibold uppercase text-secondary w-32 shrink-0">{cleanLabel(k)}:</span>
                  <span className="text-[11px] text-primary break-all">{renderContent(v)}</span>
                </div>
            );
          })}
        </div>
      );
    }
    return <span>{String(data)}</span>;
  };

  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[11px] font-semibold flex items-center gap-1 text-tertiary-container hover:underline"
      >
        <span className="material-symbols-outlined text-[14px]">{expanded ? 'remove' : 'add'}</span>
        {expanded ? `Hide Evidence` : `View Evidence Details`}
      </button>
      {expanded && (
        <div className="mt-1 p-2.5 rounded overflow-x-auto bg-surface-container-high text-on-surface border border-outline-variant text-[11px] w-full">
          {renderContent(parsed)}
          
          <div className="mt-3 pt-2 border-t border-outline-variant/50">
            <button 
              onClick={() => setRawExpanded(!rawExpanded)} 
              className="text-[10px] text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">code</span>
              {rawExpanded ? "Hide Developer JSON" : "View Advanced / Raw Data"}
            </button>
            {rawExpanded && (
                <pre className="mt-2 p-2 bg-surface text-secondary border border-outline-variant rounded overflow-x-auto text-[10px]">
                    {JSON.stringify(parsed, null, 2)}
                </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function BidderAnalysis({ bidder, flatChecks }) {
  if (!bidder) return null;

  const renderStatusPill = (status) => {
    const s = String(status || "UNKNOWN").toUpperCase();
    if (["PASS", "COMPLIANT"].includes(s)) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EBFDF2] text-[#247A45] border border-[#A6F4C5]">PASS</span>;
    if (["REVIEW", "WARNING", "REVIEW_REQUIRED"].includes(s)) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF8EC] text-[#B7791F] border border-[#FCD34D]">REVIEW</span>;
    if (["FAIL", "NON_COMPLIANT"].includes(s)) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF2F2] text-[#B42318] border border-[#FCA5A5]">FAIL</span>;
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface border border-outline-variant text-secondary">{s.replace(/_/g, " ")}</span>;
  };

  const categorized = {
    "Tender Requirements & Evidentiary Audit": [],
    "Identity & Statutory Verification": [],
    "Cross-Document Triangulation": [],
    "Internal Consistency & Arithmetic Checks": [],
    "Deterministic Score Reduction Audit": [],
    "Other Checks": []
  };

  flatChecks.forEach(c => {
    const cat = (c.category || "").toUpperCase();
    const source = (c.sourceName || "").toUpperCase();
    
    if (cat.includes("TENDER") || source.includes("TENDER")) {
      categorized["Tender Requirements & Evidentiary Audit"].push(c);
    } else if (cat.includes("IDENTITY") || source.includes("PAN") || source.includes("GST") || cat.includes("STATUTORY")) {
      categorized["Identity & Statutory Verification"].push(c);
    } else if (cat.includes("CROSS") || source.includes("CROSS")) {
      categorized["Cross-Document Triangulation"].push(c);
    } else if (cat.includes("CONSISTENCY") || cat.includes("ARITHMETIC") || source.includes("CONSISTENCY")) {
      categorized["Internal Consistency & Arithmetic Checks"].push(c);
    } else if (cat.includes("SCORE") || cat.includes("REDUCTION")) {
      categorized["Deterministic Score Reduction Audit"].push(c);
    } else {
      categorized["Other Checks"].push(c);
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-surface-container-low border-l-4 border-primary-container p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-[20px]">policy</span>
          <div>
            <h2 className="text-[14px] font-semibold text-primary">Evidence-Driven Verification & Deterministic Audit Trail</h2>
            <p className="text-[12px] text-secondary">Complete evidentiary reasoning and cross-registry lookups behind the qualification result.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {Object.entries(categorized).map(([title, data], idx) => {
          if (data.length === 0) {
             if (title === "Other Checks") return null;
             return (
               <section key={idx} className="bg-surface-container-lowest border border-outline-variant rounded p-4 flex flex-col gap-2">
                 <h2 className="text-[14px] text-primary font-semibold">{title}</h2>
                 <div className="text-[12px] text-secondary italic px-3 py-3 bg-surface-container-low rounded">
                   No data points returned by verification engine for this section.
                 </div>
               </section>
             );
          }

          return (
            <section key={idx} className="bg-surface-container-lowest border border-outline-variant rounded p-4 flex flex-col gap-3 min-w-0">
              <div className="border-b border-outline-variant pb-2">
                <h2 className="text-[14px] text-primary font-semibold">{title}</h2>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b-2 border-outline-variant text-secondary text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-2 px-3 w-[25%]">Check / Requirement</th>
                      <th className="py-2 px-3 w-[60%]">Verification Details</th>
                      <th className="py-2 px-3 w-[15%]">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((c, i) => (
                      <tr key={i} className={`hover:bg-surface-container-low border-b border-outline-variant last:border-0 ${
                        c.status === 'REVIEW' ? 'bg-[#FEF8EC]/15 border-l-[3px] border-l-[#B7791F]' :
                        c.status === 'FAIL' ? 'bg-[#FEF2F2]/15 border-l-[3px] border-l-[#B42318]' : 'border-l-[3px] border-l-transparent'
                      }`}>
                        <td className="py-3 px-3 font-medium text-primary text-[12px] align-top">
                          <span className="block mb-1 font-semibold">{cleanLabel(c.name || c.category)}</span>
                          <span className="font-code-tabular-sm text-secondary text-[9px] px-1.5 py-0.5 bg-surface-container-low rounded border border-outline-variant tracking-wider">
                              {formatSourceName(c.sourceName)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[12px] text-primary whitespace-pre-wrap align-top break-words">
                          <div className="mb-1 text-secondary">{c.detail}</div>
                          <EvidenceBlock evidence={c.evidence} />
                        </td>
                        <td className="py-3 px-3 align-top">
                          {renderStatusPill(c.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}

        <section className="bg-surface-container-lowest border border-outline-variant rounded p-4 flex flex-col gap-3">
          <div className="border-b border-outline-variant pb-2">
            <h2 className="text-[14px] text-primary font-semibold flex items-center gap-1.5">
               <span className="material-symbols-outlined text-[16px] text-tertiary-container">robot_2</span> 
               AI-Generated Assessment
            </h2>
          </div>
          <div className="bg-surface-container-low rounded p-4 text-[13px] text-on-surface whitespace-pre-wrap leading-relaxed">
            {bidder.aiRecommendation || "No AI Assessment generated for this bidder by the backend engine."}
          </div>
        </section>
      </div>
    </div>
  );
}
