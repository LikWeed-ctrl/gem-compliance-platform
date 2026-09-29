import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function OfficerSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
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
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "OFFICER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");

      localStorage.setItem("token", data.token);
      localStorage.setItem("officerName", data.name || data.email);
      localStorage.setItem("officerEmail", data.email);
      navigate("/officer");
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
        <Link to="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-slate-900 transition-colors mb-6">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Officer Registration</h1>
        <p className="text-sm text-neutral-500 mb-8 font-mono">
          Register a new procurement officer account to access the Tender Dashboard and bid verification workspace.
        </p>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Officer Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-slate-900 rounded-lg px-4 py-3 text-sm font-sans focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none"
              placeholder="e.g. Priya Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Official Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-slate-900 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none"
              placeholder="officer@gem.gov.in"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-slate-900 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all outline-none"
              placeholder="••••••••"
            />
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
              className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   REGISTERING...
                </>
              ) : "REGISTER OFFICER ACCOUNT"}
            </button>
          </div>
        </form>

        <p className="text-sm text-neutral-500 mt-8 text-center border-t border-neutral-100 pt-6">
          Already registered? <Link to="/officer/login" className="text-slate-900 font-bold hover:text-gold-600 hover:underline transition-colors">Login securely</Link>
        </p>
      </div>
    </div>
  );
}

export default OfficerSignup;
