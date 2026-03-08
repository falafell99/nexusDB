import { useEffect, useRef } from "react";
import type { RaftNode, HeartbeatPulse } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
  pulses: HeartbeatPulse[];
  partitioned: boolean;
  onNodeClick: (id: string) => void;
}

const NODE_POSITIONS = [
  { x: 120, y: 80 },   // N-01 (minority)
  { x: 120, y: 200 },  // N-02 (minority)
  { x: 300, y: 60 },   // N-03 (majority)
  { x: 340, y: 190 },  // N-04 (majority)
  { x: 260, y: 300 },  // N-05 (majority)
];

const STATE_COLORS: Record<string, string> = {
  leader: "#22c55e",
  follower: "#4a7abf",
  candidate: "#f59e0b",
  down: "#ef4444",
};

// Static noise line data — pre-generated for consistency
function drawPartitionLine(ctx: CanvasRenderingContext2D, time: number) {
  const x = 210;
  const segments = 40;
  const segH = 400 / segments;

  ctx.save();
  
  // Draw noisy red static line
  for (let i = 0; i < segments; i++) {
    const y = i * segH;
    const noise = Math.sin(time * 0.003 + i * 1.7) * 8 + Math.sin(time * 0.007 + i * 3.1) * 4;
    const xOff = x + noise;
    const alpha = 0.3 + 0.3 * Math.abs(Math.sin(time * 0.005 + i * 0.5));
    
    // Static noise pixels around the line
    for (let j = -6; j <= 6; j++) {
      const px = xOff + j + (Math.random() - 0.5) * 4;
      const py = y + (Math.random() - 0.5) * segH * 0.8;
      const pAlpha = alpha * (1 - Math.abs(j) / 8) * (0.3 + Math.random() * 0.7);
      ctx.fillStyle = `rgba(239, 68, 68, ${pAlpha})`;
      ctx.fillRect(px, py, 1 + Math.random(), 1 + Math.random());
    }
    
    // Core line segments
    ctx.beginPath();
    ctx.moveTo(xOff - 1, y);
    ctx.lineTo(xOff + 1 + Math.random() * 2, y + segH);
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // "PARTITION" label
  ctx.save();
  ctx.translate(x - 2, 200);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + 0.2 * Math.sin(time * 0.003)})`;
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("NETWORK PARTITION", 0, 0);
  ctx.restore();

  ctx.restore();
}

export default function ClusterTopology({ nodes, pulses, partitioned, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const pulsesRef = useRef(pulses);
  const nodesRef = useRef(nodes);
  const partitionedRef = useRef(partitioned);
  pulsesRef.current = pulses;
  nodesRef.current = nodes;
  partitionedRef.current = partitioned;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, 400, 400);
      const currentNodes = nodesRef.current;
      const currentPulses = pulsesRef.current;
      const isPartitioned = partitionedRef.current;

      // Connection lines
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          const a = NODE_POSITIONS[i];
          const b = NODE_POSITIONS[j];
          const nodeA = currentNodes[i];
          const nodeB = currentNodes[j];
          const bothAlive = nodeA.state !== "down" && nodeB.state !== "down";

          // If partitioned, don't draw cross-partition lines
          const sameGroup = (i < 2 && j < 2) || (i >= 2 && j >= 2);
          if (isPartitioned && !sameGroup) continue;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = bothAlive ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.03)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Partition visual
      if (isPartitioned) {
        drawPartitionLine(ctx, now);
      }

      // Pulses
      currentPulses.forEach(pulse => {
        const fromIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.from);
        const toIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.to);
        if (fromIdx < 0 || toIdx < 0) return;

        const elapsed = now - pulse.timestamp;
        const progress = Math.min(elapsed / 600, 1);
        const from = NODE_POSITIONS[fromIdx];
        const to = NODE_POSITIONS[toIdx];
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;

        const color = pulse.type === "heartbeat" ? "#94a3b8" :
          pulse.type === "appendEntries" ? "#22c55e" :
          pulse.type === "voteRequest" ? "#f59e0b" : "#94a3b8";

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // Nodes
      currentNodes.forEach((node, i) => {
        const pos = NODE_POSITIONS[i];
        const color = STATE_COLORS[node.state];
        const isLeader = node.state === "leader";
        const isCandidate = node.state === "candidate";

        let strokeAlpha = 1;
        if (isCandidate) {
          strokeAlpha = 0.5 + 0.5 * Math.abs(Math.sin(now / 400));
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();
        ctx.globalAlpha = strokeAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = isLeader ? 2 : isCandidate ? 2 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Inner indicator
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Node ID label
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`N-0${i + 1}`, pos.x, pos.y + 36);

        // State tag
        ctx.fillStyle = color;
        ctx.font = "9px 'JetBrains Mono', monospace";
        const tag = node.state === "leader" ? "LEADER" :
          node.state === "candidate" ? "CANDIDATE" :
          node.state === "down" ? "DOWN" : "FOLLOWER";
        ctx.fillText(tag, pos.x, pos.y + 47);

        // Partition group label when partitioned
        if (isPartitioned && node.state !== "down") {
          ctx.fillStyle = i < 2 ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)";
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillText(i < 2 ? "MINORITY" : "MAJORITY", pos.x, pos.y - 28);
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;

    for (let i = 0; i < 5; i++) {
      const pos = NODE_POSITIONS[i];
      const dx = x * scaleX - pos.x;
      const dy = y * scaleY - pos.y;
      if (dx * dx + dy * dy < 625) {
        onNodeClick(nodes[i].id);
        return;
      }
    }
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Cluster Topology</h2>
        <div className="flex gap-3 text-[9px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-node-leader" /> LDR</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-node-follower" /> FLW</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-node-candidate" /> CND</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-node-down" /> DWN</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full max-w-[400px] mx-auto cursor-pointer"
        style={{ aspectRatio: "1" }}
        onClick={handleClick}
      />
      <p className="text-[9px] text-muted-foreground text-center mt-2 font-mono">Click node to toggle state</p>
    </div>
  );
}
