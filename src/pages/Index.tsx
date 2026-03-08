import { useRaftSimulation } from "@/hooks/useRaftSimulation";
import ClusterTopology from "@/components/ClusterTopology";
import RaftLogStream from "@/components/RaftLogStream";
import ClusterControls from "@/components/ClusterControls";
import LiveMetrics from "@/components/LiveMetrics";
import EventLog from "@/components/EventLog";
import RaftArchitecture from "@/components/RaftArchitecture";
import { Database } from "lucide-react";

export default function Index() {
  const {
    nodes, pulses, events, partitioned, latencies,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
    nodeLatencyOffsets, setNodeLatency,
  } = useRaftSimulation();

  const handleNodeClick = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    if (node.state === "down") reviveNode(id);
    else killNode(id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-primary" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground tracking-tight">NexusDB</h1>
              <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5">v2.4.1</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-muted-foreground">CLUSTER MONITOR</span>
            <div className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono border ${
              quorumReached
                ? "border-primary/40 text-primary"
                : "border-destructive/40 text-destructive"
            }`}>
              <span className={`w-1.5 h-1.5 ${quorumReached ? "bg-primary pulse-animation" : "bg-destructive"}`} />
              {quorumReached ? "OPERATIONAL" : "DEGRADED"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-3">
        {/* Live Metrics Row */}
        <LiveMetrics
          nodes={nodes}
          quorumCount={quorumCount}
          quorumReached={quorumReached}
          currentTerm={currentTerm}
          latencies={latencies}
          events={events}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Topology */}
          <div className="lg:col-span-1">
            <ClusterTopology nodes={nodes} pulses={pulses} onNodeClick={handleNodeClick} />
          </div>

          {/* Controls + Events */}
          <div className="lg:col-span-1 space-y-3">
            <ClusterControls
              nodes={nodes}
              partitioned={partitioned}
              onKillNode={killNode}
              onReviveNode={reviveNode}
              onTogglePartition={togglePartition}
              onWrite={writeValue}
              nodeLatencyOffsets={nodeLatencyOffsets}
              onSetNodeLatency={setNodeLatency}
            />
            <EventLog events={events} />
          </div>

          {/* Log Stream */}
          <div className="lg:col-span-1">
            <RaftLogStream nodes={nodes} />
          </div>
        </div>

        {/* Architecture */}
        <RaftArchitecture />
      </main>
    </div>
  );
}
