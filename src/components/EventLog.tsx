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
};

export default function EventLog({ events }: Props) {
  return (
    <div className="panel p-4 h-full">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Event Log</h2>
      <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-[9px] font-mono text-muted-foreground/50">Awaiting events...</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="flex gap-2 items-start text-[9px] font-mono animate-fade-in">
              <span className="text-muted-foreground/40 flex-shrink-0 w-14">
                {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`flex-shrink-0 uppercase w-12 ${TYPE_COLORS[event.type] || "text-foreground"}`}>
                [{event.type}]
              </span>
              <span className="text-foreground/60">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
