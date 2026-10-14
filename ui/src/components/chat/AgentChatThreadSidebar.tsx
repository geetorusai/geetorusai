import { useState } from "react";
import { MessageSquare, Folder, CheckSquare, Plus, Bot, ChevronRight } from "lucide-react";
import type { ChatThreadSummary, ConversationScope } from "@geetorusai/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AgentChatThreadSidebarProps {
  threads: ChatThreadSummary[];
  activeThreadId?: string | null;
  onSelectThread: (thread: ChatThreadSummary) => void;
  onNewThread: () => void;
  loading?: boolean;
}

export function AgentChatThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  loading = false,
}: AgentChatThreadSidebarProps) {
  const [activeTab, setActiveTab] = useState<ConversationScope | "all">("all");

  const filteredThreads = threads.filter((t) => {
    if (activeTab === "all") return true;
    return t.scope === activeTab;
  });

  const getScopeIcon = (scope: ConversationScope) => {
    switch (scope) {
      case "project":
        return <Folder className="h-3.5 w-3.5 text-blue-500" />;
      case "task":
        return <CheckSquare className="h-3.5 w-3.5 text-green-500" />;
      case "agent":
      default:
        return <Bot className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <aside className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Conversations</span>
          <Badge variant="outline" className="text-xs">
            {threads.length}
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={onNewThread} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          <span>New</span>
        </Button>
      </div>

      <div className="p-2 border-b border-border flex items-center gap-1 bg-muted/30">
        <Button
          size="sm"
          variant={activeTab === "all" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("all")}
          className="h-6 text-xs px-2"
        >
          All
        </Button>
        <Button
          size="sm"
          variant={activeTab === "agent" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("agent")}
          className="h-6 text-xs px-2 gap-1"
        >
          <Bot className="h-3 w-3" />
          Agents
        </Button>
        <Button
          size="sm"
          variant={activeTab === "project" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("project")}
          className="h-6 text-xs px-2 gap-1"
        >
          <Folder className="h-3 w-3" />
          Projects
        </Button>
        <Button
          size="sm"
          variant={activeTab === "task" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("task")}
          className="h-6 text-xs px-2 gap-1"
        >
          <CheckSquare className="h-3 w-3" />
          Tasks
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <p className="text-xs text-muted-foreground p-3 text-center">Loading threads…</p>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center p-6 text-xs text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No conversations found.</p>
            <Button
              size="sm"
              variant="link"
              onClick={onNewThread}
              className="text-xs mt-1"
            >
              Start a new chat
            </Button>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`w-full text-left p-2.5 rounded-md transition-colors flex items-start gap-2.5 text-xs ${
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="mt-0.5 shrink-0">{getScopeIcon(thread.scope)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-medium">{thread.title}</span>
                    {thread.state === "active" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5 text-xs">
                    <span className="truncate">{thread.agentName || "Agent"}</span>
                    {thread.projectName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{thread.projectName}</span>
                      </>
                    )}
                  </div>
                  {thread.lastMessagePreview && (
                    <p className="truncate text-muted-foreground text-xs opacity-80 mt-1">
                      {thread.lastMessagePreview}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-50" />
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
