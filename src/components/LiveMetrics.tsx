import type { RaftNode, ClusterEvent } from "@/hooks/useRaftSimulation";

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
  const h = 24;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="mt-1">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LiveMetrics({ nodes, quorumCount, quorumReached, currentTerm, latencies, events }: Props) {
  const leader = nodes.find(n => n.state === "leader");
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  const metrics = [
    {
      label: "QUORUM",
      value: `${quorumCount}/5`,
      sub: quorumReached ? "CONSENSUS OK" : "NO QUORUM",
      status: quorumReached ? "ok" : "err",
    },
    {
      label: "TERM",
      value: String(currentTerm),
      sub: `Leader: ${leader ? leader.name.replace("Node ", "N") : "—"}`,
      status: "neutral",
    },
    {
      label: "AVG LATENCY",
      value: `${avgLatency}ms`,
      sub: null,
      status: "neutral",
      sparkline: true,
    },
    {
      label: "EVENTS",
      value: String(events.length),
      sub: events[0]?.type.toUpperCase() || "IDLE",
      status: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="panel p-3">
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{m.label}</span>
          <div className={`text-xl font-mono font-semibold mt-1 ${
            m.status === "ok" ? "text-primary" : m.status === "err" ? "text-destructive" : "text-foreground"
          }`}>
            {m.value}
          </div>
          {m.sparkline ? <Sparkline data={latencies} /> : (
            <span className={`text-[10px] font-mono ${
              m.status === "ok" ? "text-primary/70" : m.status === "err" ? "text-destructive/70" : "text-muted-foreground"
            }`}>{m.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
}
