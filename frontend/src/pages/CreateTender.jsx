import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTender } from "../api/tenders";

function CreateTender() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    tenderId: "",
    department: "",
    title: "",
    bidSubmissionDeadline: "",
    msmePreference: false,
    makeInIndiaMinPercent: "",
    minTurnoverLakhs: "",
    oemAuthorizationRequired: false,
    nsicEmdWaiverApplicable: false,
    startupIndiaRelaxation: false,
    requiredDocuments: [
      "EXPERIENCE_CRITERIA", 
      "PAST_PERFORMANCE", 
      "BIDDER_TURNOVER", 
      "OEM_AUTHORIZATION_CERTIFICATE"
    ]
  });

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        tenderId: form.tenderId,
        department: form.department,
        title: form.title,
        bidSubmissionDeadline: form.bidSubmissionDeadline,
        eligibilityRules: {
          msmePreference: form.msmePreference,
          makeInIndiaMinPercent: form.makeInIndiaMinPercent ? Number(form.makeInIndiaMinPercent) : null,
          minTurnoverLakhs: form.minTurnoverLakhs ? Number(form.minTurnoverLakhs) : null,
          oemAuthorizationRequired: form.oemAuthorizationRequired,
          nsicEmdWaiverApplicable: form.nsicEmdWaiverApplicable,
          startupIndiaRelaxation: form.startupIndiaRelaxation
        },
        requiredDocuments: form.requiredDocuments
      };

      await createTender(payload);
      navigate("/officer/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 pt-8 px-4 sm:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Create New Tender</h1>
        <p className="text-neutral-500 mt-2 font-mono text-sm">Define procurement rules, eligibility, and required documentation.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1 */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              1. Basic Information
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Tender ID</label>
                <input
                  required
                  value={form.tenderId}
                  onChange={(e) => update("tenderId", e.target.value)}
                  placeholder="e.g. GEM/2026/B/12345"
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Department</label>
                <input
                  required
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="Ministry of Railways"
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-sans focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Supply of Office Furniture"
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-sans focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Bid Submission Deadline</label>
                <input
                  required
                  type="date"
                  value={form.bidSubmissionDeadline}
                  onChange={(e) => update("bidSubmissionDeadline", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              2. Eligibility Rules
            </h3>
            <p className="text-xs text-neutral-500 mt-1 font-mono">Only checked/filled rules will be applied to this tender.</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { id: "msmePreference", label: "MSME Preference applicable" },
                { id: "oemAuthorizationRequired", label: "OEM Authorization mandatory" },
                { id: "nsicEmdWaiverApplicable", label: "NSIC EMD Waiver applicable" },
                { id: "startupIndiaRelaxation", label: "Startup India relaxation applicable" }
              ].map(rule => (
                <label key={rule.id} className="flex items-start text-sm text-navy-900 font-medium group cursor-pointer bg-neutral-50 p-4 rounded-lg border border-neutral-200 hover:border-navy-900/30 transition-colors">
                  <div className="relative flex items-center justify-center shrink-0 mt-0.5 mr-3">
                    <input
                      type="checkbox"
                      checked={form[rule.id]}
                      onChange={(e) => update(rule.id, e.target.checked)}
                      className="appearance-none w-5 h-5 border-2 border-neutral-300 rounded focus:ring-0 checked:bg-navy-900 checked:border-navy-900 transition-colors"
                    />
                    <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${form[rule.id] ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span>{rule.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-navy-50 p-6 rounded-lg border border-navy-100">
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-widest mb-2">
                  Min. Make in India local content (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.makeInIndiaMinPercent}
                  onChange={(e) => update("makeInIndiaMinPercent", e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase tracking-widest mb-2">
                  Min. Turnover (₹ lakhs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.minTurnoverLakhs}
                  onChange={(e) => update("minTurnoverLakhs", e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              3. Required Documents
            </h3>
            <p className="text-xs text-neutral-500 mt-1 font-mono">Check the documents that bidders MUST upload.</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { id: "EXPERIENCE_CRITERIA", label: "Experience" },
                { id: "PAST_PERFORMANCE", label: "Past Performance" },
                { id: "BIDDER_TURNOVER", label: "Bidder Turnover" },
                { id: "OEM_AUTHORIZATION_CERTIFICATE", label: "OEM Authorization" },
                { id: "OEM_ANNUAL_TURNOVER", label: "OEM Turnover" },
                { id: "MII_CERTIFICATE", label: "Make in India" },
                { id: "EMD_EXEMPTION_SUPPORTING_DOC", label: "EMD Exemption" },
                { id: "ATC_ADDITIONAL_DOC", label: "ATC / Additional" }
              ].map(doc => (
                <label key={doc.id} className={`flex items-start text-xs font-bold uppercase tracking-wider cursor-pointer p-3 rounded-lg border transition-all ${form.requiredDocuments?.includes(doc.id) ? 'bg-navy-900 text-white border-navy-900 shadow-md' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'}`}>
                  <input
                    type="checkbox"
                    checked={form.requiredDocuments?.includes(doc.id)}
                    onChange={(e) => {
                      const current = form.requiredDocuments || [];
                      if (e.target.checked) update("requiredDocuments", [...current, doc.id]);
                      else update("requiredDocuments", current.filter(id => id !== doc.id));
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${form.requiredDocuments?.includes(doc.id) ? 'border-white bg-white' : 'border-neutral-300 bg-transparent'}`}>
                       {form.requiredDocuments?.includes(doc.id) && <div className="w-2 h-2 rounded-full bg-navy-900" />}
                    </div>
                    {doc.label}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error font-medium flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy-900 text-white px-8 py-3.5 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {submitting ? (
               <>
                 <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 PUBLISHING...
               </>
            ) : (
              "PUBLISH TENDER"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTender;