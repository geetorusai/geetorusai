export type ConversationScope = "agent" | "project" | "task";

export interface ChatThreadSummary {
  id: string;
  companyId: string;
  title: string;
  scope: ConversationScope;
  agentId: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  userId: string;
  projectId?: string | null;
  projectName?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  state: "active" | "waiting";
  sessionGeneration: number;
  unreadCount?: number;
  lastMessagePreview?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHandoffInput {
  commentId?: string;
  title: string;
  assigneeAgentId?: string;
  projectId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  initialPlan?: string;
}

export interface ChatHandoffResult {
  taskId: string;
  taskIdentifier?: string | null;
  taskTitle: string;
  sourceIssueId: string;
  sourceCommentId?: string | null;
}

export type ChatSlashCommandName = "task" | "assign" | "pause" | "new";

export interface ParsedChatSlashCommand {
  command: ChatSlashCommandName;
  args: string;
  raw: string;
}

export interface ChatStreamStatusEvent {
  type: "status";
  status: "thinking" | "running_tool" | "waiting_approval" | "finalizing";
  message: string;
  runId?: string;
}

export interface ChatStreamToolCallEvent {
  type: "tool_call";
  toolName: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "executing" | "completed" | "needs_approval";
  runId?: string;
}

export interface ChatStreamChunkEvent {
  type: "chunk";
  text: string;
  runId?: string;
}

export interface ChatStreamInteractionEvent {
  type: "interaction";
  interactionId: string;
  kind: "request_confirmation" | "ask_user_questions";
  title?: string;
  prompt?: string;
  runId?: string;
}

export interface ChatStreamDoneEvent {
  type: "done";
  issueId: string;
  commentId?: string;
  runId?: string;
}

export interface ChatStreamErrorEvent {
  type: "error";
  message: string;
  code?: string;
  runId?: string;
}

export type ChatStreamEvent =
  | { type: "start"; issueId: string; runId?: string }
  | ChatStreamStatusEvent
  | ChatStreamToolCallEvent
  | ChatStreamChunkEvent
  | ChatStreamInteractionEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;

export interface ChatConnectorUserMapping {
  principalId: string;
  provider: "slack" | "discord" | "telegram" | "agentmail";
  externalHandle: string;
  geetorusUserId?: string | null;
  isGuest: boolean;
  permissions: {
    canCreateTasks: boolean;
    canTriggerTools: boolean;
    restrictedGateway: boolean;
  };
}
