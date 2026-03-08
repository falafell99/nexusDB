import type { RaftNode } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
}

export default function RaftLogStream({ nodes }: Props) {
  return (
    <div className="glass-card p-6 overflow-hidden">
      <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-4">Raft Log Stream</h2>
      <div className="space-y-3">
        {nodes.map(node => (
          <div key={node.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-16">
              <span className="text-[10px] font-mono text-muted-foreground">{node.name}</span>
              <div className={`w-2 h-2 rounded-full mt-1 ${
                node.state === "leader" ? "bg-node-leader" :
                node.state === "follower" ? "bg-node-follower" :
                node.state === "candidate" ? "bg-node-candidate" : "bg-node-down"
              }`} />
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-1 min-w-0">
                {node.log.length === 0 ? (
                  <span className="text-[10px] font-mono text-muted-foreground/50 italic">empty log</span>
                ) : (
                  node.log.slice(-10).map((entry, i) => (
                    <div
                      key={`${entry.index}-${i}`}
                      className={`flex-shrink-0 px-2 py-1 rounded text-[9px] font-mono border ${
                        entry.committed
                          ? "border-node-leader/30 bg-node-leader/10 text-node-leader"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div>I:{entry.index}</div>
                      <div>T:{entry.term}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
