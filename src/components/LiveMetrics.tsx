import type { RaftNode, ClusterEvent } from "@/hooks/useRaftSimulation";
import { Activity, Shield, Clock, Zap } from "lucide-react";

interface Props {
  nodes: RaftNode[];
  quorumCount: number;
  quorumReached: boolean;
  currentTerm: number;
  latencies: number[];
  events: ClusterEvent[];
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const h = 30;
  const w = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(130, 100%, 50%)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LiveMetrics({ nodes, quorumCount, quorumReached, currentTerm, latencies, events }: Props) {
  const leader = nodes.find(n => n.state === "leader");
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Quorum Status */}
      <div className={`glass-card p-4 ${quorumReached ? "glow-green" : "glow-red"}`}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Quorum</span>
        </div>
        <div className={`text-2xl font-bold font-mono ${quorumReached ? "text-primary text-glow-green" : "text-destructive"}`}>
          {quorumCount}/5
        </div>
        <span className={`text-[10px] font-mono ${quorumReached ? "text-primary/70" : "text-destructive/70"}`}>
          {quorumReached ? "CONSENSUS OK" : "NO QUORUM"}
        </span>
      </div>

      {/* Election Term */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Term</span>
        </div>
        <div className="text-2xl font-bold font-mono text-foreground">{currentTerm}</div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Leader: {leader ? leader.name : "NONE"}
        </span>
      </div>

      {/* Replication Latency */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-node-follower" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Latency</span>
        </div>
        <div className="text-2xl font-bold font-mono text-foreground">{avgLatency}ms</div>
        <Sparkline data={latencies} />
      </div>

      {/* Cluster Health */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Events</span>
        </div>
        <div className="text-2xl font-bold font-mono text-foreground">{events.length}</div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {events[0]?.type.toUpperCase() || "IDLE"}
        </span>
      </div>
    </div>
  );
}
