import { useEffect, useRef } from "react";
import type { RaftNode, HeartbeatPulse } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
  pulses: HeartbeatPulse[];
  onNodeClick: (id: string) => void;
}

const NODE_POSITIONS = [
  { x: 200, y: 50 },   // A - top
  { x: 350, y: 150 },  // B - right
  { x: 300, y: 310 },  // C - bottom-right
  { x: 100, y: 310 },  // D - bottom-left
  { x: 50, y: 150 },   // E - left
];

const STATE_COLORS: Record<string, string> = {
  leader: "#00ff41",
  follower: "#3b82f6",
  candidate: "#f59e0b",
  down: "#ef4444",
};

const STATE_GLOW: Record<string, string> = {
  leader: "0 0 20px #00ff41, 0 0 40px rgba(0,255,65,0.3)",
  follower: "0 0 10px rgba(59,130,246,0.3)",
  candidate: "0 0 15px #f59e0b, 0 0 30px rgba(245,158,11,0.2)",
  down: "0 0 10px rgba(239,68,68,0.2)",
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

    let frameCount = 0;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, 400, 400);

      const currentNodes = nodesRef.current;
      const currentPulses = pulsesRef.current;

      // Draw connection lines
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
          ctx.strokeStyle = bothAlive ? "rgba(255,255,255,0.06)" : "rgba(255,0,0,0.05)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw animated pulses
      currentPulses.forEach(pulse => {
        const fromIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.from);
        const toIdx = ["a", "b", "c", "d", "e"].indexOf(pulse.to);
        if (fromIdx < 0 || toIdx < 0) return;

        const elapsed = Date.now() - pulse.timestamp;
        const progress = Math.min(elapsed / 800, 1);
        const from = NODE_POSITIONS[fromIdx];
        const to = NODE_POSITIONS[toIdx];
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;

        const color = pulse.type === "heartbeat" ? "#00ff41" :
          pulse.type === "appendEntries" ? "#3b82f6" :
          pulse.type === "voteRequest" ? "#f59e0b" : "#8b5cf6";

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(")", ",0.3)").replace("rgb", "rgba").replace("#", "");
        ctx.fillStyle = `${color}4D`;
        ctx.fill();
      });

      // Draw nodes
      currentNodes.forEach((node, i) => {
        const pos = NODE_POSITIONS[i];
        const color = STATE_COLORS[node.state];
        const isLeader = node.state === "leader";
        const isCandidate = node.state === "candidate";

        // Outer glow for leader
        if (isLeader) {
          const glowSize = 30 + Math.sin(frameCount * 0.05) * 5;
          const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
          gradient.addColorStop(0, "rgba(0,255,65,0.15)");
          gradient.addColorStop(1, "rgba(0,255,65,0)");
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Pulsing ring for candidate
        if (isCandidate) {
          const pulseSize = 20 + (frameCount % 60) / 60 * 15;
          const pulseAlpha = 1 - (frameCount % 60) / 60;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245,158,11,${pulseAlpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = node.state === "down" ? "rgba(20,20,20,0.8)" : "rgba(10,10,10,0.9)";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "11px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.name, pos.x, pos.y + 35);

        // State label
        ctx.fillStyle = color;
        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillText(node.state.toUpperCase(), pos.x, pos.y + 47);
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
      if (dx * dx + dy * dy < 625) { // 25^2
        onNodeClick(nodes[i].id);
        return;
      }
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Cluster Topology</h2>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-node-leader" /> Leader</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-node-follower" /> Follower</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-node-candidate" /> Candidate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-node-down" /> Down</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full max-w-[400px] mx-auto cursor-pointer"
        style={{ aspectRatio: "1" }}
        onClick={handleClick}
      />
      <p className="text-[10px] text-muted-foreground text-center mt-2 font-mono">Click a node to toggle its state</p>
    </div>
  );
}
