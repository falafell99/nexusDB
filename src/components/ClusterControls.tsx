import { useState } from "react";
import type { RaftNode } from "@/hooks/useRaftSimulation";
import { Power, PowerOff, WifiOff, Wifi, Send } from "lucide-react";

interface Props {
  nodes: RaftNode[];
  partitioned: boolean;
  onKillNode: (id: string) => void;
  onReviveNode: (id: string) => void;
  onTogglePartition: () => void;
  onWrite: (key: string, value: string) => void;
  nodeLatencyOffsets: Record<string, number>;
  onSetNodeLatency: (id: string, ms: number) => void;
}

export default function ClusterControls({
  nodes, partitioned, onKillNode, onReviveNode, onTogglePartition, onWrite,
  nodeLatencyOffsets, onSetNodeLatency,
}: Props) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleWrite = () => {
    if (!key.trim()) return;
    onWrite(key.trim(), value.trim());
    setKey("");
    setValue("");
  };

  return (
    <div className="panel p-4 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Chaos Engineering</h2>

      {/* Node Failure */}
      <div>
        <p className="text-[9px] font-mono text-muted-foreground mb-1.5 uppercase tracking-widest">Node Failure</p>
        <div className="grid grid-cols-5 gap-1.5">
          {nodes.map((node, i) => (
            <button
              key={node.id}
              onClick={() => node.state === "down" ? onReviveNode(node.id) : onKillNode(node.id)}
              className={`flex flex-col items-center gap-0.5 p-1.5 border text-[9px] font-mono transition-colors ${
                node.state === "down"
                  ? "border-destructive/40 text-destructive hover:bg-destructive/5"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {node.state === "down" ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
              N-0{i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Network Partition */}
      <div>
        <p className="text-[9px] font-mono text-muted-foreground mb-1.5 uppercase tracking-widest">Network Partition</p>
        <button
          onClick={onTogglePartition}
          className={`w-full flex items-center justify-center gap-2 p-2 border text-[10px] font-mono transition-colors ${
            partitioned
              ? "border-accent/40 text-accent hover:bg-accent/5"
              : "border-border text-foreground hover:bg-muted"
          }`}
        >
          {partitioned ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {partitioned ? "HEAL PARTITION [2|3]" : "SPLIT NETWORK [2|3]"}
        </button>
      </div>

      {/* Latency Injection */}
      <div>
        <p className="text-[9px] font-mono text-muted-foreground mb-1.5 uppercase tracking-widest">Latency Injection</p>
        <div className="space-y-1.5">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground w-8 flex-shrink-0">N-0{i + 1}</span>
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={nodeLatencyOffsets[node.id] || 0}
                onChange={e => onSetNodeLatency(node.id, Number(e.target.value))}
                className="flex-1 h-1 accent-muted-foreground bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-none"
                disabled={node.state === "down"}
              />
              <span className="text-[9px] font-mono text-muted-foreground w-10 text-right">
                +{nodeLatencyOffsets[node.id] || 0}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Request */}
      <div>
        <p className="text-[9px] font-mono text-muted-foreground mb-1.5 uppercase tracking-widest">Write Request</p>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="key"
            value={key}
            onChange={e => setKey(e.target.value)}
            className="flex-1 bg-muted border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            placeholder="value"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 bg-muted border border-border px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleWrite}
            className="px-2 py-1.5 border border-primary/40 text-primary text-[10px] font-mono hover:bg-primary/5 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
