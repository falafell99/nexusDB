import { useState, useCallback, useRef, useEffect } from "react";

export type NodeState = "leader" | "follower" | "candidate" | "down";

export interface LogEntry {
  index: number;
  term: number;
  command: string;
  committed: boolean;
  timestamp: number;
}

export interface RaftNode {
  id: string;
  name: string;
  state: NodeState;
  term: number;
  log: LogEntry[];
  votedFor: string | null;
  stressed?: boolean;
}

export interface HeartbeatPulse {
  id: string;
  from: string;
  to: string;
  type: "heartbeat" | "appendEntries" | "voteRequest" | "voteResponse";
  timestamp: number;
}

export interface ClusterEvent {
  id: string;
  type: "election" | "commit" | "nodeDown" | "nodeUp" | "write" | "partition" | "reconcile" | "chaos";
  message: string;
  timestamp: number;
}

export type PartitionGroup = "majority" | "minority";

export interface ClusterSnapshot {
  nodes: RaftNode[];
  events: ClusterEvent[];
  timestamp: number;
}

const NODE_NAMES = ["Node 01", "Node 02", "Node 03", "Node 04", "Node 05"];
const NODE_IDS = ["a", "b", "c", "d", "e"];

function createInitialNodes(): RaftNode[] {
  return NODE_IDS.map((id, i) => ({
    id,
    name: NODE_NAMES[i],
    state: (i === 0 ? "leader" : "follower") as NodeState,
    term: 1,
    log: [],
    votedFor: "a",
    stressed: false,
  }));
}

let eventCounter = 0;
const makeEventId = () => `evt-${++eventCounter}-${Date.now()}`;
let pulseCounter = 0;
const makePulseId = () => `pulse-${++pulseCounter}-${Date.now()}`;

export function useRaftSimulation() {
  const [nodes, setNodes] = useState<RaftNode[]>(createInitialNodes);
  const [pulses, setPulses] = useState<HeartbeatPulse[]>([]);
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [partitioned, setPartitioned] = useState(false);
  const [latencies, setLatencies] = useState<number[]>([12, 15, 11, 14, 13, 16, 12, 15, 11, 18]);
  const [rpsHistory, setRpsHistory] = useState<number[]>(Array(20).fill(0));
  const [quorumHistory, setQuorumHistory] = useState<number[]>(Array(20).fill(100));
  const [nodeLatencyOffsets, setNodeLatencyOffsets] = useState<Record<string, number>>({});
  const [minorityIds, setMinorityIds] = useState<Set<string>>(new Set(["a", "b"]));
  const [majorityIds, setMajorityIds] = useState<Set<string>>(new Set(["c", "d", "e"]));

  // Chaos mode
  const [chaosMode, setChaosMode] = useState(false);
  const chaosModeRef = useRef(false);
  const chaosIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Play/Pause
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Time-travel snapshots
  const [snapshots, setSnapshots] = useState<ClusterSnapshot[]>([]);
  const [viewingSnapshot, setViewingSnapshot] = useState<number | null>(null);
  const maxSnapshots = 200;

  // Advanced analytics
  const [commitsPerSecHistory, setCommitsPerSecHistory] = useState<number[]>(Array(20).fill(0));
  const [consensusSpeed, setConsensusSpeed] = useState(0);
  const commitCounterRef = useRef(0);
  const lastConsensusRef = useRef(0);

  // Storage inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const logIndexRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const metricsRef = useRef<ReturnType<typeof setInterval>>();
  const minorityElectionRef = useRef<ReturnType<typeof setInterval>>();
  const partitionedRef = useRef(false);
  const rpsCounterRef = useRef(0);
  const minorityIdsRef = useRef(minorityIds);
  const majorityIdsRef = useRef(majorityIds);

  useEffect(() => { partitionedRef.current = partitioned; }, [partitioned]);
  useEffect(() => { minorityIdsRef.current = minorityIds; }, [minorityIds]);
  useEffect(() => { majorityIdsRef.current = majorityIds; }, [majorityIds]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { chaosModeRef.current = chaosMode; }, [chaosMode]);

  const setPartitionGroups = useCallback((groups: { minority: Set<string>; majority: Set<string> }) => {
    setMinorityIds(groups.minority);
    setMajorityIds(groups.majority);
  }, []);

  const getPartitionGroup = useCallback((id: string): PartitionGroup => {
    return minorityIdsRef.current.has(id) ? "minority" : "majority";
  }, []);

  const addEvent = useCallback((type: ClusterEvent["type"], message: string) => {
    setEvents(prev => [{ id: makeEventId(), type, message, timestamp: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const setNodeLatency = useCallback((id: string, ms: number) => {
    setNodeLatencyOffsets(prev => ({ ...prev, [id]: ms }));
  }, []);

  const canCommunicate = useCallback((idA: string, idB: string) => {
    if (!partitionedRef.current) return true;
    return getPartitionGroup(idA) === getPartitionGroup(idB);
  }, [getPartitionGroup]);

  // Snapshot recording
  useEffect(() => {
    const snapInterval = setInterval(() => {
      if (pausedRef.current) return;
      setNodes(curr => {
        setEvents(evts => {
          setSnapshots(prev => {
            const snap: ClusterSnapshot = {
              nodes: curr.map(n => ({ ...n, log: [...n.log] })),
              events: evts.slice(0, 10),
              timestamp: Date.now(),
            };
            return [...prev, snap].slice(-maxSnapshots);
          });
          return evts;
        });
        return curr;
      });
    }, 500);
    return () => clearInterval(snapInterval);
  }, []);

  // Metrics interval
  useEffect(() => {
    metricsRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const rps = rpsCounterRef.current;
      rpsCounterRef.current = 0;
      const cps = commitCounterRef.current;
      commitCounterRef.current = 0;
      setRpsHistory(prev => [...prev.slice(1), rps]);
      setCommitsPerSecHistory(prev => [...prev.slice(1), cps]);
      setNodes(curr => {
        const alive = curr.filter(n => n.state !== "down").length;
        const health = alive >= 3 ? 100 : Math.round((alive / 3) * 100);
        setQuorumHistory(prev => [...prev.slice(1), health]);
        return curr;
      });
    }, 1000);
    return () => clearInterval(metricsRef.current);
  }, []);

  const sendHeartbeats = useCallback(() => {
    if (pausedRef.current) return;
    setNodes(prev => {
      const leaders = prev.filter(n => n.state === "leader");
      if (leaders.length === 0) return prev;
      const newPulses: HeartbeatPulse[] = [];
      leaders.forEach(leader => {
        prev.forEach(n => {
          if (n.id !== leader.id && n.state !== "down" && canCommunicate(leader.id, n.id)) {
            newPulses.push({ id: makePulseId(), from: leader.id, to: n.id, type: "heartbeat", timestamp: Date.now() });
          }
        });
      });
      setPulses(p => [...p, ...newPulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !newPulses.find(np => np.id === pulse.id))), 600);
      const avgOffset = Object.values(nodeLatencyOffsets).reduce((a, b) => a + b, 0) / Math.max(Object.keys(nodeLatencyOffsets).length, 1);
      setLatencies(l => [...l.slice(1), Math.floor(8 + Math.random() * 15 + avgOffset * 0.3)]);
      rpsCounterRef.current += newPulses.length;
      return prev;
    });
  }, [canCommunicate, nodeLatencyOffsets]);

  useEffect(() => {
    const maxOffset = Math.max(0, ...Object.values(nodeLatencyOffsets));
    const interval = 2000 + maxOffset * 2;
    heartbeatRef.current = setInterval(sendHeartbeats, interval);
    return () => clearInterval(heartbeatRef.current);
  }, [sendHeartbeats, nodeLatencyOffsets]);

  const triggerElection = useCallback((groupFilter?: PartitionGroup, excludeId?: string) => {
    if (pausedRef.current) return;
    setNodes(prev => {
      let alive = prev.filter(n => n.state !== "down" && n.id !== excludeId);
      if (partitionedRef.current && groupFilter) {
        alive = alive.filter(n => getPartitionGroup(n.id) === groupFilter);
      }
      if (alive.length === 0) return prev;

      const maxTerm = Math.max(...prev.map(n => n.term));
      const newTerm = maxTerm + 1;
      const candidate = alive[Math.floor(Math.random() * alive.length)];
      const groupSize = alive.length;
      const majority = Math.ceil(5 / 2);

      addEvent("election", `[TERM ${newTerm}] Leader Election initiated — ${candidate.name} → CANDIDATE (${groupSize} nodes)`);

      const reachable = alive.filter(n => n.id !== candidate.id);
      const votePulses: HeartbeatPulse[] = reachable.map(n => ({
        id: makePulseId(), from: candidate.id, to: n.id, type: "voteRequest" as const, timestamp: Date.now(),
      }));
      setPulses(p => [...p, ...votePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !votePulses.find(vp => vp.id === pulse.id))), 600);
      rpsCounterRef.current += votePulses.length;

      const canWin = groupSize >= majority;
      if (canWin) {
        setTimeout(() => {
          if (pausedRef.current) return;
          setNodes(curr => curr.map(n => {
            if (n.state === "down") return n;
            if (partitionedRef.current && getPartitionGroup(n.id) !== getPartitionGroup(candidate.id)) return n;
            if (n.id === candidate.id) return { ...n, state: "leader" as NodeState, term: newTerm, votedFor: candidate.id };
            return { ...n, state: "follower" as NodeState, term: newTerm, votedFor: candidate.id };
          }));
          addEvent("election", `[TERM ${newTerm}] ${candidate.name} elected LEADER — [QUORUM] Majority reached (${groupSize}/5)`);
        }, 1200);
      } else {
        setTimeout(() => {
          addEvent("election", `[TERM ${newTerm}] ${candidate.name} ELECTION FAILED — no quorum (${groupSize}/5)`);
        }, 1200);
      }

      return prev.map(n => {
        if (n.state === "down") return n;
        if (partitionedRef.current && getPartitionGroup(n.id) !== getPartitionGroup(candidate.id)) return n;
        if (n.id === candidate.id) return { ...n, state: "candidate" as NodeState, term: newTerm };
        return { ...n, term: newTerm };
      });
    });
  }, [addEvent, getPartitionGroup]);

  const killNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node || node.state === "down") return prev;
      const wasLeader = node.state === "leader";
      addEvent("nodeDown", `[${node.name.replace("Node ", "NODE ")}] Heartbeat timeout — node offline`);
      const updated = prev.map(n => n.id === nodeId ? { ...n, state: "down" as NodeState, stressed: false } : n);
      if (wasLeader) {
        const group = partitionedRef.current ? getPartitionGroup(nodeId) : undefined;
        setTimeout(() => triggerElection(group, nodeId), 1500);
      }
      return updated;
    });
  }, [addEvent, triggerElection, getPartitionGroup]);

  const reviveNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node || node.state !== "down") return prev;
      const currentTerm = Math.max(...prev.map(n => n.term));
      addEvent("nodeUp", `[${node.name.replace("Node ", "NODE ")}] Node online → FOLLOWER`);
      return prev.map(n => n.id === nodeId ? { ...n, state: "follower" as NodeState, term: currentTerm, stressed: false } : n);
    });
  }, [addEvent]);

  const togglePartition = useCallback(() => {
    setPartitioned(prev => {
      const next = !prev;
      partitionedRef.current = next;

      if (next) {
        const minNames = NODE_IDS.filter(id => minorityIdsRef.current.has(id)).map((_, i) => `N-0${NODE_IDS.indexOf(_) + 1}`).join(",");
        const majNames = NODE_IDS.filter(id => majorityIdsRef.current.has(id)).map((_, i) => `N-0${NODE_IDS.indexOf(_) + 1}`).join(",");
        addEvent("partition", `Network split: [${minNames}] ↔ [${majNames}]`);
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          if ((n.state === "leader" || n.state === "follower") && minorityIdsRef.current.has(n.id)) {
            return { ...n, state: "candidate" as NodeState };
          }
          return n;
        }));
        setTimeout(() => triggerElection("majority"), 1500);
        minorityElectionRef.current = setInterval(() => {
          if (partitionedRef.current) triggerElection("minority");
        }, 4000);
        setTimeout(() => triggerElection("minority"), 2500);
      } else {
        if (minorityElectionRef.current) {
          clearInterval(minorityElectionRef.current);
          minorityElectionRef.current = undefined;
        }
        addEvent("partition", "Partition healed — reconciling...");
        setNodes(curr => {
          const majorLeader = curr.find(n => n.state === "leader" && majorityIdsRef.current.has(n.id));
          if (!majorLeader) {
            setTimeout(() => triggerElection(), 1000);
            return curr;
          }
          const leaderLog = majorLeader.log;
          const leaderTerm = majorLeader.term;
          const reconciled = curr.map(n => {
            if (n.state === "down") return n;
            if (minorityIdsRef.current.has(n.id)) {
              return { ...n, state: "follower" as NodeState, term: leaderTerm, log: [...leaderLog], votedFor: majorLeader.id };
            }
            return n;
          });
          const reconPulses: HeartbeatPulse[] = [];
          curr.filter(n => minorityIdsRef.current.has(n.id) && n.state !== "down").forEach(n => {
            reconPulses.push({ id: makePulseId(), from: majorLeader.id, to: n.id, type: "appendEntries", timestamp: Date.now() });
          });
          setPulses(p => [...p, ...reconPulses]);
          setTimeout(() => setPulses(p => p.filter(pulse => !reconPulses.find(rp => rp.id === pulse.id))), 1000);
          addEvent("reconcile", `[QUORUM] ${majorLeader.name} → minority: synced ${leaderLog.length} WAL entries`);
          return reconciled;
        });
      }
      return next;
    });
  }, [addEvent, triggerElection]);

  const writeValue = useCallback((key: string, value: string) => {
    if (pausedRef.current) return;
    const command = `SET ${key} ${value}`;
    logIndexRef.current += 1;
    const idx = logIndexRef.current;
    rpsCounterRef.current += 1;
    const writeStart = Date.now();

    setNodes(prev => {
      const leader = prev.find(n => n.state === "leader");
      if (!leader) {
        addEvent("write", `REJECTED: No leader`);
        return prev;
      }
      if (partitionedRef.current && minorityIdsRef.current.has(leader.id)) {
        addEvent("write", `REJECTED: Leader in minority partition — no quorum`);
        return prev;
      }

      const currentTerm = leader.term;
      const entry: LogEntry = { index: idx, term: currentTerm, command, committed: false, timestamp: Date.now() };
      addEvent("write", `[${leader.name.replace("Node ", "NODE ")}] ← ${command}`);

      const followers = prev.filter(n => n.state === "follower" && canCommunicate(leader.id, n.id));
      const replicatePulses: HeartbeatPulse[] = followers.map(f => ({
        id: makePulseId(), from: leader.id, to: f.id, type: "appendEntries" as const, timestamp: Date.now(),
      }));
      setPulses(p => [...p, ...replicatePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !replicatePulses.find(rp => rp.id === pulse.id))), 800);
      rpsCounterRef.current += replicatePulses.length;

      setTimeout(() => {
        if (pausedRef.current) return;
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          if (partitionedRef.current && !canCommunicate(leader.id, n.id)) return n;
          return { ...n, log: [...n.log, { ...entry, committed: true }].slice(-20) };
        }));
        commitCounterRef.current += 1;
        const speed = Date.now() - writeStart;
        lastConsensusRef.current = speed;
        setConsensusSpeed(speed);
        addEvent("commit", `[QUORUM] Majority reached for Index ${idx} — COMMITTED: ${command}`);
        setLatencies(l => [...l.slice(1), Math.floor(10 + Math.random() * 20)]);
      }, 800);

      return prev.map(n => {
        if (n.id === leader.id) return { ...n, log: [...n.log, entry].slice(-20) };
        return n;
      });
    });
  }, [addEvent, canCommunicate]);

  // Chaos Monkey
  const toggleChaos = useCallback(() => {
    setChaosMode(prev => {
      const next = !prev;
      chaosModeRef.current = next;
      if (next) {
        addEvent("chaos", "🐒 Chaos Monkey ENABLED — expect random failures");
      } else {
        addEvent("chaos", "🐒 Chaos Monkey DISABLED");
        // Clear all stress
        setNodes(curr => curr.map(n => ({ ...n, stressed: false })));
      }
      return next;
    });
  }, [addEvent]);

  useEffect(() => {
    if (!chaosMode) {
      if (chaosIntervalRef.current) clearInterval(chaosIntervalRef.current);
      return;
    }
    chaosIntervalRef.current = setInterval(() => {
      if (pausedRef.current || !chaosModeRef.current) return;
      const action = Math.random();
      if (action < 0.4) {
        // Network flip — latency spike on random node
        setNodes(curr => {
          const alive = curr.filter(n => n.state !== "down");
          if (alive.length === 0) return curr;
          const target = alive[Math.floor(Math.random() * alive.length)];
          addEvent("chaos", `🐒 Network Flip — ${target.name} latency spike +200ms`);
          setNodeLatencyOffsets(prev => ({ ...prev, [target.id]: (prev[target.id] || 0) + 200 }));
          // Mark stressed
          const updated = curr.map(n => n.id === target.id ? { ...n, stressed: true } : n);
          // Auto-recover after 3-5s
          setTimeout(() => {
            if (!chaosModeRef.current) return;
            setNodeLatencyOffsets(prev => {
              const val = (prev[target.id] || 0) - 200;
              return { ...prev, [target.id]: Math.max(0, val) };
            });
            setNodes(c => c.map(n => n.id === target.id ? { ...n, stressed: false } : n));
          }, 3000 + Math.random() * 2000);
          return updated;
        });
      } else {
        // Node sleep — random node goes down for 3-5s
        setNodes(curr => {
          const alive = curr.filter(n => n.state !== "down");
          if (alive.length <= 1) return curr; // keep at least 1
          const target = alive[Math.floor(Math.random() * alive.length)];
          addEvent("chaos", `🐒 Node Sleep — ${target.name} unresponsive (3-5s)`);
          const wasLeader = target.state === "leader";
          const updated = curr.map(n => n.id === target.id ? { ...n, state: "down" as NodeState, stressed: true } : n);
          if (wasLeader) {
            const group = partitionedRef.current ? getPartitionGroup(target.id) : undefined;
            setTimeout(() => triggerElection(group, target.id), 1500);
          }
          // Auto-revive
          setTimeout(() => {
            if (!chaosModeRef.current) return;
            setNodes(c => {
              const node = c.find(n => n.id === target.id);
              if (!node || node.state !== "down") return c;
              const t = Math.max(...c.map(n => n.term));
              addEvent("chaos", `🐒 ${target.name} recovered from sleep`);
              return c.map(n => n.id === target.id ? { ...n, state: "follower" as NodeState, term: t, stressed: false } : n);
            });
          }, 3000 + Math.random() * 2000);
          return updated;
        });
      }
    }, 3000 + Math.random() * 3000);
    return () => {
      if (chaosIntervalRef.current) clearInterval(chaosIntervalRef.current);
    };
  }, [chaosMode, addEvent, getPartitionGroup, triggerElection]);

  // Toggle play/pause
  const togglePause = useCallback(() => {
    setPaused(prev => !prev);
  }, []);

  // View a specific snapshot for time-travel
  const viewSnapshot = useCallback((index: number | null) => {
    setViewingSnapshot(index);
  }, []);

  useEffect(() => {
    return () => {
      if (minorityElectionRef.current) clearInterval(minorityElectionRef.current);
    };
  }, []);

  // Derived snapshot view
  const activeSnapshot = viewingSnapshot !== null ? snapshots[viewingSnapshot] : null;
  const displayNodes = activeSnapshot ? activeSnapshot.nodes : nodes;
  const displayEvents = activeSnapshot ? activeSnapshot.events : events;

  const quorumCount = displayNodes.filter(n => n.state !== "down").length;
  const quorumReached = quorumCount >= 3;
  const currentTerm = Math.max(...displayNodes.map(n => n.term));

  return {
    nodes: displayNodes, pulses, events: displayEvents, partitioned, latencies,
    rpsHistory, quorumHistory,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
    nodeLatencyOffsets, setNodeLatency,
    minorityIds, majorityIds, setPartitionGroups,
    // Chaos
    chaosMode, toggleChaos,
    // Play/pause
    paused, togglePause,
    // Time-travel
    snapshots, viewingSnapshot, viewSnapshot,
    // Analytics
    commitsPerSecHistory, consensusSpeed,
    // Inspector
    selectedNodeId, setSelectedNodeId,
    // Raw nodes for inspector when viewing snapshot
    rawNodes: nodes,
  };
}
