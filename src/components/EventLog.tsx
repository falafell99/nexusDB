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
    <div className="glass-card p-6 h-full">
      <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-4">Event Log</h2>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
        {events.length === 0 ? (
          <p className="text-[10px] font-mono text-muted-foreground/50 italic">Waiting for events...</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="flex gap-2 items-start text-[10px] font-mono animate-fade-in">
              <span className="text-muted-foreground/50 flex-shrink-0 w-16">
                {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`flex-shrink-0 uppercase w-14 ${TYPE_COLORS[event.type] || "text-foreground"}`}>
                [{event.type}]
              </span>
              <span className="text-foreground/70">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
