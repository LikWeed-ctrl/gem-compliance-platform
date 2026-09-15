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

export default function BidderOverview({ bidder, checks, runningChecks, onRunChecks, flatChecks, onDecisionSubmit }) {
  const [decision, setDecision] = useState("QUALIFIED");
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!bidder) return null;

  const score = bidder.complianceScore || 0;
  const status = bidder.complianceStatus || "UNKNOWN";
  
  const fails = flatChecks.filter(c => c.status === "FAIL");
  const reviews = flatChecks.filter(c => c.status === "REVIEW" || c.status === "WARNING");
  const passes = flatChecks.filter(c => c.status === "PASS");

  const totalChecks = flatChecks.length;
  
  return (
    <div className="flex flex-col gap-6">
      <section className="bg-surface-container-lowest border border-outline-variant rounded p-5 flex flex-col md:flex-row items-start justify-between shadow-sm min-w-0">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-1.5 py-0.5 rounded bg-primary-container text-surface-container-lowest text-[10px] tracking-wider font-semibold">
              OFFICER VERIFICATION
            </span>
            <span className="font-code-tabular-sm text-[11px] text-secondary tracking-widest uppercase truncate">
              {bidder.tender?.department} | TENDER: {bidder.tender?.tenderId}
            </span>
          </div>
          <h1 className="text-[20px] font-semibold text-primary truncate" title={bidder.sellerProfile?.companyName}>
            {bidder.sellerProfile?.companyName}
          </h1>
          <div className="flex flex-wrap gap-3 mt-1 font-code-tabular text-[12px] text-secondary">
            <span>PAN: <span className="font-semibold text-primary">{bidder.sellerProfile?.panNumber}</span></span>
            <span>GSTIN: <span className="font-semibold text-primary">{bidder.sellerProfile?.gstin || "N/A"}</span></span>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end mt-4 md:mt-0 shrink-0">
          <span className="text-[10px] text-secondary uppercase tracking-widest mb-1">Final Backend Score</span>
          <div className="flex items-end gap-1">
            <span className="text-[32px] font-bold text-primary leading-none">{score}</span>
            <span className="text-[14px] text-secondary font-medium mb-1">/ 100</span>
          </div>
          <div className={`mt-1.5 px-2 py-0.5 text-[11px] rounded border font-semibold ${
            status === "PASS" || status === "COMPLIANT" ? "bg-[#EBFDF2] text-[#247A45] border-[#A6F4C5]" :
            status === "REVIEW" || status === "REVIEW_REQUIRED" ? "bg-[#FEF8EC] text-[#B7791F] border-[#FCD34D]" :
            "bg-[#FEF2F2] text-[#B42318] border-[#FCA5A5]"
          }`}>
            {status.replace(/_/g, " ")}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded p-5 min-w-0">
           <h2 className="text-[15px] font-semibold text-primary mb-3 flex items-center gap-1.5 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-[18px] text-error">notification_important</span>
              Priority Findings
           </h2>
           <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
             {fails.map((c, i) => (
               <div key={i} className="p-2.5 bg-[#FEF2F2] border-l-[3px] border-[#B42318] rounded-r text-[12px] text-primary">
                 <div className="font-semibold mb-0.5 break-words">{cleanLabel(c.name || c.category)}</div>
                 <div className="text-secondary text-[11px] leading-tight break-words">{c.detail}</div>
               </div>
             ))}
             {reviews.map((c, i) => (
               <div key={i} className="p-2.5 bg-[#FEF8EC] border-l-[3px] border-[#B7791F] rounded-r text-[12px] text-primary">
                 <div className="font-semibold mb-0.5 break-words">{cleanLabel(c.name || c.category)}</div>
                 <div className="text-secondary text-[11px] leading-tight break-words">{c.detail}</div>
               </div>
             ))}
             {fails.length === 0 && reviews.length === 0 && (
               <div className="text-secondary italic text-center p-3 text-[12px]">No priority findings.</div>
             )}
           </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded p-5 flex flex-col h-full min-w-0">
            <h2 className="text-[15px] font-semibold text-primary mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-tertiary-container">robot_2</span>
              AI-Generated Assessment
           </h2>
           <p className="text-[11px] text-secondary mb-3 italic pb-2 border-b border-outline-variant">
             Advisory assessment based on automated verification. Human officer retains final authority.
           </p>
           <div className="flex-1 bg-surface-container-low rounded p-3 text-[12px] text-on-surface whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[300px]">
             {bidder.aiRecommendation || "No AI Assessment generated for this bidder."}
           </div>
        </div>
      </div>
      
      <section className="bg-surface-container-lowest border border-outline-variant rounded p-5 min-w-0">
         <h2 className="text-[15px] font-semibold text-primary mb-3 border-b border-outline-variant pb-2">
            Verification Pipeline Coverage
         </h2>
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 border border-outline-variant rounded bg-surface text-center">
               <div className="text-[20px] font-bold text-primary">{totalChecks}</div>
               <div className="text-[10px] uppercase tracking-widest text-secondary font-semibold mt-0.5">Total Checks</div>
            </div>
            <div className="p-3 border border-[#A6F4C5] rounded bg-[#EBFDF2] text-center">
               <div className="text-[20px] font-bold text-[#247A45]">{passes.length}</div>
               <div className="text-[10px] uppercase tracking-widest text-[#247A45] font-semibold mt-0.5">Passed</div>
            </div>
            <div className="p-3 border border-[#FCD34D] rounded bg-[#FEF8EC] text-center">
               <div className="text-[20px] font-bold text-[#B7791F]">{reviews.length}</div>
               <div className="text-[10px] uppercase tracking-widest text-[#B7791F] font-semibold mt-0.5">Review</div>
            </div>
            <div className="p-3 border border-[#FCA5A5] rounded bg-[#FEF2F2] text-center">
               <div className="text-[20px] font-bold text-[#B42318]">{fails.length}</div>
               <div className="text-[10px] uppercase tracking-widest text-[#B42318] font-semibold mt-0.5">Failed</div>
            </div>
         </div>
      </section>

      <section id="officer-decision-console" className="bg-surface-container-lowest border-2 border-primary-container rounded p-5 shadow-sm mt-2 min-w-0">
        <div className="border-b border-outline-variant pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-container text-surface-container-lowest flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-[14px]">gavel</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] text-primary font-semibold truncate">Officer Decision Console</h2>
              <p className="text-[11px] text-secondary truncate">Official Record of Proceedings under Delegation of Financial Powers</p>
            </div>
          </div>
          <div className="text-[11px] text-primary font-medium bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant shrink-0">
            Officer: AUTH-SESSION-USER
          </div>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          onDecisionSubmit(decision, reasoning).finally(() => setSubmitting(false));
        }} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-primary uppercase tracking-wider font-semibold mb-1.5">Final Qualification Decision:</label>
              <select 
                value={decision} 
                onChange={e => setDecision(e.target.value)}
                className="w-full rounded border border-outline-variant bg-surface-container-lowest p-2 text-primary text-[13px] focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              >
                <option value="QUALIFIED">QUALIFIED - Approved for Financial Evaluation</option>
                <option value="CLARIFICATION_REQUESTED">CLARIFICATION REQUIRED - Send to Bidder</option>
                <option value="DISQUALIFIED">DISQUALIFIED - Non-Responsive / Fraud</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-primary uppercase tracking-wider font-semibold mb-1.5">Compliance Notes & Justification (Mandatory):</label>
            <textarea 
              value={reasoning}
              onChange={e => setReasoning(e.target.value)}
              className="w-full rounded border border-outline-variant bg-surface-container-lowest p-2 text-primary text-[13px] focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              rows="3"
              placeholder="Enter official procurement officer justification, compliance notes, and gazette order references..."
              required
            />
          </div>

          <div className="pt-3 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-secondary">
              Digital Signature: <span className="font-semibold text-primary">DSC-TOKEN-CONNECTED (Class-III NIC)</span>
            </div>
            <button 
              type="submit"
              disabled={submitting || !reasoning.trim()}
              className="px-4 py-1.5 rounded bg-primary-container text-surface-container-lowest text-[12px] font-semibold hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {submitting ? "Signing..." : "Sign & Record Decision"}
              <span className="material-symbols-outlined text-[14px]">verified</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
