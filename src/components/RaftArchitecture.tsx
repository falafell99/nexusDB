import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RaftArchitecture() {
  return (
    <div className="panel p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
        Architecture — Raft Consensus Protocol
      </h2>
      <Tabs defaultValue="election" className="w-full">
        <TabsList className="bg-muted border border-border w-full justify-start rounded-none h-8">
          <TabsTrigger value="election" className="font-mono text-[10px] rounded-none data-[state=active]:bg-card data-[state=active]:text-primary">
            Leader Election
          </TabsTrigger>
          <TabsTrigger value="replication" className="font-mono text-[10px] rounded-none data-[state=active]:bg-card data-[state=active]:text-primary">
            Log Replication
          </TabsTrigger>
          <TabsTrigger value="safety" className="font-mono text-[10px] rounded-none data-[state=active]:bg-card data-[state=active]:text-primary">
            Safety
          </TabsTrigger>
        </TabsList>

        <TabsContent value="election" className="mt-3 space-y-2">
          <div className="border-l border-primary/30 pl-3">
            <h3 className="text-primary text-[10px] font-mono font-semibold mb-1">LEADER ELECTION</h3>
            <p className="text-[10px] font-mono text-foreground/50 leading-5">
              When a follower fails to receive heartbeats within the election timeout (150–300ms, randomized),
              it transitions to Candidate, increments its term, votes for itself, and issues RequestVote RPCs.
            </p>
            <p className="text-[10px] font-mono text-foreground/50 leading-5 mt-1.5">
              A candidate wins if it receives votes from a majority (quorum) of the cluster.
              Randomized timeouts prevent split-vote scenarios, ensuring rapid convergence.
            </p>
          </div>
          <div className="bg-muted border border-border p-2 text-[9px] font-mono text-muted-foreground">
            → Consistency: Strong — all reads are served through the current leader.
          </div>
        </TabsContent>

        <TabsContent value="replication" className="mt-3 space-y-2">
          <div className="border-l border-node-follower/30 pl-3">
            <h3 className="text-node-follower text-[10px] font-mono font-semibold mb-1">LOG REPLICATION</h3>
            <p className="text-[10px] font-mono text-foreground/50 leading-5">
              The leader appends client requests to its log and issues AppendEntries RPCs in parallel.
              Once a majority acknowledges, the entry is committed and applied to the state machine.
            </p>
            <p className="text-[10px] font-mono text-foreground/50 leading-5 mt-1.5">
              The leader tracks matchIndex per follower to determine commit progress.
              Committed entries are durable and will eventually be applied to every node.
            </p>
          </div>
          <div className="bg-muted border border-border p-2 text-[9px] font-mono text-muted-foreground">
            → Raft guarantees linearizable writes, unlike eventually consistent systems (e.g., Dynamo).
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-3 space-y-2">
          <div className="border-l border-accent/30 pl-3">
            <h3 className="text-accent text-[10px] font-mono font-semibold mb-1">SAFETY GUARANTEES</h3>
            <p className="text-[10px] font-mono text-foreground/50 leading-5">
              Election Safety: at most one leader per term. Leader Append-Only: leaders never overwrite
              or delete entries. Log Matching: identical index+term implies identical preceding entries.
            </p>
            <p className="text-[10px] font-mono text-foreground/50 leading-5 mt-1.5">
              Leader Completeness: committed entries persist across all future leaders.
              This property distinguishes Raft from weaker consensus protocols.
            </p>
          </div>
          <div className="bg-muted border border-border p-2 text-[9px] font-mono text-muted-foreground">
            → Raft vs Paxos: equivalent guarantees, decomposed into understandable sub-problems.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
