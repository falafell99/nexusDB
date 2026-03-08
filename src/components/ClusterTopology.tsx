import { useEffect, useRef, useState, useCallback } from "react";
import type { RaftNode, HeartbeatPulse } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
  pulses: HeartbeatPulse[];
  partitioned: boolean;
  onNodeClick: (id: string) => void;
  partitionGroups?: { minority: Set<string>; majority: Set<string> };
  onPartitionGroupsChange?: (groups: { minority: Set<string>; majority: Set<string> }) => void;
}

const NODE_POSITIONS = [
  { x: 80, y: 80 },
  { x: 80, y: 200 },
  { x: 80, y: 320 },
  { x: 300, y: 80 },
  { x: 300, y: 200 },
];

const STATE_COLORS: Record<string, string> = {
  leader: "#22c55e",
  follower: "#4a7abf",
  candidate: "#f59e0b",
  down: "#ef4444",
};

function drawPartitionLine(ctx: CanvasRenderingContext2D, time: number, lineX: number) {
  const segments = 40;
  const segH = 400 / segments;

  ctx.save();
  for (let i = 0; i < segments; i++) {
    const y = i * segH;
    const noise = Math.sin(time * 0.003 + i * 1.7) * 8 + Math.sin(time * 0.007 + i * 3.1) * 4;
    const xOff = lineX + noise;
    const alpha = 0.3 + 0.3 * Math.abs(Math.sin(time * 0.005 + i * 0.5));

    for (let j = -6; j <= 6; j++) {
      const px = xOff + j + (Math.random() - 0.5) * 4;
      const py = y + (Math.random() - 0.5) * segH * 0.8;
      const pAlpha = alpha * (1 - Math.abs(j) / 8) * (0.3 + Math.random() * 0.7);
      ctx.fillStyle = `rgba(239, 68, 68, ${pAlpha})`;
      ctx.fillRect(px, py, 1 + Math.random(), 1 + Math.random());
    }

    ctx.beginPath();
    ctx.moveTo(xOff - 1, y);
    ctx.lineTo(xOff + 1 + Math.random() * 2, y + segH);
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(lineX - 2, 200);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + 0.2 * Math.sin(time * 0.003)})`;
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("NETWORK PARTITION", 0, 0);
  ctx.restore();
  ctx.restore();
}

export default function ClusterTopology({ nodes, pulses, partitioned, onNodeClick, partitionGroups, onPartitionGroupsChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const pulsesRef = useRef(pulses);
  const nodesRef = useRef(nodes);
  const partitionedRef = useRef(partitioned);
  const [partitionLineX, setPartitionLineX] = useState(190);
  const [dragging, setDragging] = useState(false);
  const partitionLineXRef = useRef(190);
  const draggingRef = useRef(false);

  pulsesRef.current = pulses;
  nodesRef.current = nodes;
  partitionedRef.current = partitioned;
  partitionLineXRef.current = partitionLineX;
  draggingRef.current = dragging;

  // Recalculate partition groups when line moves
  const recalcGroups = useCallback((lineX: number) => {
    if (!onPartitionGroupsChange) return;
    const minority = new Set<string>();
    const majority = new Set<string>();
    const nodeIds = ["a", "b", "c", "d", "e"];
    const left: string[] = [];
    const right: string[] = [];
    nodeIds.forEach((id, i) => {
      if (NODE_POSITIONS[i].x < lineX) left.push(id);
      else right.push(id);
    });
    // Majority = bigger group
    if (left.length >= right.length) {
      left.forEach(id => majority.add(id));
      right.forEach(id => minority.add(id));
    } else {
      right.forEach(id => majority.add(id));
      left.forEach(id => minority.add(id));
    }
    onPartitionGroupsChange({ minority, majority });
  }, [onPartitionGroupsChange]);

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
      const lineX = partitionLineXRef.current;

      // Connection lines
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          const a = NODE_POSITIONS[i];
          const b = NODE_POSITIONS[j];
          const nodeA = currentNodes[i];
          const nodeB = currentNodes[j];
          const bothAlive = nodeA.state !== "down" && nodeB.state !== "down";

          const sameGroup = (a.x < lineX && b.x < lineX) || (a.x >= lineX && b.x >= lineX);
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
        drawPartitionLine(ctx, now, lineX);

        // Draw drag handle hint
        if (!draggingRef.current) {
          ctx.save();
          ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
          ctx.beginPath();
          ctx.arc(lineX, 380, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
          ctx.font = "7px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("DRAG", lineX, 383);
          ctx.restore();
        }
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

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#09090b";
        ctx.fill();
        ctx.globalAlpha = strokeAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = isLeader ? 2 : isCandidate ? 2 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`N-0${i + 1}`, pos.x, pos.y + 36);

        ctx.fillStyle = color;
        ctx.font = "9px 'JetBrains Mono', monospace";
        const tag = node.state === "leader" ? "LEADER" :
          node.state === "candidate" ? "CANDIDATE" :
          node.state === "down" ? "DOWN" : "FOLLOWER";
        ctx.fillText(tag, pos.x, pos.y + 47);

        if (isPartitioned && node.state !== "down") {
          const isMinority = pos.x < lineX
            ? (NODE_POSITIONS.filter(p => p.x < lineX).length < NODE_POSITIONS.filter(p => p.x >= lineX).length)
            : (NODE_POSITIONS.filter(p => p.x >= lineX).length < NODE_POSITIONS.filter(p => p.x < lineX).length);
          ctx.fillStyle = isMinority ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)";
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillText(isMinority ? "MINORITY" : "MAJORITY", pos.x, pos.y - 28);
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) * (400 / rect.width),
      y: (e.clientY - rect.top) * (400 / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!partitioned) return;
    const { x } = getCanvasCoords(e);
    if (Math.abs(x - partitionLineX) < 20) {
      setDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const { x } = getCanvasCoords(e);
    const clampedX = Math.max(50, Math.min(350, x));
    setPartitionLineX(clampedX);
    recalcGroups(clampedX);
  };

  const handleMouseUp = () => {
    if (dragging) setDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) return;
    const { x, y } = getCanvasCoords(e);

    for (let i = 0; i < 5; i++) {
      const pos = NODE_POSITIONS[i];
      const dx = x - pos.x;
      const dy = y - pos.y;
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
        className={`w-full max-w-[400px] mx-auto ${dragging ? "cursor-col-resize" : "cursor-pointer"}`}
        style={{ aspectRatio: "1" }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <p className="text-[9px] text-muted-foreground text-center mt-2 font-mono">
        Click node to toggle state{partitioned ? " • Drag red line to adjust partition" : ""}
      </p>
    </div>
  );
}
