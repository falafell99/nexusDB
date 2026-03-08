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
    { id: "init-1", type: "info", text: "Type SET key=value to write, or HELP for commands.", timestamp: Date.now() },
  ]);
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

    addEntry("input", cmd);

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

      // Simulate the visual flow with timed entries
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

      // Trigger actual write
      onWrite(key, value);
      return;
    }

    // HELP
    if (/^HELP$/i.test(cmd)) {
      addEntry("info", "Commands:");
      addEntry("info", "  SET key=value  — Write a key-value pair");
      addEntry("info", "  STATUS         — Show cluster status");
      addEntry("info", "  CLEAR          — Clear console");
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
          placeholder="SET key=value"
          className="flex-1 bg-transparent text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
