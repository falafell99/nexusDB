import { useCallback } from "react";
import type { ClusterEvent } from "@/hooks/useRaftSimulation";
import { Download } from "lucide-react";

interface Props {
  events: ClusterEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  election: "text-accent",
  commit: "text-primary",
  nodeDown: "text-destructive",
  nodeUp: "text-node-follower",
  write: "text-foreground",
  partition: "text-accent",
  reconcile: "text-primary",
};

const TYPE_LABELS: Record<string, string> = {
  election: "ELECT",
  commit: "COMMIT",
  nodeDown: "DOWN",
  nodeUp: "UP",
  write: "WRITE",
  partition: "NET",
  reconcile: "SYNC",
};

export default function EventLog({ events }: Props) {
  const exportJSON = useCallback(() => {
    const data = JSON.stringify(events, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexusdb-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const exportCSV = useCallback(() => {
    const header = "id,type,message,timestamp\n";
    const rows = events.map(e =>
      `"${e.id}","${e.type}","${e.message.replace(/"/g, '""')}",${e.timestamp}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexusdb-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  return (
    <div className="panel p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Cluster Events</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={exportJSON}
            className="text-[8px] font-mono text-muted-foreground hover:text-foreground border border-border px-1.5 py-0.5 transition-colors flex items-center gap-1"
            title="Export as JSON"
          >
            <Download className="w-2.5 h-2.5" />
            JSON
          </button>
          <button
            onClick={exportCSV}
            className="text-[8px] font-mono text-muted-foreground hover:text-foreground border border-border px-1.5 py-0.5 transition-colors flex items-center gap-1"
            title="Export as CSV"
          >
            <Download className="w-2.5 h-2.5" />
            CSV
          </button>
          <span className="text-[9px] font-mono text-muted-foreground">{events.length} entries</span>
        </div>
      </div>
      <div className="space-y-[2px] max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
        {events.length === 0 ? (
          <p className="text-[9px] font-mono text-muted-foreground/30">Awaiting events...</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="flex gap-1.5 items-start text-[9px] font-mono animate-fade-in leading-relaxed">
              <span className="text-muted-foreground/30 flex-shrink-0 w-[52px]">
                {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`flex-shrink-0 w-[38px] text-right ${TYPE_COLORS[event.type] || "text-foreground"}`}>
                {TYPE_LABELS[event.type] || event.type}
              </span>
              <span className="text-foreground/50 flex-shrink-0">│</span>
              <span className="text-foreground/70">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
