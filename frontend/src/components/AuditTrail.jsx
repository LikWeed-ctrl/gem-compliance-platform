import { useEffect, useState } from "react";
import { getAuditTrail } from "../api/bidders";

const ACTOR_ROLE_STYLES = {
  SYSTEM: "bg-slate-100 text-slate-600",
  AI: "bg-purple-100 text-purple-700",
  OFFICER: "bg-blue-100 text-blue-700",
};

const ACTION_ICONS = {
  DOCUMENT_UPLOADED: "📄",
  OCR_EXTRACTED: "🔍",
  COMPLIANCE_CHECK_RUN: "✅",
  SCORE_CALCULATED: "📊",
  AI_RECOMMENDATION_GENERATED: "🤖",
  OFFICER_VIEWED_DASHBOARD: "👁️",
  OFFICER_DECISION_MADE: "⚖️",
  OFFICER_OVERRODE_AI_FLAG: "⚠️",
  CLARIFICATION_REQUESTED: "❓",
  RECHECK_TRIGGERED: "🔄",
};

function AuditTrail({ bidderId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getAuditTrail(bidderId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [bidderId]);

  if (loading) return null;

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-lg p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="font-semibold text-slate-800">
          Audit Trail <span className="text-slate-400 font-normal">({logs.length} events)</span>
        </h2>
        <span className="text-slate-400 text-sm">{expanded ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-sm text-slate-500">No audit events recorded yet.</p>
          )}
          {logs.map((log) => (
            <div key={log._id} className="flex gap-3 border-l-2 border-slate-200 pl-3 py-1">
              <span className="text-lg leading-none">{ACTION_ICONS[log.actionType] || "•"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">
                    {log.actionType.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTOR_ROLE_STYLES[log.actorRole]}`}>
                    {log.actor}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{log.description}</p>
                {log.reason && (
                  <p className="text-sm text-slate-500 mt-1 italic">Reason: "{log.reason}"</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditTrail;