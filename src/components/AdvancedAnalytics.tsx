interface Props {
  commitsPerSecHistory: number[];
  consensusSpeed: number;
}

function Sparkline({ data, color, fillColor, height = 32 }: { data: number[]; color: string; fillColor: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 140;
  const h = height;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const fillPoints = [...points, `${w},${h}`, `0,${h}`].join(" ");

  return (
    <svg width={w} height={h} className="mt-1">
      <polygon points={fillPoints} fill={fillColor} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.length > 0 && (
        <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2} r="2" fill={color} />
      )}
    </svg>
  );
}

function ConsensusGauge({ speed }: { speed: number }) {
  const maxMs = 2000;
  const clamped = Math.min(speed, maxMs);
  const ratio = clamped / maxMs;
  const color = speed < 500 ? "hsl(var(--primary))" :
    speed < 1000 ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const label = speed < 500 ? "FAST" : speed < 1000 ? "MODERATE" : "SLOW";
  const barWidth = 120;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-muted-foreground tracking-widest">CONSENSUS SPEED</span>
        <span className="text-sm font-mono font-semibold" style={{ color }}>
          {speed}ms
        </span>
      </div>
      <div className="relative h-3 bg-muted border border-border" style={{ width: barWidth }}>
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{ width: `${(1 - ratio) * 100}%`, backgroundColor: color, opacity: 0.6 }}
        />
      </div>
      <div className="flex justify-between" style={{ width: barWidth }}>
        <span className="text-[8px] font-mono" style={{ color }}>{label}</span>
        <span className="text-[8px] font-mono text-muted-foreground/50">{maxMs}ms</span>
      </div>
    </div>
  );
}

export default function AdvancedAnalytics({ commitsPerSecHistory, consensusSpeed }: Props) {
  const currentCps = commitsPerSecHistory[commitsPerSecHistory.length - 1] || 0;

  return (
    <div className="panel p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Advanced Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Throughput */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">THROUGHPUT</span>
            <span className="text-sm font-mono font-semibold text-primary">{currentCps} c/s</span>
          </div>
          <Sparkline
            data={commitsPerSecHistory}
            color="hsl(var(--primary))"
            fillColor="hsla(142, 71%, 45%, 0.06)"
            height={36}
          />
          <div className="flex justify-between text-[8px] font-mono text-muted-foreground/50">
            <span>0</span>
            <span>{Math.max(...commitsPerSecHistory)} commits/sec</span>
          </div>
        </div>

        {/* Consensus Gauge */}
        <ConsensusGauge speed={consensusSpeed} />
      </div>
    </div>
  );
}
