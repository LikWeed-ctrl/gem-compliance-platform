import { useEffect, useState } from "react";
import { getAuditTrail } from "../api/bidders";

const ACTOR_ROLE_STYLES = {
  SYSTEM: "text-neutral-400 bg-neutral-800 border-neutral-700",
  AI: "text-info bg-info/10 border-info/20",
  OFFICER: "text-gold-500 bg-gold-500/10 border-gold-500/20",
};

function AuditTrail({ bidderId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditTrail(bidderId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [bidderId]);

  if (loading) return null;

  return (
    <div className="mt-8 bg-navy-900 border border-navy-800 rounded-xl overflow-hidden shadow-lg relative">
      <div className="bg-navy-800 px-4 py-3 flex items-center justify-between border-b border-navy-700">
        <h2 className="font-mono text-sm text-gold-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          SYSTEM_AUDIT_LOG
        </h2>
        <span className="font-mono text-xs text-neutral-500">{logs.length} EVENTS RECORDED</span>
      </div>

      <div className="p-1 font-mono text-[11px] sm:text-xs">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-3 space-y-1">
          {logs.length === 0 && (
            <p className="text-neutral-500 p-2">[NO_RECORDS_FOUND]</p>
          )}
          {logs.map((log) => (
            <div key={log._id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 py-1.5 px-2 hover:bg-navy-800/50 rounded transition-colors group">
              <span className="text-neutral-500 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                [{new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}]
              </span>
              <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
                <span className={`px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${ACTOR_ROLE_STYLES[log.actorRole] || ACTOR_ROLE_STYLES.SYSTEM}`}>
                  {log.actorRole}:{log.actor}
                </span>
                <span className="text-neutral-300 font-bold tracking-tight">
                  {log.actionType}
                </span>
                <span className="text-neutral-400 break-all">
                  &gt; {log.description}
                  {log.reason && <span className="text-warning ml-2">// {log.reason}</span>}
                </span>
              </div>
            </div>
          ))}
          {logs.length > 0 && (
            <div className="text-neutral-600 mt-4 px-2">_EOF</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditTrail;