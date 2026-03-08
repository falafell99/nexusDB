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

// Partition groups: "majority" = nodes c,d,e (indices 2,3,4), "minority" = nodes a,b (indices 0,1)
export type PartitionGroup = "majority" | "minority";

const NODE_NAMES = ["Node 01", "Node 02", "Node 03", "Node 04", "Node 05"];
const NODE_IDS = ["a", "b", "c", "d", "e"];
const MINORITY_IDS = new Set(["a", "b"]);
const MAJORITY_IDS = new Set(["c", "d", "e"]);

function getPartitionGroup(id: string): PartitionGroup {
  return MINORITY_IDS.has(id) ? "minority" : "majority";
}

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

// Raft consensus simulation hook
export function useRaftSimulation() {
  const [nodes, setNodes] = useState<RaftNode[]>(createInitialNodes);
  const [pulses, setPulses] = useState<HeartbeatPulse[]>([]);
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [partitioned, setPartitioned] = useState(false);
  const [latencies, setLatencies] = useState<number[]>([12, 15, 11, 14, 13, 16, 12, 15, 11, 18]);
  const [nodeLatencyOffsets, setNodeLatencyOffsets] = useState<Record<string, number>>({});
  const logIndexRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const minorityElectionRef = useRef<ReturnType<typeof setInterval>>();
  const partitionedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    partitionedRef.current = partitioned;
  }, [partitioned]);

  const addEvent = useCallback((type: ClusterEvent["type"], message: string) => {
    setEvents(prev => [{ id: makeEventId(), type, message, timestamp: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const setNodeLatency = useCallback((id: string, ms: number) => {
    setNodeLatencyOffsets(prev => ({ ...prev, [id]: ms }));
  }, []);

  // Check if two nodes can communicate (not separated by partition)
  const canCommunicate = useCallback((idA: string, idB: string) => {
    if (!partitionedRef.current) return true;
    return getPartitionGroup(idA) === getPartitionGroup(idB);
  }, []);

  const sendHeartbeats = useCallback(() => {
    setNodes(prev => {
      const leaders = prev.filter(n => n.state === "leader");
      if (leaders.length === 0) return prev;

      const newPulses: HeartbeatPulse[] = [];
      leaders.forEach(leader => {
        prev.forEach(n => {
          if (n.id !== leader.id && n.state !== "down" && canCommunicate(leader.id, n.id)) {
            newPulses.push({
              id: makePulseId(),
              from: leader.id,
              to: n.id,
              type: "heartbeat",
              timestamp: Date.now(),
            });
          }
        });
      });

      setPulses(p => [...p, ...newPulses]);
      setTimeout(() => {
        setPulses(p => p.filter(pulse => !newPulses.find(np => np.id === pulse.id)));
      }, 600);

      setLatencies(l => [...l.slice(1), Math.floor(8 + Math.random() * 15)]);
      return prev;
    });
  }, [canCommunicate]);

  const triggerElection = useCallback((groupFilter?: PartitionGroup, excludeId?: string) => {
    setNodes(prev => {
      let alive = prev.filter(n => n.state !== "down" && n.id !== excludeId);
      
      // If partitioned, only elect within the specified group
      if (partitionedRef.current && groupFilter) {
        alive = alive.filter(n => getPartitionGroup(n.id) === groupFilter);
      }

      if (alive.length === 0) return prev;

      const maxTerm = Math.max(...prev.map(n => n.term));
      const newTerm = maxTerm + 1;
      const candidate = alive[Math.floor(Math.random() * alive.length)];
      const groupSize = alive.length;
      const majority = partitionedRef.current ? Math.ceil(5 / 2) : Math.ceil(prev.length / 2);

      addEvent("election", `Term ${newTerm}: ${candidate.name} → CANDIDATE (group: ${groupSize})`);

      // Send vote requests only within reachable nodes
      const reachable = alive.filter(n => n.id !== candidate.id);
      const votePulses: HeartbeatPulse[] = reachable.map(n => ({
        id: makePulseId(),
        from: candidate.id,
        to: n.id,
        type: "voteRequest" as const,
        timestamp: Date.now(),
      }));

      setPulses(p => [...p, ...votePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !votePulses.find(vp => vp.id === pulse.id))), 600);

      // Majority group (3 nodes) can win; minority (2 nodes) cannot
      const canWin = groupSize >= majority;

      if (canWin) {
        setTimeout(() => {
          setNodes(curr => curr.map(n => {
            if (n.state === "down") return n;
            // Only update nodes in the same group
            if (partitionedRef.current && getPartitionGroup(n.id) !== getPartitionGroup(candidate.id)) return n;
            if (n.id === candidate.id) return { ...n, state: "leader" as NodeState, term: newTerm, votedFor: candidate.id };
            return { ...n, state: "follower" as NodeState, term: newTerm, votedFor: candidate.id };
          }));
          addEvent("election", `Term ${newTerm}: ${candidate.name} elected LEADER (majority: ${groupSize}/${5})`);
        }, 1200);
      } else {
        // Minority: election fails, stays candidate
        setTimeout(() => {
          addEvent("election", `Term ${newTerm}: ${candidate.name} ELECTION FAILED — no quorum (${groupSize}/${5})`);
        }, 1200);
      }

      return prev.map(n => {
        if (n.state === "down") return n;
        if (partitionedRef.current && getPartitionGroup(n.id) !== getPartitionGroup(candidate.id)) return n;
        if (n.id === candidate.id) return { ...n, state: "candidate" as NodeState, term: newTerm };
        return { ...n, term: newTerm };
      });
    });
  }, [addEvent]);

  const killNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node || node.state === "down") return prev;

      const wasLeader = node.state === "leader";
      addEvent("nodeDown", `${node.name} offline`);

      const updated = prev.map(n => n.id === nodeId ? { ...n, state: "down" as NodeState } : n);
      if (wasLeader) {
        const group = partitionedRef.current ? getPartitionGroup(nodeId) : undefined;
        setTimeout(() => triggerElection(group, nodeId), 1500);
      }
      return updated;
    });
  }, [addEvent, triggerElection]);

  const reviveNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node || node.state !== "down") return prev;

      const currentTerm = Math.max(...prev.map(n => n.term));
      addEvent("nodeUp", `${node.name} online → FOLLOWER`);
      return prev.map(n => n.id === nodeId ? { ...n, state: "follower" as NodeState, term: currentTerm } : n);
    });
  }, [addEvent]);

  const togglePartition = useCallback(() => {
    setPartitioned(prev => {
      const next = !prev;
      partitionedRef.current = next;

      if (next) {
        // SPLIT: partition the cluster
        addEvent("partition", "Network split: [N-01,N-02] ↔ [N-03,N-04,N-05]");
        
        // Immediately update node states based on partition
        setNodes(curr => {
          const updated = curr.map(n => {
            if (n.state === "down") return n;
            // If current leader is in minority, it loses leadership
            if (n.state === "leader" && MINORITY_IDS.has(n.id)) {
              return { ...n, state: "candidate" as NodeState };
            }
            // If current leader is in majority, minority nodes become candidates
            if (n.state === "follower" && MINORITY_IDS.has(n.id)) {
              return { ...n, state: "candidate" as NodeState };
            }
            return n;
          });
          return updated;
        });

        // Trigger election in majority group
        setTimeout(() => triggerElection("majority"), 1500);
        
        // Start minority failing elections repeatedly
        minorityElectionRef.current = setInterval(() => {
          if (partitionedRef.current) {
            triggerElection("minority");
          }
        }, 4000);
        // First minority election attempt
        setTimeout(() => triggerElection("minority"), 2500);

      } else {
        // HEAL: reconcile
        if (minorityElectionRef.current) {
          clearInterval(minorityElectionRef.current);
          minorityElectionRef.current = undefined;
        }

        addEvent("partition", "Partition healed — reconciling...");

        // Find majority leader's log and sync to minority
        setNodes(curr => {
          const majorityLeader = curr.find(n => n.state === "leader" && MAJORITY_IDS.has(n.id));
          if (!majorityLeader) {
            // Just trigger a fresh election
            setTimeout(() => triggerElection(), 1000);
            return curr;
          }

          const leaderLog = majorityLeader.log;
          const leaderTerm = majorityLeader.term;
          
          // Reconcile: minority nodes get the leader's log and become followers
          const reconciled = curr.map(n => {
            if (n.state === "down") return n;
            if (MINORITY_IDS.has(n.id)) {
              return {
                ...n,
                state: "follower" as NodeState,
                term: leaderTerm,
                log: [...leaderLog],
                votedFor: majorityLeader.id,
              };
            }
            return n;
          });

          // Show reconciliation pulses
          const reconPulses: HeartbeatPulse[] = [];
          curr.filter(n => MINORITY_IDS.has(n.id) && n.state !== "down").forEach(n => {
            reconPulses.push({
              id: makePulseId(),
              from: majorityLeader.id,
              to: n.id,
              type: "appendEntries",
              timestamp: Date.now(),
            });
          });
          setPulses(p => [...p, ...reconPulses]);
          setTimeout(() => setPulses(p => p.filter(pulse => !reconPulses.find(rp => rp.id === pulse.id))), 1000);

          const missingCount = leaderLog.length;
          addEvent("reconcile", `${majorityLeader.name} → minority: synced ${missingCount} log entries`);
          addEvent("reconcile", `Minority nodes [N-01, N-02] → FOLLOWER (term ${leaderTerm})`);

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

    setNodes(prev => {
      const leader = prev.find(n => n.state === "leader");
      if (!leader) {
        addEvent("write", `REJECTED: No leader`);
        return prev;
      }

      // If partitioned and leader is in minority, reject
      if (partitionedRef.current && MINORITY_IDS.has(leader.id)) {
        addEvent("write", `REJECTED: Leader in minority partition — no quorum`);
        return prev;
      }

      const currentTerm = leader.term;
      const entry: LogEntry = { index: idx, term: currentTerm, command, committed: false, timestamp: Date.now() };

      addEvent("write", `${leader.name} ← ${command}`);

      // Only replicate to reachable followers
      const followers = prev.filter(n => n.state === "follower" && canCommunicate(leader.id, n.id));
      const replicatePulses: HeartbeatPulse[] = followers.map(f => ({
        id: makePulseId(),
        from: leader.id,
        to: f.id,
        type: "appendEntries" as const,
        timestamp: Date.now(),
      }));

      setPulses(p => [...p, ...replicatePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !replicatePulses.find(rp => rp.id === pulse.id))), 800);

      setTimeout(() => {
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          // Only commit to reachable nodes
          if (partitionedRef.current && !canCommunicate(leader.id, n.id)) return n;
          return { ...n, log: [...n.log, { ...entry, committed: true }].slice(-20) };
        }));
        addEvent("commit", `COMMITTED: ${command} [idx:${idx} term:${currentTerm}]`);
        setLatencies(l => [...l.slice(1), Math.floor(10 + Math.random() * 20)]);
      }, 800);

      return prev.map(n => {
        if (n.id === leader.id) return { ...n, log: [...n.log, entry].slice(-20) };
        return n;
      });
    });
  }, [addEvent, canCommunicate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (minorityElectionRef.current) clearInterval(minorityElectionRef.current);
    };
  }, []);

  useEffect(() => {
    heartbeatRef.current = setInterval(sendHeartbeats, 2000);
    return () => clearInterval(heartbeatRef.current);
  }, [sendHeartbeats]);

  const quorumCount = nodes.filter(n => n.state !== "down").length;
  const quorumReached = quorumCount >= 3;
  const currentTerm = Math.max(...nodes.map(n => n.term));

  return {
    nodes, pulses, events, partitioned, latencies,
    quorumCount, quorumReached, currentTerm,
    killNode, reviveNode, togglePartition, writeValue,
    nodeLatencyOffsets, setNodeLatency,
  };
}
