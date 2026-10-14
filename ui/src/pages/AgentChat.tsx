import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentChatsApi } from "@/api/agentChats";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { authApi } from "@/api/auth";
import { useCompany } from "@/context/CompanyContext";
import { useAgentChatEnabled } from "@/hooks/useAgentChatEnabled";
import { recordAgentChatVisit } from "@/lib/recent-agent-chats";
import { queryKeys } from "@/lib/queryKeys";
import { useNavigate, useParams } from "@/lib/router";
import { agentRouteRef } from "@/lib/utils";
import { TaskDetailSurface } from "./IssueDetail";
import { AgentChatThreadSidebar } from "@/components/chat/AgentChatThreadSidebar";
import { ChatStreamingHeader } from "@/components/chat/ChatStreamingHeader";
import { ChatHandoffDialog } from "@/components/chat/ChatHandoffDialog";
import { NewChatThreadDialog } from "@/components/chat/NewChatThreadDialog";
import type { ChatStreamEvent, ChatThreadSummary, Issue } from "@geetorusai/shared";

export function AgentChat() {
  const { agentRef = "" } = useParams<{ agentRef: string }>();
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const { enabled, loaded } = useAgentChatEnabled();
  const client = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [streamingConnected, setStreamingConnected] = useState(false);
  const [activeStreamEvent, setActiveStreamEvent] = useState<ChatStreamEvent | null>(null);

  const agents = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const projects = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const session = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const userId = session.data?.user?.id ?? session.data?.session?.userId ?? null;

  const agent = agents.data?.find(
    (item) => item.id === agentRef || agentRouteRef(item) === agentRef,
  );

  const threadsQuery = useQuery({
    queryKey: queryKeys.agentChats.list(selectedCompanyId, userId),
    queryFn: () => agentChatsApi.list(selectedCompanyId!),
    enabled: enabled && !!selectedCompanyId && !!userId,
  });

  const chatKey = queryKeys.agentChats.detail(selectedCompanyId, userId, agent?.id);
  const chat = useQuery({
    queryKey: chatKey,
    queryFn: () => agentChatsApi.get(selectedCompanyId!, agent!.id),
    enabled: enabled && !!agent && session.isFetched,
  });

  const currentIssue: Issue | null = chat.data ?? null;

  // Real-time SSE streaming connection
  useEffect(() => {
    if (!currentIssue?.id || !selectedCompanyId) {
      setStreamingConnected(false);
      setActiveStreamEvent(null);
      return;
    }

    const streamUrl = agentChatsApi.getStreamUrl(selectedCompanyId, currentIssue.id);
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setStreamingConnected(true);
      };

      eventSource.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data) as ChatStreamEvent;
          setActiveStreamEvent(parsed);
          if (parsed.type === "done") {
            // Invalidate queries so new message appears
            client.invalidateQueries({ queryKey: queryKeys.issues.comments(currentIssue.id) });
            client.invalidateQueries({ queryKey: chatKey });
            setTimeout(() => setActiveStreamEvent(null), 3000);
          }
        } catch {
          // Ignore parse errors on raw comments
        }
      };

      eventSource.onerror = () => {
        setStreamingConnected(false);
      };
    } catch {
      setStreamingConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentIssue?.id, selectedCompanyId, client, chatKey]);

  const creating = useRef<Promise<Issue> | null>(null);
  useEffect(() => {
    creating.current = null;
  }, [selectedCompanyId, userId, agent?.id]);

  useEffect(() => {
    if (enabled && agent && session.isFetched) {
      recordAgentChatVisit(agent.companyId, userId, agent.id);
    }
  }, [enabled, agent?.id, agent?.companyId, userId, session.isFetched]);

  const ensureIssue = useCallback(async () => {
    if (!agent || !selectedCompanyId) throw new Error("Agent not found");
    if (chat.data) return chat.data;
    const promise = (creating.current ??= agentChatsApi.ensure(
      selectedCompanyId,
      agent.id,
    ));
    try {
      const issue = await promise;
      client.setQueryData(queryKeys.issues.detail(issue.id), issue);
      client.setQueryData(chatKey, issue);
      client.invalidateQueries({ queryKey: queryKeys.agentChats.list(selectedCompanyId, userId) });
      return issue;
    } catch (error) {
      creating.current = null;
      throw error;
    }
  }, [agent, selectedCompanyId, chat.data, client, userId, chatKey]);

  const handleSelectThread = (thread: ChatThreadSummary) => {
    const targetAgent = agents.data?.find((a) => a.id === thread.agentId);
    if (targetAgent) {
      navigate(`/chats/${agentRouteRef(targetAgent)}`);
    }
    setSidebarOpen(false);
  };

  const handleCreateThread = async (data: {
    agentId: string;
    scope: any;
    projectId?: string;
    title?: string;
  }) => {
    if (!selectedCompanyId) return;
    const thread = await agentChatsApi.createOrResolve(selectedCompanyId, data);
    client.invalidateQueries({ queryKey: queryKeys.agentChats.list(selectedCompanyId, userId) });
    const targetAgent = agents.data?.find((a) => a.id === data.agentId);
    if (targetAgent) {
      navigate(`/chats/${agentRouteRef(targetAgent)}`);
    }
  };

  const handleHandoff = async (data: {
    title: string;
    assigneeAgentId?: string;
    projectId?: string;
    priority: "low" | "medium" | "high" | "urgent";
    initialPlan?: string;
  }) => {
    if (!selectedCompanyId || !currentIssue) return;
    await agentChatsApi.handoff(selectedCompanyId, currentIssue.id, data);
    client.invalidateQueries({ queryKey: queryKeys.issues.comments(currentIssue.id) });
    client.invalidateQueries({ queryKey: queryKeys.agentChats.list(selectedCompanyId, userId) });
  };

  const handleInsertSlash = (cmd: string) => {
    const composerTextarea = document.querySelector<HTMLTextAreaElement>(
      "textarea[data-composer='true'], textarea[name='body'], .chat-composer-textarea",
    );
    if (composerTextarea) {
      composerTextarea.value = cmd;
      composerTextarea.focus();
      composerTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  if (!loaded || agents.isPending || session.isPending) {
    return <p className="text-sm text-muted-foreground p-6">Loading conversation…</p>;
  }

  if (!enabled && !chat.data) {
    return (
      <p className="text-sm text-muted-foreground p-6">
        Agent Chat is disabled. Enable it in Experimental settings. Existing history remains available through task links.
      </p>
    );
  }

  if (agents.error || chat.error) {
    return <p className="text-sm text-destructive p-6">{(agents.error ?? chat.error)?.message}</p>;
  }

  if (!agent) {
    return <p className="text-sm text-destructive p-6">Agent not found.</p>;
  }

  if (chat.isPending) {
    return <p className="text-sm text-muted-foreground p-6">Loading conversation…</p>;
  }

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Thread list sidebar (hidden on small screens unless toggled) */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-lg" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AgentChatThreadSidebar
          threads={threadsQuery.data ?? []}
          activeThreadId={currentIssue?.id}
          onSelectThread={handleSelectThread}
          onNewThread={() => setNewThreadOpen(true)}
          loading={threadsQuery.isLoading}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <ChatStreamingHeader
          connected={streamingConnected}
          activeEvent={activeStreamEvent}
          onTurnIntoTask={() => setHandoffOpen(true)}
          onInsertSlashCommand={handleInsertSlash}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          isMobile={true}
        />

        <div className="flex-1 overflow-hidden">
          <TaskDetailSurface
            key={`${agent.id}:${userId}`}
            conversation={{ agent, issue: currentIssue, ensureIssue }}
          />
        </div>
      </div>

      {/* Modals */}
      <NewChatThreadDialog
        open={newThreadOpen}
        onOpenChange={setNewThreadOpen}
        agents={agents.data ?? []}
        projects={projects.data ?? []}
        onSubmit={handleCreateThread}
      />

      <ChatHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        defaultTitle={`Task: Chat with ${agent.name}`}
        agents={agents.data ?? []}
        projects={projects.data ?? []}
        defaultAgentId={agent.id}
        defaultProjectId={currentIssue?.projectId ?? undefined}
        onSubmit={handleHandoff}
      />
    </div>
  );
}
