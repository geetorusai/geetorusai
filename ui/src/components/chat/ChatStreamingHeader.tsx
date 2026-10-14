import { Wifi, WifiOff, Loader2, Wrench, ShieldAlert, CheckSquare, Sparkles } from "lucide-react";
import type { ChatStreamEvent } from "@geetorusai/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatStreamingHeaderProps {
  connected: boolean;
  activeEvent?: ChatStreamEvent | null;
  onTurnIntoTask: () => void;
  onInsertSlashCommand: (cmd: string) => void;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

export function ChatStreamingHeader({
  connected,
  activeEvent,
  onTurnIntoTask,
  onInsertSlashCommand,
  onToggleSidebar,
  isMobile,
}: ChatStreamingHeaderProps) {
  const renderStatus = () => {
    if (!activeEvent) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>Live session</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span>Offline</span>
            </>
          )}
        </span>
      );
    }

    if (activeEvent.type === "status") {
      return (
        <Badge variant="secondary" className="text-xs gap-1.5 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>{activeEvent.message}</span>
        </Badge>
      );
    }

    if (activeEvent.type === "tool_call") {
      return (
        <Badge variant="outline" className="text-xs gap-1.5 border-primary/40 bg-primary/5">
          <Wrench className="h-3 w-3 text-primary" />
          <span>Running tool: {activeEvent.toolName}</span>
        </Badge>
      );
    }

    if (activeEvent.type === "interaction") {
      return (
        <Badge variant="destructive" className="text-xs gap-1.5">
          <ShieldAlert className="h-3 w-3" />
          <span>Approval required</span>
        </Badge>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Agent streaming</span>
      </span>
    );
  };

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2">
        {isMobile && onToggleSidebar && (
          <Button size="sm" variant="outline" onClick={onToggleSidebar} className="h-7 text-xs">
            Threads
          </Button>
        )}
        {renderStatus()}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => onInsertSlashCommand("/task ")}
            className="px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors font-mono"
            title="Create task from chat"
          >
            /task
          </button>
          <button
            type="button"
            onClick={() => onInsertSlashCommand("/assign ")}
            className="px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors font-mono"
            title="Reassign conversation"
          >
            /assign
          </button>
          <button
            type="button"
            onClick={() => onInsertSlashCommand("/pause")}
            className="px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors font-mono"
            title="Pause conversation"
          >
            /pause
          </button>
          <button
            type="button"
            onClick={() => onInsertSlashCommand("/new")}
            className="px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors font-mono"
            title="Start fresh session"
          >
            /new
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onTurnIntoTask}
          className="h-7 text-xs gap-1.5 font-medium border-primary/30 hover:border-primary"
        >
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
          <span>Turn into a task</span>
        </Button>
      </div>
    </div>
  );
}
