import type { RaftNode } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
}

export default function RaftLogStream({ nodes }: Props) {
  return (
    <div className="panel p-4 overflow-hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Replication Log</h2>
      <div className="space-y-2">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-start gap-2">
            <div className="flex-shrink-0 w-14">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 ${
                  node.state === "leader" ? "bg-node-leader" :
                  node.state === "follower" ? "bg-node-follower" :
                  node.state === "candidate" ? "bg-node-candidate" : "bg-node-down"
                }`} />
                <span className="text-[9px] font-mono text-muted-foreground">N-0{i + 1}</span>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-1 min-w-0">
                {node.log.length === 0 ? (
                  <span className="text-[9px] font-mono text-muted-foreground/30">—</span>
                ) : (
                  node.log.slice(-10).map((entry, j) => (
                    <div
                      key={`${entry.index}-${j}`}
                      className={`flex-shrink-0 px-1.5 py-0.5 text-[8px] font-mono border ${
                        entry.committed
                          ? "border-primary/30 text-primary"
                          : "border-border text-muted-foreground"
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
      <div className="flex items-center gap-3 mt-3 text-[9px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-[1px] bg-primary inline-block" /> Committed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-[1px] bg-border inline-block" /> Pending</span>
      </div>
    </div>
  );
}
