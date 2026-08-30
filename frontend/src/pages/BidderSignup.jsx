import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function BidderSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    panNumber: "",
    gstin: "",
    udyamNumber: "",
    cin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch("http://localhost:5000/api/seller-profiles/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign up");

      localStorage.setItem("sellerProfileId", data.sellerProfile._id);
      navigate("/bidder/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-16 px-4 flex justify-center">
      <div className="bg-white p-10 rounded-2xl border border-neutral-200 w-full max-w-xl shadow-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gold-600"></div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2 tracking-tight">Vendor Registration</h1>
        <p className="text-sm text-neutral-500 mb-8 font-mono">
          Enter corporate profile details. System will verify data against GSTN, PAN, and Udyam portals automatically.
        </p>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Company Name *</label>
            <input
              required
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm font-sans focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
              placeholder="Bharat Engineering Works Pvt Ltd"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">PAN Number *</label>
              <input
                required
                value={form.panNumber}
                onChange={(e) => update("panNumber", e.target.value.toUpperCase())}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">GSTIN</label>
              <input
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Udyam Number</label>
              <input
                value={form.udyamNumber}
                onChange={(e) => update("udyamNumber", e.target.value.toUpperCase())}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">CIN</label>
              <input
                value={form.cin}
                onChange={(e) => update("cin", e.target.value.toUpperCase())}
                className="w-full bg-neutral-50 border border-neutral-200 text-navy-900 rounded-lg px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-md text-sm text-error font-medium flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-white px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-md flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   VERIFYING REGISTRATION...
                </>
              ) : "REGISTER & VERIFY IDENTITY"}
            </button>
          </div>
        </form>
        
        <p className="text-sm text-neutral-500 mt-8 text-center border-t border-neutral-100 pt-6">
          Already have a profile? <Link to="/bidder/login" className="text-navy-900 font-bold hover:text-gold-600 hover:underline transition-colors">Login securely</Link>
        </p>
      </div>
    </div>
  );
}

export default BidderSignup;
