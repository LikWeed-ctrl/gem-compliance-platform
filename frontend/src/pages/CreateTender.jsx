import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTender } from "../api/tenders";

function CreateTender() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenderId: "",
    title: "",
    department: "",
    bidSubmissionDeadline: "",
    msmePreference: false,
    makeInIndiaMinPercent: "",
    oemAuthorizationRequired: false,
    nsicEmdWaiverApplicable: false,
    minTurnoverLakhs: "",
    startupIndiaRelaxation: false,
    requiredDocuments: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        tenderId: form.tenderId,
        title: form.title,
        department: form.department,
        bidSubmissionDeadline: form.bidSubmissionDeadline,
        eligibilityRules: {
          msmePreference: form.msmePreference,
          makeInIndiaMinPercent: form.makeInIndiaMinPercent ? Number(form.makeInIndiaMinPercent) : null,
          oemAuthorizationRequired: form.oemAuthorizationRequired,
          nsicEmdWaiverApplicable: form.nsicEmdWaiverApplicable,
          minTurnoverLakhs: form.minTurnoverLakhs ? Number(form.minTurnoverLakhs) : null,
          startupIndiaRelaxation: form.startupIndiaRelaxation,
        },
        requiredDocuments: form.requiredDocuments || [],
      };
      const tender = await createTender(payload);
      navigate(`/officer/tenders/${tender._id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-[#000080] hover:underline mb-2 inline-block">
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-[#000080] tracking-tight">Publish New Tender</h1>
        <p className="text-slate-500 mt-1 text-sm">Fill in the procurement details and configure automated eligibility rules.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Tricolor Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"></div>
        
        <div className="p-8 space-y-8">
          
          {/* Section 1 */}
          <div>
            <h3 className="text-lg font-bold text-[#000080] border-b-2 border-slate-100 pb-2 mb-4">1. Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tender ID</label>
                <input
                  required
                  value={form.tenderId}
                  onChange={(e) => update("tenderId", e.target.value)}
                  placeholder="GEM/2026/B/00002"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  required
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="Ministry of Railways"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Supply of Office Furniture"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bid Submission Deadline</label>
                <input
                  required
                  type="date"
                  value={form.bidSubmissionDeadline}
                  onChange={(e) => update("bidSubmissionDeadline", e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="text-lg font-bold text-[#000080] border-b-2 border-slate-100 pb-2 mb-4">2. Eligibility Rules</h3>
            <p className="text-sm font-semibold text-slate-500 mb-4">Only checked/filled rules will be applied to this tender.</p>
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.msmePreference}
                  onChange={(e) => update("msmePreference", e.target.checked)}
                  className="rounded text-[#000080] focus:ring-[#000080]"
                />
                MSME Preference applicable
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.oemAuthorizationRequired}
                  onChange={(e) => update("oemAuthorizationRequired", e.target.checked)}
                  className="rounded text-[#000080] focus:ring-[#000080]"
                />
                OEM Authorization mandatory
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.nsicEmdWaiverApplicable}
                  onChange={(e) => update("nsicEmdWaiverApplicable", e.target.checked)}
                  className="rounded text-[#000080] focus:ring-[#000080]"
                />
                NSIC EMD Waiver applicable
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.startupIndiaRelaxation}
                  onChange={(e) => update("startupIndiaRelaxation", e.target.checked)}
                  className="rounded text-[#000080] focus:ring-[#000080]"
                />
                Startup India relaxation applicable
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="block text-sm text-slate-700 mb-1 font-medium">
                    Min. Make in India local content (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.makeInIndiaMinPercent}
                    onChange={(e) => update("makeInIndiaMinPercent", e.target.value)}
                    placeholder="Leave blank if not required"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1 font-medium">
                    Min. Turnover (₹ lakhs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minTurnoverLakhs}
                    onChange={(e) => update("minTurnoverLakhs", e.target.value)}
                    placeholder="Leave blank if not required"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-[#000080] focus:border-[#000080]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="text-lg font-bold text-[#000080] border-b-2 border-slate-100 pb-2 mb-4">3. Required Documents</h3>
            <p className="text-sm font-semibold text-slate-500 mb-4">Check the documents that bidders MUST upload during application.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              {[
                { id: "EXPERIENCE_CRITERIA", label: "Experience Criteria" },
                { id: "PAST_PERFORMANCE", label: "Past Performance" },
                { id: "BIDDER_TURNOVER", label: "Bidder Turnover" },
                { id: "OEM_AUTHORIZATION_CERTIFICATE", label: "OEM Authorization" },
                { id: "OEM_ANNUAL_TURNOVER", label: "OEM Annual Turnover" },
                { id: "MII_CERTIFICATE", label: "Make in India Certificate" },
                { id: "EMD_EXEMPTION_SUPPORTING_DOC", label: "EMD Exemption Doc" },
                { id: "ATC_ADDITIONAL_DOC", label: "ATC / Additional Doc" }
              ].map(doc => (
                <label key={doc.id} className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiredDocuments?.includes(doc.id)}
                    onChange={(e) => {
                      const current = form.requiredDocuments || [];
                      if (e.target.checked) update("requiredDocuments", [...current, doc.id]);
                      else update("requiredDocuments", current.filter(id => id !== doc.id));
                    }}
                    className="rounded text-[#000080] focus:ring-[#000080]"
                  />
                  {doc.label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#138808] text-white px-8 py-3 rounded-lg text-sm font-bold tracking-wide uppercase hover:bg-[#0f6b06] transition-colors disabled:opacity-50 shadow-md"
          >
            {submitting ? "Publishing..." : "Publish Tender"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTender;