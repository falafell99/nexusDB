import { useEffect, useRef } from "react";
import type { RaftNode, HeartbeatPulse } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
  pulses: HeartbeatPulse[];
  onNodeClick: (id: string) => void;
}

const NODE_POSITIONS = [
  { x: 200, y: 55 },
  { x: 345, y: 150 },
  { x: 295, y: 310 },
  { x: 105, y: 310 },
  { x: 55, y: 150 },
];

const STATE_COLORS: Record<string, string> = {
  leader: "#22c55e",
  follower: "#4a7abf",
  candidate: "#f59e0b",
  down: "#ef4444",
};

export default function ClusterTopology({ nodes, pulses, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const pulsesRef = useRef(pulses);
  const nodesRef = useRef(nodes);
  pulsesRef.current = pulses;
  nodesRef.current = nodes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, 400, 400);
      const currentNodes = nodesRef.current;
      const currentPulses = pulsesRef.current;

      // Connection lines
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          const a = NODE_POSITIONS[i];
          const b = NODE_POSITIONS[j];
          const nodeA = currentNodes[i];
          const nodeB = currentNodes[j];
          const bothAlive = nodeA.state !== "down" && nodeB.state !== "down";

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = bothAlive ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.03)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Pulses — thin fast dots
      currentPulses.forEach(pulse => {
        const fromIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.from);
        const toIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.to);
        if (fromIdx < 0 || toIdx < 0) return;

        const elapsed = Date.now() - pulse.timestamp;
        const progress = Math.min(elapsed / 600, 1);
        const from = NODE_POSITIONS[fromIdx];
        const to = NODE_POSITIONS[toIdx];
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;

        const color = pulse.type === "heartbeat" ? "#64748b" :
          pulse.type === "appendEntries" ? "#22c55e" :
          pulse.type === "voteRequest" ? "#f59e0b" : "#64748b";

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

        // Candidate pulse effect
        let strokeAlpha = 1;
        if (isCandidate) {
          strokeAlpha = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 400));
        }

        // Node circle — flat, no glow
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
