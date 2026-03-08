import { useRaftSimulation } from "@/hooks/useRaftSimulation";
import ClusterTopology from "@/components/ClusterTopology";
import RaftLogStream from "@/components/RaftLogStream";
import ClusterControls from "@/components/ClusterControls";
import LiveMetrics from "@/components/LiveMetrics";
import EventLog from "@/components/EventLog";
import RaftArchitecture from "@/components/RaftArchitecture";
import ClientConsole from "@/components/ClientConsole";
import TimeTravel from "@/components/TimeTravel";
import StorageInspector from "@/components/StorageInspector";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import { Database } from "lucide-react";

export default function Index() {
  const {
    nodes, pulses, events, partitioned, latencies,
    rpsHistory, quorumHistory,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
    nodeLatencyOffsets, setNodeLatency,
    minorityIds, majorityIds, setPartitionGroups,
    chaosMode, toggleChaos,
    paused, togglePause,
    snapshots, viewingSnapshot, viewSnapshot,
    commitsPerSecHistory, consensusSpeed,
    selectedNodeId, setSelectedNodeId,
    rawNodes,
  } = useRaftSimulation();

  const handleNodeClick = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    // If already selected, toggle state; otherwise select for inspector
    if (selectedNodeId === id) {
      if (node.state === "down") reviveNode(id);
      else killNode(id);
    } else {
      setSelectedNodeId(id);
    }
  };

  const selectedNode = selectedNodeId ? rawNodes.find(n => n.id === selectedNodeId) : null;

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
            {chaosMode && (
              <span className="text-[10px] font-mono text-accent border border-accent/40 px-1.5 py-0.5 animate-pulse">
                🐒 CHAOS
              </span>
            )}
            {paused && (
              <span className="text-[10px] font-mono text-accent border border-accent/40 px-1.5 py-0.5">
                PAUSED
              </span>
            )}
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
        {/* Time-Travel Debugger */}
        <TimeTravel
          snapshots={snapshots}
          viewingSnapshot={viewingSnapshot}
          onViewSnapshot={viewSnapshot}
          paused={paused}
          onTogglePause={togglePause}
        />

        {/* Live Metrics Row */}
        <LiveMetrics
          nodes={nodes}
          quorumCount={quorumCount}
          quorumReached={quorumReached}
          currentTerm={currentTerm}
          latencies={latencies}
          rpsHistory={rpsHistory}
          quorumHistory={quorumHistory}
        />

        {/* Main Grid */}
        <div className={`grid grid-cols-1 gap-3 ${selectedNode ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {/* Topology */}
          <div className="lg:col-span-1">
            <ClusterTopology
              nodes={nodes}
              pulses={pulses}
              partitioned={partitioned}
              onNodeClick={handleNodeClick}
              partitionGroups={{ minority: minorityIds, majority: majorityIds }}
              onPartitionGroupsChange={setPartitionGroups}
            />
          </div>

          {/* Controls + WAL */}
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
              chaosMode={chaosMode}
              onToggleChaos={toggleChaos}
            />
            <RaftLogStream nodes={nodes} />
          </div>

          {/* Events */}
          <div className="lg:col-span-1">
            <EventLog events={events} />
          </div>

          {/* Storage Inspector (conditional 4th column) */}
          {selectedNode && (
            <div className="lg:col-span-1">
              <StorageInspector
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )}
        </div>

        {/* Advanced Analytics */}
        <AdvancedAnalytics
          commitsPerSecHistory={commitsPerSecHistory}
          consensusSpeed={consensusSpeed}
        />

        {/* Client Console */}
        <ClientConsole nodes={nodes} onWrite={writeValue} />

        {/* Architecture */}
        <RaftArchitecture />
      </main>
    </div>
  );
}
