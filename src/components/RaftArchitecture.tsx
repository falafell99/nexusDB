import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RaftArchitecture() {
  return (
    <div className="glass-card p-6">
      <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-4">
        Raft Consensus — Technical Architecture
      </h2>
      <Tabs defaultValue="election" className="w-full">
        <TabsList className="bg-muted/30 border border-border w-full justify-start">
          <TabsTrigger value="election" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Leader Election
          </TabsTrigger>
          <TabsTrigger value="replication" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Log Replication
          </TabsTrigger>
          <TabsTrigger value="safety" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Safety
          </TabsTrigger>
        </TabsList>

        <TabsContent value="election" className="mt-4 space-y-3 text-sm text-foreground/80 font-mono leading-relaxed">
          <div className="border-l-2 border-primary/30 pl-4">
            <h3 className="text-primary text-xs font-bold mb-2">LEADER ELECTION</h3>
            <p className="text-[11px] text-foreground/60 leading-5">
              When a follower doesn't receive heartbeats within the <span className="text-accent">election timeout</span> (150-300ms randomized),
              it transitions to <span className="text-accent">Candidate</span> state, increments its term, votes for itself, and sends
              <span className="text-primary"> RequestVote RPCs</span> to all other nodes.
            </p>
            <p className="text-[11px] text-foreground/60 leading-5 mt-2">
              A candidate wins the election if it receives votes from a <span className="text-primary">majority (quorum)</span> of the cluster.
              The randomized timeout ensures split votes are rare, enabling rapid convergence even in 5-node clusters.
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-3 text-[10px] text-muted-foreground">
            <span className="text-primary">→</span> Consistency model: <span className="text-primary">Strong Consistency</span> — all reads go through the leader.
          </div>
        </TabsContent>

        <TabsContent value="replication" className="mt-4 space-y-3 text-sm text-foreground/80 font-mono leading-relaxed">
          <div className="border-l-2 border-node-follower/30 pl-4">
            <h3 className="text-node-follower text-xs font-bold mb-2">LOG REPLICATION</h3>
            <p className="text-[11px] text-foreground/60 leading-5">
              The leader accepts client requests and appends them to its log. It then sends <span className="text-node-follower">AppendEntries RPCs</span> in
              parallel to all followers. Once a majority acknowledges the entry, it's <span className="text-primary">committed</span>.
            </p>
            <p className="text-[11px] text-foreground/60 leading-5 mt-2">
              Committed entries are guaranteed to be durable and will eventually be applied to every node's state machine.
              The leader tracks the <span className="text-accent">matchIndex</span> for each follower to determine commit progress.
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-3 text-[10px] text-muted-foreground">
            <span className="text-node-follower">→</span> Unlike eventual consistency (Dynamo-style), Raft guarantees <span className="text-primary">linearizable writes</span>.
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-4 space-y-3 text-sm text-foreground/80 font-mono leading-relaxed">
          <div className="border-l-2 border-accent/30 pl-4">
            <h3 className="text-accent text-xs font-bold mb-2">SAFETY GUARANTEES</h3>
            <p className="text-[11px] text-foreground/60 leading-5">
              <span className="text-accent">Election Safety:</span> At most one leader per term. <span className="text-accent">Leader Append-Only:</span> Leaders
              never overwrite or delete log entries. <span className="text-accent">Log Matching:</span> If two logs contain an entry with
              the same index and term, they are identical in all preceding entries.
            </p>
            <p className="text-[11px] text-foreground/60 leading-5 mt-2">
              <span className="text-accent">Leader Completeness:</span> If a log entry is committed in a given term, it will be present in
              the logs of all leaders for higher-numbered terms. This is the key property that distinguishes Raft from
              weaker consensus protocols.
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-3 text-[10px] text-muted-foreground">
            <span className="text-accent">→</span> Raft vs Paxos: Same guarantees, but Raft decomposes consensus into <span className="text-primary">understandable sub-problems</span>.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
