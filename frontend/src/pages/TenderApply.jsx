import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTenderById } from "../api/tenders";
import { extractDocumentPreview, createBidderWithDocuments, runChecksForBidder } from "../api/bidders";

const DOC_TYPES = [
  { value: "EXPERIENCE_CRITERIA", label: "Experience Criteria", category: "TENDER_SPECIFIC" },
  { value: "PAST_PERFORMANCE", label: "Past Performance", category: "TENDER_SPECIFIC" },
  { value: "BIDDER_TURNOVER", label: "Bidder Turnover Certificate", category: "TENDER_SPECIFIC" },
  { value: "OEM_AUTHORIZATION_CERTIFICATE", label: "OEM Authorization Letter", category: "TENDER_SPECIFIC" },
  { value: "OEM_ANNUAL_TURNOVER", label: "OEM Annual Turnover", category: "TENDER_SPECIFIC" },
  { value: "MII_CERTIFICATE", label: "Make in India Certificate", category: "TENDER_SPECIFIC" },
  { value: "EMD_EXEMPTION_SUPPORTING_DOC", label: "EMD Exemption Supporting Doc", category: "TENDER_SPECIFIC" },
  { value: "ATC_ADDITIONAL_DOC", label: "Additional Terms Document", category: "TENDER_SPECIFIC" },
];

function TenderApply() {
  const { tenderId } = useParams();
  const navigate = useNavigate();

  const [tender, setTender] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({}); // mapped by docType value
  const [uploading, setUploading] = useState({}); // mapped by docType value
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    declaredLocalContentPercent: "",
    declaredTurnoverLakhs: "",
    isOemForOfferedCatalog: false,
    requestingEmdExemption: false,
    emdExemptionCategory: "",
    miiCompliant: false,
    miiClass: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTenderById(tenderId)
      .then(setTender)
      .catch((err) => setError("Failed to load tender: " + err.message));
  }, [tenderId]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileUpload(e, docTypeObj) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [docTypeObj.value]: true }));
    setError(null);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("docType", docTypeObj.value);
      formData.append("documentCategory", docTypeObj.category);

      const result = await extractDocumentPreview(formData);
      result.documentCategory = docTypeObj.category;
      
      setUploadedDocs((prev) => ({
        ...prev,
        [docTypeObj.value]: result
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [docTypeObj.value]: false }));
      e.target.value = "";
    }
  }

  function removeDoc(docType) {
    setUploadedDocs((prev) => {
      const copy = { ...prev };
      delete copy[docType];
      return copy;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const sellerProfileId = localStorage.getItem("sellerProfileId");
    if (!sellerProfileId) {
      setError("Not logged in. Please login as a bidder.");
      return;
    }

    setSubmitting(true);
    try {
      const bidSubmissionData = {
        tender: tenderId,
        declaredLocalContentPercent: form.declaredLocalContentPercent
          ? Number(form.declaredLocalContentPercent)
          : null,
        declaredTurnoverLakhs: form.declaredTurnoverLakhs ? Number(form.declaredTurnoverLakhs) : null,
        isOemForOfferedCatalog: form.isOemForOfferedCatalog,
        requestingEmdExemption: form.requestingEmdExemption,
        emdExemptionCategory: form.requestingEmdExemption ? form.emdExemptionCategory : null,
        miiClass: form.miiCompliant ? form.miiClass : null,
      };

      const documents = Object.values(uploadedDocs).map((d) => ({
        docType: d.docType,
        documentCategory: d.documentCategory,
        tempFilePath: d.tempFilePath,
        originalFilename: d.originalFilename,
        extractedFields: d.extractedFields,
        ocrConfidence: d.ocrConfidence,
        verificationStatus: d.verificationStatus,
      }));

      const { bidSubmission } = await createBidderWithDocuments({ sellerProfileId, bidSubmissionData, documents });
      
      // Automatically run checks when bidder applies
      await runChecksForBidder(bidSubmission._id);
      
      navigate("/bidder/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!tender) return <div className="p-8 max-w-4xl mx-auto text-neutral-500 font-mono text-sm animate-pulse">Accessing Tender Data...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-12 pt-8 px-4 sm:px-8">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-navy-900 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-navy-800"></div>
        <span className="text-navy-900/50 font-mono text-xs tracking-widest uppercase mb-2 block">Tender Application</span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight mb-3">{tender.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 font-mono">
          <span className="bg-neutral-100 px-3 py-1 rounded text-neutral-700 border border-neutral-200">{tender.tenderId}</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            {tender.department}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Mandatory Documentation
            </h3>
            <p className="text-sm text-neutral-500 mt-1">Please upload the following required documents for technical evaluation.</p>
          </div>
          
          <div className="divide-y divide-neutral-100 p-2">
            {DOC_TYPES.filter(dt => {
               if (dt.value === "MII_CERTIFICATE") return form.miiCompliant;
               if (dt.value === "EMD_EXEMPTION_SUPPORTING_DOC") return form.requestingEmdExemption;
               if (tender.requiredDocuments && tender.requiredDocuments.length > 0) {
                   return tender.requiredDocuments.includes(dt.value);
               }
               if (dt.value === "ATC_ADDITIONAL_DOC") return false; 
               if (dt.value === "BIDDER_TURNOVER") return tender.eligibilityRules?.minTurnoverLakhs != null;
               if (dt.value === "OEM_AUTHORIZATION_CERTIFICATE") return tender.eligibilityRules?.oemAuthorizationRequired;
               return true; 
            }).map((dt) => {
              const doc = uploadedDocs[dt.value];
              const isUploading = uploading[dt.value];

              return (
                <div key={dt.value} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-bold text-navy-900 tracking-wide block mb-1">{dt.label}</span>
                    {doc && <span className="text-xs text-success font-mono font-semibold bg-success/10 px-2 py-0.5 rounded border border-success/20">UPLOADED: {doc.originalFilename}</span>}
                  </div>
                  <div className="mt-2 sm:mt-0 flex shrink-0">
                    {doc ? (
                      <button
                        type="button"
                        onClick={() => removeDoc(dt.value)}
                        className="text-xs font-bold uppercase tracking-wider text-error bg-error/5 hover:bg-error/10 border border-error/20 px-4 py-2 rounded transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <label className={`text-xs font-bold uppercase tracking-wider px-6 py-2.5 border rounded cursor-pointer transition-colors ${isUploading ? 'bg-neutral-100 text-neutral-400 border-neutral-200' : 'bg-white text-navy-900 border-neutral-300 hover:bg-neutral-50 shadow-sm'}`}>
                        {isUploading ? "UPLOADING..." : "CHOOSE FILE"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, dt)}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Business Declarations
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Local Content (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={form.declaredLocalContentPercent}
                  onChange={(e) => update("declaredLocalContentPercent", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Declared Turnover (₹ lakhs) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.declaredTurnoverLakhs}
                  onChange={(e) => update("declaredTurnoverLakhs", e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start text-sm text-navy-900 font-medium group cursor-pointer">
                <div className="relative flex items-center justify-center shrink-0 mt-0.5 mr-3">
                  <input
                    type="checkbox"
                    checked={form.isOemForOfferedCatalog}
                    onChange={(e) => update("isOemForOfferedCatalog", e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-neutral-300 rounded focus:ring-0 checked:bg-navy-900 checked:border-navy-900 transition-colors"
                  />
                  <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${form.isOemForOfferedCatalog ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="leading-relaxed">I declare that I am the Original Equipment Manufacturer (OEM) for the offered catalog(s) to avail MSE preference.</span>
              </label>

              <label className="flex items-start text-sm text-navy-900 font-medium group cursor-pointer">
                <div className="relative flex items-center justify-center shrink-0 mt-0.5 mr-3">
                  <input
                    type="checkbox"
                    checked={form.requestingEmdExemption}
                    onChange={(e) => update("requestingEmdExemption", e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-neutral-300 rounded focus:ring-0 checked:bg-navy-900 checked:border-navy-900 transition-colors"
                  />
                  <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${form.requestingEmdExemption ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="leading-relaxed">I am requesting EMD Exemption (Subject to verification of supporting documents).</span>
              </label>

              {form.requestingEmdExemption && (
                <div className="ml-8 mt-2 mb-4 bg-neutral-50 border border-neutral-200 p-4 rounded-lg">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Select EMD Exemption Category *</label>
                  <select
                    value={form.emdExemptionCategory}
                    onChange={(e) => update("emdExemptionCategory", e.target.value)}
                    className="w-full sm:w-2/3 bg-white border border-neutral-200 text-navy-900 rounded-lg px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                    required={form.requestingEmdExemption}
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Start-up">Start-up (Recognized by DIPP)</option>
                    <option value="Turnover>=500Cr">Turnover &gt;= 500 Cr.</option>
                    <option value="RegisteredWithDesignatedAgency">Registered with designated Agency / Authority</option>
                  </select>
                </div>
              )}

              <label className="flex items-start text-sm text-navy-900 font-medium group cursor-pointer">
                <div className="relative flex items-center justify-center shrink-0 mt-0.5 mr-3">
                  <input
                    type="checkbox"
                    checked={form.miiCompliant}
                    onChange={(e) => update("miiCompliant", e.target.checked)}
                    className="appearance-none w-5 h-5 border-2 border-neutral-300 rounded focus:ring-0 checked:bg-navy-900 checked:border-navy-900 transition-colors"
                  />
                  <svg className={`absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity ${form.miiCompliant ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="leading-relaxed">I declare that the offering is Make in India (MII) compliant.</span>
              </label>

              {form.miiCompliant && (
                <div className="ml-8 mt-2 space-y-3 bg-neutral-50 border border-neutral-200 p-4 rounded-lg">
                  <label className="flex items-center text-sm text-neutral-700 cursor-pointer group">
                    <input type="radio" name="miiClass" value="Class1" checked={form.miiClass === "Class1"} onChange={(e) => update("miiClass", e.target.value)} className="mr-3 w-4 h-4 text-navy-900 focus:ring-navy-900" />
                    <span className="group-hover:text-navy-900 transition-colors">Participate as Class 1 Local Supplier (Local Content &gt;= 50%)</span>
                  </label>
                  <label className="flex items-center text-sm text-neutral-700 cursor-pointer group">
                    <input type="radio" name="miiClass" value="Class2" checked={form.miiClass === "Class2"} onChange={(e) => update("miiClass", e.target.value)} className="mr-3 w-4 h-4 text-navy-900 focus:ring-navy-900" />
                    <span className="group-hover:text-navy-900 transition-colors">Participate as Class 2 Local Supplier (Local Content 20% - 49%)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-sm text-error font-medium flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-navy-900 text-white px-8 py-3.5 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {submitting ? (
               <>
                 <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 SUBMITTING...
               </>
            ) : (
              "SUBMIT APPLICATION"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TenderApply;