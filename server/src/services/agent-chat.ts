import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  agents,
  chatEndpoints,
  chatIdentityLinks,
  chatExternalPrincipals,
  issueComments,
  issueTreeHolds,
  issueThreadInteractions,
  issues,
  projects,
  type Db,
} from "@geetorusai/db";
import type {
  ChatHandoffInput,
  ChatHandoffResult,
  ChatStreamEvent,
  ChatThreadSummary,
  ConversationScope,
  ParsedChatSlashCommand,
  ChatSlashCommandName,
} from "@geetorusai/shared";
import { persistActivity, publishActivity } from "./activity-log.js";
import { resumeConversationForReset } from "./agent-conversations.js";
import { issueService } from "./issues.js";
import { memoryService } from "./memory/memory-service.js";

// Global in-memory SSE event bus for live streaming conversation turns
class ChatStreamBroadcaster extends EventEmitter {
  private activeStreams = new Map<string, ChatStreamEvent[]>();

  public broadcast(issueId: string, event: ChatStreamEvent) {
    if (!this.activeStreams.has(issueId)) {
      this.activeStreams.set(issueId, []);
    }
    const history = this.activeStreams.get(issueId)!;
    history.push(event);
    if (history.length > 50) history.shift();

    this.emit(`chat:${issueId}`, event);
    if (event.type === "done" || event.type === "error") {
      setTimeout(() => this.activeStreams.delete(issueId), 30000);
    }
  }

  public getRecentEvents(issueId: string): ChatStreamEvent[] {
    return this.activeStreams.get(issueId) ?? [];
  }
}

export const chatStreamBroadcaster = new ChatStreamBroadcaster();

/** Parse slash commands (/task, /assign, /pause, /new) */
export function parseChatSlashCommand(body: string): ParsedChatSlashCommand | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith("/")) return null;
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  const command = match[1].toLowerCase();
  if (command === "task" || command === "assign" || command === "pause" || command === "new") {
    return {
      command: command as ChatSlashCommandName,
      args: (match[2] || "").trim(),
      raw: trimmed,
    };
  }
  return null;
}

/** List persistent conversation threads for a user/company */
export async function listChatThreads(
  db: Db,
  companyId: string,
  userId: string,
  filters?: {
    scope?: ConversationScope;
    agentId?: string;
    projectId?: string;
    taskId?: string;
  },
): Promise<ChatThreadSummary[]> {
  const conditions = [
    eq(issues.companyId, companyId),
    sql`${issues.conversationAgentId} IS NOT NULL`,
    eq(issues.conversationUserId, userId),
    isNull(issues.hiddenAt),
  ];

  if (filters?.scope) {
    conditions.push(eq(issues.conversationScope, filters.scope));
  }
  if (filters?.agentId) {
    conditions.push(eq(issues.conversationAgentId, filters.agentId));
  }
  if (filters?.projectId) {
    conditions.push(eq(issues.projectId, filters.projectId));
  }
  if (filters?.taskId) {
    conditions.push(eq(issues.parentId, filters.taskId));
  }

  const rows = await db
    .select({
      issue: issues,
      agent: agents,
      project: projects,
    })
    .from(issues)
    .leftJoin(agents, eq(issues.conversationAgentId, agents.id))
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(issues.updatedAt), desc(issues.createdAt))
    .limit(100);

  return rows.map(({ issue, agent, project }) => ({
    id: issue.id,
    companyId: issue.companyId,
    title: issue.title,
    scope: (issue.conversationScope as ConversationScope) || "agent",
    agentId: issue.conversationAgentId!,
    agentName: agent?.name,
    agentAvatarUrl: agent?.icon,
    userId: issue.conversationUserId!,
    projectId: issue.projectId,
    projectName: project?.name,
    taskId: issue.parentId,
    taskTitle: null,
    state: issue.conversationState || "waiting",
    sessionGeneration: issue.conversationSessionGeneration || 0,
    unreadCount: 0,
    lastMessagePreview: issue.description?.slice(0, 100) || null,
    lastActivityAt: issue.updatedAt ? issue.updatedAt.toISOString() : null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  }));
}

/** Create or retrieve a scoped conversation thread */
export async function createOrResolveChatThread(
  db: Db,
  companyId: string,
  userId: string,
  options: {
    scope?: ConversationScope;
    agentId: string;
    projectId?: string;
    taskId?: string;
    title?: string;
  },
): Promise<typeof issues.$inferSelect> {
  const scope: ConversationScope = options.scope || (options.projectId ? "project" : options.taskId ? "task" : "agent");

  // Check existing
  const conditions = [
    eq(issues.companyId, companyId),
    eq(issues.conversationAgentId, options.agentId),
    eq(issues.conversationUserId, userId),
    eq(issues.conversationScope, scope),
  ];
  if (scope === "project" && options.projectId) {
    conditions.push(eq(issues.projectId, options.projectId));
  } else if (scope === "task" && options.taskId) {
    conditions.push(eq(issues.parentId, options.taskId));
  }

  const [existing] = await db.select().from(issues).where(and(...conditions)).limit(1);
  if (existing) return existing;

  const [agent] = await db.select().from(agents).where(and(eq(agents.id, options.agentId), eq(agents.companyId, companyId)));
  const defaultTitle = options.title ||
    (scope === "project" ? `Project Chat: ${agent?.name || "Agent"}` :
     scope === "task" ? `Task Chat: ${agent?.name || "Agent"}` :
     `Chat with ${agent?.name || "Agent"}`);

  const svc = issueService(db);
  const created = await svc.create(companyId, {
    title: defaultTitle,
    assigneeAgentId: options.agentId,
    conversationAgentId: options.agentId,
    conversationUserId: userId,
    conversationScope: scope,
    projectId: options.projectId ?? null,
    parentId: options.taskId ?? null,
    conversationState: "waiting",
    status: "in_review",
    createdByUserId: userId,
  });

  return created;
}

/** Handoff conversation message or plan into a concrete execution task */
export async function handoffChatToTask(
  db: Db,
  companyId: string,
  issueId: string,
  userId: string,
  input: ChatHandoffInput,
): Promise<ChatHandoffResult> {
  const [conversation] = await db
    .select()
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)));

  if (!conversation || !conversation.conversationAgentId) {
    throw new Error("Conversation not found");
  }

  const svc = issueService(db);
  const taskTitle = input.title.trim();
  const assigneeAgentId = input.assigneeAgentId || conversation.conversationAgentId;
  const projectId = input.projectId || conversation.projectId;

  const newTask = await svc.create(companyId, {
    title: taskTitle,
    assigneeAgentId,
    projectId: projectId ?? undefined,
    parentId: undefined, // Ordinary assigned task, not subtask
    status: "todo",
    priority: input.priority || "medium",
    initialPlan: input.initialPlan,
    originKind: "agent_chat_handoff",
    originId: input.commentId ?? conversation.id,
    createdByUserId: userId,
  });

  // Link back in conversation thread as a comment
  const linkCommentBody = `Turned into task [${newTask.identifier || newTask.title}](/issues/${newTask.id})`;
  await svc.addComment(conversation.id, linkCommentBody, { userId }, {
    authorType: "system",
    clientRequestId: `handoff-link:${newTask.id}`,
  });

  const { publication } = await persistActivity(db, {
    companyId,
    actorType: "user",
    actorId: userId,
    action: "issue.chat_handoff_task_created",
    entityType: "issue",
    entityId: newTask.id,
    details: {
      sourceConversationId: conversation.id,
      sourceCommentId: input.commentId,
      taskId: newTask.id,
      taskIdentifier: newTask.identifier,
    },
  });
  publishActivity(publication);

  return {
    taskId: newTask.id,
    taskIdentifier: newTask.identifier,
    taskTitle: newTask.title,
    sourceIssueId: conversation.id,
    sourceCommentId: input.commentId,
  };
}

/** Execute a slash command from chat */
export async function executeChatSlashCommand(
  db: Db,
  companyId: string,
  issueId: string,
  userId: string,
  command: ParsedChatSlashCommand,
  options?: {
    wakeup?: (agentId: string, payload: any) => Promise<unknown>;
  },
): Promise<{ success: boolean; message: string; data?: any }> {
  const [conversation] = await db
    .select()
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)));

  if (!conversation) throw new Error("Conversation not found");

  if (command.command === "task") {
    const taskTitle = command.args || "New Task from Chat";
    const handoff = await handoffChatToTask(db, companyId, issueId, userId, {
      title: taskTitle,
      assigneeAgentId: conversation.conversationAgentId ?? undefined,
      projectId: conversation.projectId ?? undefined,
    });
    return {
      success: true,
      message: `Created task ${handoff.taskIdentifier || handoff.taskTitle}`,
      data: handoff,
    };
  }

  if (command.command === "pause") {
    const holdId = randomUUID();
    await db.insert(issueTreeHolds).values({
      id: holdId,
      companyId,
      rootIssueId: issueId,
      mode: "pause",
      status: "active",
      reason: "Paused via chat slash command /pause",
      createdByActorType: "user",
      createdByUserId: userId,
    });
    const { publication } = await persistActivity(db, {
      companyId,
      actorType: "user",
      actorId: userId,
      action: "issue.tree_hold_created",
      entityType: "issue",
      entityId: issueId,
      details: { holdId, mode: "pause" },
    });
    publishActivity(publication);
    return { success: true, message: "Conversation paused." };
  }

  if (command.command === "assign") {
    const agentRef = command.args.trim();
    if (!agentRef) return { success: false, message: "Usage: /assign <agent-name>" };
    const [targetAgent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.companyId, companyId), sql`lower(${agents.name}) = lower(${agentRef})`))
      .limit(1);

    if (!targetAgent) {
      return { success: false, message: `Agent '${agentRef}' not found.` };
    }

    await db
      .update(issues)
      .set({
        conversationAgentId: targetAgent.id,
        assigneeAgentId: targetAgent.id,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId));

    const { publication } = await persistActivity(db, {
      companyId,
      actorType: "user",
      actorId: userId,
      action: "issue.updated",
      entityType: "issue",
      entityId: issueId,
      details: { reassignedToAgentId: targetAgent.id },
    });
    publishActivity(publication);
    return { success: true, message: `Reassigned chat to ${targetAgent.name}.` };
  }

  if (command.command === "new") {
    // /new is handled by conversationSessionGeneration reset
    return { success: true, message: "Starting new conversation session." };
  }

  return { success: false, message: `Unknown command /${command.command}` };
}

/** Rate limiting per external connector principal (sliding window) */
const connectorRateLimits = new Map<string, number[]>();

export function checkConnectorRateLimit(
  endpointId: string,
  externalPrincipalId: string,
  limitPerMinute = 20,
): boolean {
  const key = `${endpointId}:${externalPrincipalId}`;
  const now = Date.now();
  const windowStart = now - 60000;

  const timestamps = (connectorRateLimits.get(key) || []).filter((ts) => ts > windowStart);
  if (timestamps.length >= limitPerMinute) {
    return false; // Rate limit exceeded
  }
  timestamps.push(now);
  connectorRateLimits.set(key, timestamps);
  return true;
}

/** Message deduplication cache */
const connectorMessageDedup = new Map<string, number>();

export function deduplicateConnectorMessage(
  endpointId: string,
  externalMessageId: string,
  ttlMs = 600000,
): boolean {
  const key = `${endpointId}:${externalMessageId}`;
  const now = Date.now();
  if (connectorMessageDedup.has(key)) {
    const expiry = connectorMessageDedup.get(key)!;
    if (now < expiry) return true; // Duplicate!
  }
  connectorMessageDedup.set(key, now + ttlMs);
  return false;
}

/** Map external principal to Geetorus user or guest mode */
export async function mapConnectorPrincipal(
  db: Db,
  companyId: string,
  endpointId: string,
  externalPrincipalId: string,
) {
  const [link] = await db
    .select({
      link: chatIdentityLinks,
      principal: chatExternalPrincipals,
      endpoint: chatEndpoints,
    })
    .from(chatExternalPrincipals)
    .innerJoin(chatEndpoints, eq(chatEndpoints.id, endpointId))
    .leftJoin(
      chatIdentityLinks,
      and(
        eq(chatIdentityLinks.principalId, chatExternalPrincipals.id),
        eq(chatIdentityLinks.endpointId, endpointId),
        eq(chatIdentityLinks.status, "linked"),
      ),
    )
    .where(
      and(
        eq(chatExternalPrincipals.companyId, companyId),
        eq(chatExternalPrincipals.externalId, externalPrincipalId),
      ),
    )
    .limit(1);

  if (link?.link?.geetorusUserId) {
    return {
      geetorusUserId: link.link.geetorusUserId,
      isGuest: false,
      permissions: {
        canCreateTasks: true,
        canTriggerTools: true,
        restrictedGateway: false,
      },
    };
  }

  // Not linked - verify if unlinked guest access is allowed
  const allowGuest = link?.endpoint?.allowUnlinkedPeople ?? true;
  return {
    geetorusUserId: null,
    isGuest: true,
    allowed: allowGuest,
    permissions: {
      canCreateTasks: allowGuest,
      canTriggerTools: false,
      restrictedGateway: true,
    },
  };
}

/** Ensure safety: create an inline approval request card for human confirmation */
export async function ensureChatApprovalCard(
  db: Db,
  companyId: string,
  issueId: string,
  agentId: string,
  payload: {
    title: string;
    action: string;
    requiredPermission?: string;
    estimatedCostCents?: number;
    details?: Record<string, unknown>;
  },
) {
  const [interaction] = await db
    .insert(issueThreadInteractions)
    .values({
      companyId,
      issueId,
      kind: "request_confirmation",
      status: "pending",
      createdByAgentId: agentId,
      prompt: `Approval required for ${payload.title}: ${payload.action}`,
      payload: {
        title: payload.title,
        action: payload.action,
        requiredPermission: payload.requiredPermission,
        estimatedCostCents: payload.estimatedCostCents,
        ...payload.details,
      },
    })
    .returning();

  // Notify live stream
  chatStreamBroadcaster.broadcast(issueId, {
    type: "interaction",
    interactionId: interaction.id,
    kind: "request_confirmation",
    title: payload.title,
    prompt: interaction.prompt ?? undefined,
  });

  return interaction;
}
