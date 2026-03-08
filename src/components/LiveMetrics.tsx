import type { RaftNode } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
  quorumCount: number;
  quorumReached: boolean;
  currentTerm: number;
  latencies: number[];
  rpsHistory: number[];
  quorumHistory: number[];
}

function Sparkline({ data, color = "hsl(var(--muted-foreground))", fillColor }: { data: number[]; color?: string; fillColor?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const h = 32;
  const w = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  const fillPoints = [...points, `${w},${h}`, `0,${h}`].join(" ");

  return (
    <svg width={w} height={h} className="mt-1.5">
      {fillColor && (
        <polygon points={fillPoints} fill={fillColor} />
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={w}
          cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function LiveMetrics({
  nodes, quorumCount, quorumReached, currentTerm,
  latencies, rpsHistory, quorumHistory,
}: Props) {
  const leader = nodes.find(n => n.state === "leader");
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const currentRps = rpsHistory[rpsHistory.length - 1] || 0;
  const currentHealth = quorumHistory[quorumHistory.length - 1] || 0;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Metrics Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground">TERM {currentTerm}</span>
          <span className="text-[9px] font-mono text-muted-foreground">•</span>
          <span className="text-[9px] font-mono text-muted-foreground">
            LDR: {leader ? leader.name.replace("Node ", "N-") : "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* RPC Latency */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">RPC LATENCY</span>
            <span className="text-sm font-mono font-semibold text-foreground">{avgLatency}ms</span>
          </div>
          <Sparkline
            data={latencies}
            color="hsl(var(--node-follower))"
            fillColor="hsla(220, 40%, 50%, 0.08)"
          />
          <div className="flex justify-between text-[8px] font-mono text-muted-foreground/50">
            <span>{Math.min(...latencies)}ms</span>
            <span>{Math.max(...latencies)}ms</span>
          </div>
        </div>

        {/* RPS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">REQUESTS/SEC</span>
            <span className="text-sm font-mono font-semibold text-foreground">{currentRps}</span>
          </div>
          <Sparkline
            data={rpsHistory}
            color="hsl(var(--accent))"
            fillColor="hsla(38, 92%, 50%, 0.06)"
          />
          <div className="flex justify-between text-[8px] font-mono text-muted-foreground/50">
            <span>0</span>
            <span>{Math.max(...rpsHistory)}</span>
          </div>
        </div>

        {/* Quorum Health */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">QUORUM HEALTH</span>
            <span className={`text-sm font-mono font-semibold ${
              currentHealth >= 100 ? "text-primary" : currentHealth > 0 ? "text-accent" : "text-destructive"
            }`}>
              {currentHealth}%
            </span>
          </div>
          <Sparkline
            data={quorumHistory}
            color={quorumReached ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
            fillColor={quorumReached ? "hsla(142, 71%, 45%, 0.08)" : "hsla(0, 72%, 51%, 0.08)"}
          />
          <div className="flex justify-between text-[8px] font-mono text-muted-foreground/50">
            <span>{quorumCount}/5 nodes</span>
            <span>{quorumReached ? "CONSENSUS OK" : "NO QUORUM"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
