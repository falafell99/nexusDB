import { Play, Pause, Clock, SkipBack } from "lucide-react";
import type { ClusterSnapshot } from "@/hooks/useRaftSimulation";

interface Props {
  snapshots: ClusterSnapshot[];
  viewingSnapshot: number | null;
  onViewSnapshot: (index: number | null) => void;
  paused: boolean;
  onTogglePause: () => void;
}

export default function TimeTravel({ snapshots, viewingSnapshot, onViewSnapshot, paused, onTogglePause }: Props) {
  const isReplaying = viewingSnapshot !== null;
  const currentIdx = viewingSnapshot ?? snapshots.length - 1;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="panel px-4 py-2">
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={onTogglePause}
          className={`flex items-center gap-1.5 px-2 py-1 border text-[10px] font-mono transition-colors ${
            paused
              ? "border-accent/40 text-accent hover:bg-accent/5"
              : "border-primary/40 text-primary hover:bg-primary/5"
          }`}
        >
          {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {paused ? "RESUME" : "PAUSE"}
        </button>

        {/* Reset */}
        {isReplaying && (
          <button
            onClick={() => onViewSnapshot(null)}
            className="flex items-center gap-1 px-2 py-1 border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-3 h-3" />
            LIVE
          </button>
        )}

        {/* Clock icon */}
        <Clock className="w-3 h-3 text-muted-foreground" />

        {/* Slider */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, snapshots.length - 1)}
            value={currentIdx}
            onChange={e => {
              const idx = Number(e.target.value);
              onViewSnapshot(idx);
            }}
            className="flex-1 h-1 accent-primary bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
            disabled={snapshots.length === 0}
          />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground flex-shrink-0">
          {isReplaying ? (
            <span className="text-accent">
              REPLAY {snapshots[currentIdx] ? formatTime(snapshots[currentIdx].timestamp) : "—"}
            </span>
          ) : (
            <span>
              {snapshots.length > 0 ? formatTime(snapshots[snapshots.length - 1]?.timestamp || Date.now()) : "—"}
            </span>
          )}
          <span className={`px-1.5 py-0.5 border ${
            isReplaying ? "border-accent/40 text-accent" : "border-primary/40 text-primary"
          }`}>
            {isReplaying ? "REPLAY" : "LIVE"}
          </span>
        </div>
      </div>
    </div>
  );
}
