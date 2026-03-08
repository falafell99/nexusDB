import type { ClusterEvent } from "@/hooks/useRaftSimulation";

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
  return (
    <div className="panel p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Cluster Events</h2>
        <span className="text-[9px] font-mono text-muted-foreground">{events.length} entries</span>
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
