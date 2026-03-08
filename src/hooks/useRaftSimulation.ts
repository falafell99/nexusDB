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
  type: "election" | "commit" | "nodeDown" | "nodeUp" | "write" | "partition" | "reconcile";
  message: string;
  timestamp: number;
}

export type PartitionGroup = "majority" | "minority";

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

  useEffect(() => {
    metricsRef.current = setInterval(() => {
      const rps = rpsCounterRef.current;
      rpsCounterRef.current = 0;
      setRpsHistory(prev => [...prev.slice(1), rps]);
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
      const updated = prev.map(n => n.id === nodeId ? { ...n, state: "down" as NodeState } : n);
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
      return prev.map(n => n.id === nodeId ? { ...n, state: "follower" as NodeState, term: currentTerm } : n);
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
    const command = `SET ${key} ${value}`;
    logIndexRef.current += 1;
    const idx = logIndexRef.current;
    rpsCounterRef.current += 1;

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
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          if (partitionedRef.current && !canCommunicate(leader.id, n.id)) return n;
          return { ...n, log: [...n.log, { ...entry, committed: true }].slice(-20) };
        }));
        addEvent("commit", `[QUORUM] Majority reached for Index ${idx} — COMMITTED: ${command}`);
        setLatencies(l => [...l.slice(1), Math.floor(10 + Math.random() * 20)]);
      }, 800);

      return prev.map(n => {
        if (n.id === leader.id) return { ...n, log: [...n.log, entry].slice(-20) };
        return n;
      });
    });
  }, [addEvent, canCommunicate]);

  useEffect(() => {
    return () => {
      if (minorityElectionRef.current) clearInterval(minorityElectionRef.current);
    };
  }, []);

  const quorumCount = nodes.filter(n => n.state !== "down").length;
  const quorumReached = quorumCount >= 3;
  const currentTerm = Math.max(...nodes.map(n => n.term));

  return {
    nodes, pulses, events, partitioned, latencies,
    rpsHistory, quorumHistory,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
    nodeLatencyOffsets, setNodeLatency,
    minorityIds, majorityIds, setPartitionGroups,
  };
}
