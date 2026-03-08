import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RaftNode } from "@/hooks/useRaftSimulation";
import { Power, PowerOff, Wifi, WifiOff, Send } from "lucide-react";

interface Props {
  nodes: RaftNode[];
  partitioned: boolean;
  onKillNode: (id: string) => void;
  onReviveNode: (id: string) => void;
  onTogglePartition: () => void;
  onWrite: (key: string, value: string) => void;
}

export default function ClusterControls({ nodes, partitioned, onKillNode, onReviveNode, onTogglePartition, onWrite }: Props) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleWrite = () => {
    if (!key.trim()) return;
    onWrite(key.trim(), value.trim());
    setKey("");
    setValue("");
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">Simulation Controls</h2>

      {/* Node Controls */}
      <div>
        <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">Node Management</p>
        <div className="grid grid-cols-5 gap-2">
          {nodes.map(node => (
            <button
              key={node.id}
              onClick={() => node.state === "down" ? onReviveNode(node.id) : onKillNode(node.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-[10px] font-mono ${
                node.state === "down"
                  ? "border-node-down/30 bg-node-down/5 text-node-down hover:bg-node-down/10"
                  : "border-border bg-muted/20 text-foreground hover:bg-muted/40"
              }`}
            >
              {node.state === "down" ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
              {node.name.split(" ")[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Network Partition */}
      <div>
        <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">Network Partition</p>
        <button
          onClick={onTogglePartition}
          className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-mono transition-all ${
            partitioned
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-muted/20 text-foreground hover:bg-muted/40"
          }`}
        >
          {partitioned ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          {partitioned ? "Heal Partition [2|3]" : "Split Network [2|3]"}
        </button>
      </div>

      {/* Write Request */}
      <div>
        <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">Write Request</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="key"
            value={key}
            onChange={e => setKey(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <input
            type="text"
            placeholder="value"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleWrite}
            className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-mono hover:bg-primary/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
