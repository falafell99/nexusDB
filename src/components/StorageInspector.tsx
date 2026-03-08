import { useMemo } from "react";
import { X, Database } from "lucide-react";
import type { RaftNode } from "@/hooks/useRaftSimulation";

interface Props {
  node: RaftNode;
  onClose: () => void;
}

interface KVEntry {
  key: string;
  value: string;
  index: number;
  term: number;
  timestamp: number;
  recent: boolean;
}

export default function StorageInspector({ node, onClose }: Props) {
  const kvState = useMemo(() => {
    const map = new Map<string, KVEntry>();
    const now = Date.now();
    node.log
      .filter(e => e.committed)
      .forEach(entry => {
        const match = entry.command.match(/^SET\s+(\S+)\s+(.+)$/);
        if (match) {
          map.set(match[1], {
            key: match[1],
            value: match[2],
            index: entry.index,
            term: entry.term,
            timestamp: entry.timestamp,
            recent: now - entry.timestamp < 10000,
          });
        }
      });
    return Array.from(map.values());
  }, [node.log]);

  const stateColor = node.state === "leader" ? "text-primary" :
    node.state === "candidate" ? "text-accent" :
    node.state === "down" ? "text-destructive" : "text-node-follower";

  return (
    <div className="panel p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            State Machine — {node.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono uppercase ${stateColor}`}>
            {node.state}
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-3 text-[9px] font-mono text-muted-foreground">
        <span>TERM: {node.term}</span>
        <span>LOG: {node.log.length} entries</span>
        <span>KV: {kvState.length} keys</span>
      </div>

      {/* KV Table */}
      {kvState.length === 0 ? (
        <div className="text-[9px] font-mono text-muted-foreground/30 py-8 text-center">
          No committed key-value pairs
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1 px-1.5">KEY</th>
                <th className="text-left py-1 px-1.5">VALUE</th>
                <th className="text-right py-1 px-1.5">IDX</th>
                <th className="text-right py-1 px-1.5">TERM</th>
              </tr>
            </thead>
            <tbody>
              {kvState.map(entry => (
                <tr
                  key={entry.key}
                  className={`border-b border-border/30 transition-all duration-1000 ${
                    entry.recent ? "bg-primary/5" : ""
                  }`}
                  style={entry.recent ? {
                    boxShadow: "inset 0 0 12px hsla(142, 71%, 45%, 0.08)",
                  } : undefined}
                >
                  <td className="py-1 px-1.5 text-primary">{entry.key}</td>
                  <td className="py-1 px-1.5 text-foreground">{entry.value}</td>
                  <td className="py-1 px-1.5 text-right text-muted-foreground">{entry.index}</td>
                  <td className="py-1 px-1.5 text-right text-muted-foreground">{entry.term}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent entries hint */}
      {kvState.some(e => e.recent) && (
        <div className="mt-2 text-[8px] font-mono text-primary/40 flex items-center gap-1">
          <span className="w-2 h-2 bg-primary/10 border border-primary/20 inline-block" />
          Recently modified (&lt;10s)
        </div>
      )}
    </div>
  );
}
