import { useRaftSimulation } from "@/hooks/useRaftSimulation";
import ClusterTopology from "@/components/ClusterTopology";
import RaftLogStream from "@/components/RaftLogStream";
import ClusterControls from "@/components/ClusterControls";
import LiveMetrics from "@/components/LiveMetrics";
import EventLog from "@/components/EventLog";
import RaftArchitecture from "@/components/RaftArchitecture";
import { Database, Github } from "lucide-react";

export default function Index() {
  const {
    nodes, pulses, events, partitioned, latencies,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
  } = useRaftSimulation();

  const handleNodeClick = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    if (node.state === "down") reviveNode(id);
    else killNode(id);
  };

  return (
    <div className="min-h-screen bg-background scanline">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">NexusDB</h1>
              <p className="text-[10px] font-mono text-muted-foreground">Fault-Tolerant Distributed KV Store</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono border ${
              quorumReached
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${quorumReached ? "bg-primary pulse-animation" : "bg-destructive"}`} />
              {quorumReached ? "CLUSTER HEALTHY" : "DEGRADED"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Live Metrics Row */}
        <LiveMetrics
          nodes={nodes}
          quorumCount={quorumCount}
          quorumReached={quorumReached}
          currentTerm={currentTerm}
          latencies={latencies}
          events={events}
        />

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Topology - Central */}
          <div className="lg:col-span-1">
            <ClusterTopology nodes={nodes} pulses={pulses} onNodeClick={handleNodeClick} />
          </div>

          {/* Controls + Events */}
          <div className="lg:col-span-1 space-y-4">
            <ClusterControls
              nodes={nodes}
              partitioned={partitioned}
              onKillNode={killNode}
              onReviveNode={reviveNode}
              onTogglePartition={togglePartition}
              onWrite={writeValue}
            />
            <EventLog events={events} />
          </div>

          {/* Log Stream */}
          <div className="lg:col-span-1">
            <RaftLogStream nodes={nodes} />
          </div>
        </div>

        {/* Architecture Section */}
        <RaftArchitecture />
      </main>
    </div>
  );
}
