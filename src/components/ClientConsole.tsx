import { useState, useRef, useEffect, useCallback } from "react";
import type { RaftNode } from "@/hooks/useRaftSimulation";
import { Terminal, ChevronRight } from "lucide-react";

interface ConsoleEntry {
  id: string;
  type: "input" | "info" | "success" | "error" | "rpc";
  text: string;
  timestamp: number;
}

interface Props {
  nodes: RaftNode[];
  onWrite: (key: string, value: string) => void;
}

let entryCounter = 0;

export default function ClientConsole({ nodes, onWrite }: Props) {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ConsoleEntry[]>([
    { id: "init-0", type: "info", text: "NexusDB Client v2.4.1 — connected to cluster", timestamp: Date.now() },
    { id: "init-1", type: "info", text: "Type SET key=value to write, GET key to read, or HELP for commands.", timestamp: Date.now() },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [savedInput, setSavedInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const addEntry = useCallback((type: ConsoleEntry["type"], text: string) => {
    setEntries(prev => [...prev, { id: `ce-${++entryCounter}`, type, text, timestamp: Date.now() }].slice(-80));
  }, []);

  const handleSubmit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    setHistory(prev => [...prev.filter(h => h !== cmd), cmd]);
    setHistoryIdx(-1);
    setSavedInput("");

    addEntry("input", cmd);

    // Parse GET key
    const getMatch = cmd.match(/^GET\s+(\w+)$/i);
    if (getMatch) {
      const [, key] = getMatch;
      const leader = nodes.find(n => n.state === "leader");
      if (!leader) {
        addEntry("error", "ERR: No leader available. Cluster may be in election.");
        return;
      }
      addEntry("info", `→ Reading from ${leader.name} (LEADER)`);
      // Search committed log for latest SET of this key
      const entries_log = [...leader.log].reverse();
      const found = entries_log.find(e => e.committed && e.command.startsWith(`SET ${key} `));
      if (found) {
        const val = found.command.replace(`SET ${key} `, "");
        setTimeout(() => {
          addEntry("success", `✓ ${key} = "${val}" (index:${found.index}, term:${found.term})`);
        }, 200);
      } else {
        setTimeout(() => {
          addEntry("error", `✗ Key "${key}" not found in committed log.`);
        }, 200);
      }
      return;
    }

    // Parse SET key=value
    const setMatch = cmd.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
    if (setMatch) {
      const [, key, value] = setMatch;
      const leader = nodes.find(n => n.state === "leader");

      if (!leader) {
        addEntry("error", "ERR: No leader available. Cluster may be in election.");
        return;
      }

      addEntry("info", `→ Routing to ${leader.name} (LEADER)`);

      setTimeout(() => {
        addEntry("rpc", `${leader.name} log ← [SET ${key}=${value}] (uncommitted)`);
      }, 300);

      setTimeout(() => {
        const followers = nodes.filter(n => n.state === "follower");
        const names = followers.map(n => n.name).join(", ");
        addEntry("rpc", `AppendEntries RPC → ${names}`);
      }, 600);

      setTimeout(() => {
        const alive = nodes.filter(n => n.state !== "down").length;
        const majority = Math.ceil(nodes.length / 2);
        if (alive >= majority) {
          addEntry("success", `✓ COMMITTED [SET ${key}=${value}] — quorum ${alive}/${nodes.length}`);
        } else {
          addEntry("error", `✗ FAILED — quorum not reached (${alive}/${nodes.length})`);
        }
      }, 1200);

      onWrite(key, value);
      return;
    }

    // HELP
    if (/^HELP$/i.test(cmd)) {
      addEntry("info", "Commands:");
      addEntry("info", "  SET key=value  — Write a key-value pair");
      addEntry("info", "  GET key        — Read a value from committed log");
      addEntry("info", "  STATUS         — Show cluster status");
      addEntry("info", "  CLEAR          — Clear console");
      addEntry("info", "  ↑/↓            — Navigate command history");
      return;
    }

    // STATUS
    if (/^STATUS$/i.test(cmd)) {
      const leader = nodes.find(n => n.state === "leader");
      const alive = nodes.filter(n => n.state !== "down").length;
      addEntry("info", `Cluster: ${alive}/5 nodes online`);
      addEntry("info", `Leader: ${leader ? leader.name : "NONE"}`);
      addEntry("info", `Term: ${Math.max(...nodes.map(n => n.term))}`);
      return;
    }

    // CLEAR
    if (/^CLEAR$/i.test(cmd)) {
      setEntries([]);
      return;
    }

    addEntry("error", `ERR: Unknown command '${cmd}'. Type HELP.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIdx === -1) {
        setSavedInput(input);
        const idx = history.length - 1;
        setHistoryIdx(idx);
        setInput(history[idx]);
      } else if (historyIdx > 0) {
        const idx = historyIdx - 1;
        setHistoryIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      if (historyIdx < history.length - 1) {
        const idx = historyIdx + 1;
        setHistoryIdx(idx);
        setInput(history[idx]);
      } else {
        setHistoryIdx(-1);
        setInput(savedInput);
      }
    }
  };

  const typeColor = (type: ConsoleEntry["type"]) => {
    switch (type) {
      case "input": return "text-foreground";
      case "info": return "text-muted-foreground";
      case "success": return "text-primary";
      case "error": return "text-destructive";
      case "rpc": return "text-accent";
    }
  };

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">Client Console</h2>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">
          {nodes.find(n => n.state === "leader")
            ? `LEADER: ${nodes.find(n => n.state === "leader")!.name}`
            : "NO LEADER"}
        </span>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[140px] max-h-[200px] overflow-y-auto px-4 py-2 space-y-0.5 font-mono text-[10px]"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.map(entry => (
          <div key={entry.id} className={`${typeColor(entry.type)} leading-relaxed`}>
            {entry.type === "input" ? (
              <span><span className="text-primary">❯</span> {entry.text}</span>
            ) : (
              entry.text
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-muted/30">
        <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SET key=value | GET key"
          className="flex-1 bg-transparent text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
