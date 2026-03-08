import type { RaftNode } from "@/hooks/useRaftSimulation";

interface Props {
  nodes: RaftNode[];
}

export default function RaftLogStream({ nodes }: Props) {
  return (
    <div className="panel p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">WAL — Write-Ahead Log</h2>
        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-[1px] bg-primary inline-block" /> Committed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-[1px] bg-muted-foreground/30 inline-block" /> Pending
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {nodes.map((node, i) => {
          const isLeader = node.state === "leader";
          return (
            <div key={node.id} className="flex items-start gap-2">
              {/* Node label */}
              <div className="flex-shrink-0 w-16">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 flex-shrink-0 ${
                    node.state === "leader" ? "bg-node-leader" :
                    node.state === "follower" ? "bg-node-follower" :
                    node.state === "candidate" ? "bg-node-candidate" : "bg-node-down"
                  }`} />
                  <span className="text-[9px] font-mono text-muted-foreground">N-0{i + 1}</span>
                  {isLeader && (
                    <span className="text-[7px] font-mono text-primary/60">LDR</span>
                  )}
                </div>
              </div>

              {/* WAL entries */}
              <div className="flex-1 overflow-x-auto scrollbar-none">
                <div className="flex gap-[2px] min-w-0">
                  {node.log.length === 0 ? (
                    <span className="text-[8px] font-mono text-muted-foreground/20 py-1">— empty WAL —</span>
                  ) : (
                    node.log.slice(-12).map((entry, j) => (
                      <div
                        key={`${entry.index}-${j}`}
                        className={`flex-shrink-0 px-1.5 py-[3px] text-[7px] font-mono border transition-all duration-500 ${
                          entry.committed
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : "border-border bg-muted/50 text-muted-foreground/60"
                        }`}
                        style={{
                          animation: entry.committed ? undefined : "fade-in 0.3s ease-out",
                        }}
                      >
                        <div className="flex gap-1 items-center">
                          <span className={`w-1 h-1 rounded-full ${entry.committed ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <span>I:{entry.index}</span>
                        </div>
                        <div className="text-[6px] opacity-60">T:{entry.term}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
