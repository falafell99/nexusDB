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
  type: "election" | "commit" | "nodeDown" | "nodeUp" | "write" | "partition";
  message: string;
  timestamp: number;
}

const NODE_NAMES = ["Node A", "Node B", "Node C", "Node D", "Node E"];
const NODE_IDS = ["a", "b", "c", "d", "e"];

function createInitialNodes(): RaftNode[] {
  return NODE_IDS.map((id, i) => ({
    id,
    name: NODE_NAMES[i],
    state: i === 0 ? "leader" : "follower" as NodeState,
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
  const logIndexRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  const addEvent = useCallback((type: ClusterEvent["type"], message: string) => {
    setEvents(prev => [{ id: makeEventId(), type, message, timestamp: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const getLeader = useCallback(() => {
    return nodes.find(n => n.state === "leader");
  }, [nodes]);

  const getAliveNodes = useCallback(() => {
    return nodes.filter(n => n.state !== "down");
  }, [nodes]);

  const sendHeartbeats = useCallback(() => {
    setNodes(prev => {
      const leader = prev.find(n => n.state === "leader");
      if (!leader) return prev;

      const newPulses: HeartbeatPulse[] = [];
      prev.forEach(n => {
        if (n.id !== leader.id && n.state !== "down") {
          newPulses.push({
            id: makePulseId(),
            from: leader.id,
            to: n.id,
            type: "heartbeat",
            timestamp: Date.now(),
          });
        }
      });

      setPulses(p => [...p, ...newPulses]);
      setTimeout(() => {
        setPulses(p => p.filter(pulse => !newPulses.find(np => np.id === pulse.id)));
      }, 800);

      setLatencies(l => [...l.slice(1), Math.floor(8 + Math.random() * 15)]);

      return prev;
    });
  }, []);

  const triggerElection = useCallback((excludeId?: string) => {
    setNodes(prev => {
      const alive = prev.filter(n => n.state !== "down" && n.id !== excludeId);
      if (alive.length === 0) return prev;

      const maxTerm = Math.max(...prev.map(n => n.term));
      const newTerm = maxTerm + 1;

      // Pick random candidate from alive nodes
      const candidate = alive[Math.floor(Math.random() * alive.length)];

      addEvent("election", `Election started. ${candidate.name} is candidate for Term ${newTerm}`);

      // Send vote requests
      const votePulses: HeartbeatPulse[] = alive
        .filter(n => n.id !== candidate.id)
        .map(n => ({
          id: makePulseId(),
          from: candidate.id,
          to: n.id,
          type: "voteRequest" as const,
          timestamp: Date.now(),
        }));

      setPulses(p => [...p, ...votePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !votePulses.find(vp => vp.id === pulse.id))), 800);

      // After brief delay, candidate becomes leader
      setTimeout(() => {
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          if (n.id === candidate.id) return { ...n, state: "leader" as NodeState, term: newTerm, votedFor: candidate.id };
          return { ...n, state: "follower" as NodeState, term: newTerm, votedFor: candidate.id };
        }));
        addEvent("election", `${candidate.name} elected as Leader for Term ${newTerm}`);
      }, 1200);

      return prev.map(n => {
        if (n.state === "down") return n;
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
      addEvent("nodeDown", `${node.name} went offline`);

      const updated = prev.map(n => n.id === nodeId ? { ...n, state: "down" as NodeState } : n);

      if (wasLeader) {
        setTimeout(() => triggerElection(nodeId), 1500);
      }

      return updated;
    });
  }, [addEvent, triggerElection]);

  const reviveNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev.find(n => n.id === nodeId);
      if (!node || node.state !== "down") return prev;

      const currentTerm = Math.max(...prev.map(n => n.term));
      addEvent("nodeUp", `${node.name} came back online as Follower`);

      return prev.map(n => n.id === nodeId ? { ...n, state: "follower" as NodeState, term: currentTerm } : n);
    });
  }, [addEvent]);

  const togglePartition = useCallback(() => {
    setPartitioned(prev => {
      const next = !prev;
      if (next) {
        addEvent("partition", "Network partition: [A,B] isolated from [C,D,E]");
        // Trigger election in majority partition
        setTimeout(() => triggerElection(), 2000);
      } else {
        addEvent("partition", "Network partition healed. Cluster re-converging.");
        setTimeout(() => triggerElection(), 1000);
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
        addEvent("write", `Write rejected: No leader available`);
        return prev;
      }

      const currentTerm = leader.term;
      const entry: LogEntry = { index: idx, term: currentTerm, command, committed: false, timestamp: Date.now() };

      addEvent("write", `Leader ${leader.name} received: ${command}`);

      // Replicate to followers
      const followers = prev.filter(n => n.state === "follower");
      const replicatePulses: HeartbeatPulse[] = followers.map(f => ({
        id: makePulseId(),
        from: leader.id,
        to: f.id,
        type: "appendEntries" as const,
        timestamp: Date.now(),
      }));

      setPulses(p => [...p, ...replicatePulses]);
      setTimeout(() => setPulses(p => p.filter(pulse => !replicatePulses.find(rp => rp.id === pulse.id))), 1000);

      // Commit after quorum
      setTimeout(() => {
        setNodes(curr => curr.map(n => {
          if (n.state === "down") return n;
          return {
            ...n,
            log: [...n.log, { ...entry, committed: true }].slice(-20),
          };
        }));
        addEvent("commit", `Committed: ${command} (Index ${idx}, Term ${currentTerm}) — Quorum reached`);
        setLatencies(l => [...l.slice(1), Math.floor(10 + Math.random() * 20)]);
      }, 800);

      return prev.map(n => {
        if (n.id === leader.id) return { ...n, log: [...n.log, entry].slice(-20) };
        return n;
      });
    });
  }, [addEvent]);

  // Heartbeat interval
  useEffect(() => {
    heartbeatRef.current = setInterval(sendHeartbeats, 2000);
    return () => clearInterval(heartbeatRef.current);
  }, [sendHeartbeats]);

  const quorumCount = nodes.filter(n => n.state !== "down").length;
  const quorumReached = quorumCount >= 3;
  const currentTerm = Math.max(...nodes.map(n => n.term));

  return {
    nodes,
    pulses,
    events,
    partitioned,
    latencies,
    quorumCount,
    quorumReached,
    currentTerm,
    killNode,
    reviveNode,
    togglePartition,
    writeValue,
    getLeader,
    getAliveNodes,
  };
}
