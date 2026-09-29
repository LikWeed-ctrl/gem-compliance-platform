import React, { useEffect, useState } from "react";

export default function OfficerDecisionModal({
  open,
  onClose,
  bidder,
  officerEmail = "officer.auth@gem.gov.in",
  onSubmit, // async (decision, reasoning) => void
}) {
  const [decision, setDecision] = useState("QUALIFIED");
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fresh form every time the card is opened
  useEffect(() => {
    if (open) {
      setDecision("QUALIFIED");
      setReasoning("");
      setSubmitting(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open || !bidder) return null;

  const currentStatus = (bidder.officerDecision || "PENDING").replace(/_/g, " ");
  const canSubmit = reasoning.trim() && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(decision, reasoning.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = "block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-neutral-200 p-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          className="absolute top-5 right-5 text-neutral-400 hover:text-slate-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-slate-900">Officer Final Decision</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Current status: <span className="font-bold text-slate-900">{currentStatus}</span>
        </p>

        <hr className="my-6 border-neutral-200" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelCls}>Decision</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            >
              <option value="QUALIFIED">QUALIFY (APPROVE)</option>
              <option value="DISQUALIFIED">DISQUALIFY (REJECT)</option>
              <option value="CLARIFICATION_REQUESTED">REQUEST CLARIFICATION</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Authenticated Officer Session</label>
            <input
              type="text"
              value={officerEmail}
              readOnly
              className="w-full rounded-lg border border-neutral-200 bg-neutral-200/70 px-4 py-3 text-sm font-mono text-neutral-700 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className={labelCls}>Justification</label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={4}
            required
            placeholder="Provide official rationale for this decision..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-100 p-4 text-sm text-slate-900 placeholder:text-neutral-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
          />
        </div>
        <p className="text-sm text-neutral-600 mb-6">
          Officer decision is recorded in the audit trail securely under your identity.
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-8 py-3.5 rounded-lg bg-slate-900 text-white text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Committing..." : "Commit Decision"}
        </button>
      </form>
    </div>
  );
}
