import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  parseChatSlashCommand,
  checkConnectorRateLimit,
  deduplicateConnectorMessage,
  chatStreamBroadcaster,
  executeChatSlashCommand,
  handoffChatToTask,
  listChatThreads,
  createOrResolveChatThread,
  ensureChatApprovalCard,
} from "../services/agent-chat.js";
import {
  createDb,
  companies,
  agents,
  authUsers,
  issues,
  issueComments,
  issueTreeHolds,
  issueThreadInteractions,
  projects,
} from "@geetorusai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";

describe("Agent Chat Stable - Slash Commands & Connectors Unit Tests", () => {
  it("correctly parses supported slash commands", () => {
    expect(parseChatSlashCommand("/task Write unit tests")).toEqual({
      command: "task",
      args: "Write unit tests",
      raw: "/task Write unit tests",
    });

    expect(parseChatSlashCommand("/assign Coder")).toEqual({
      command: "assign",
      args: "Coder",
      raw: "/assign Coder",
    });

    expect(parseChatSlashCommand("/pause")).toEqual({
      command: "pause",
      args: "",
      raw: "/pause",
    });

    expect(parseChatSlashCommand("/new")).toEqual({
      command: "new",
      args: "",
      raw: "/new",
    });

    // Unrecognized or plain messages return null
    expect(parseChatSlashCommand("Hello agent")).toBeNull();
    expect(parseChatSlashCommand("/unknown something")).toBeNull();
  });

  it("enforces sliding-window connector rate limiting", () => {
    const endpointId = randomUUID();
    const principalId = "slack-user-123";

    // Allow up to limit (e.g. 5)
    for (let i = 0; i < 5; i++) {
      expect(checkConnectorRateLimit(endpointId, principalId, 5)).toBe(true);
    }
    // Next request exceeds limit
    expect(checkConnectorRateLimit(endpointId, principalId, 5)).toBe(false);

    // Different principal is not blocked
    expect(checkConnectorRateLimit(endpointId, "slack-user-456", 5)).toBe(true);
  });

  it("deduplicates external connector messages by ID within TTL window", () => {
    const endpointId = randomUUID();
    const messageId = "msg-unique-789";

    // First receive: not a duplicate
    expect(deduplicateConnectorMessage(endpointId, messageId)).toBe(false);
    // Second receive of same message: duplicate!
    expect(deduplicateConnectorMessage(endpointId, messageId)).toBe(true);
    // Different message: not a duplicate
    expect(deduplicateConnectorMessage(endpointId, "msg-unique-999")).toBe(false);
  });

  it("broadcasts SSE events to chat stream subscribers and retains recent history", () => {
    const testIssueId = randomUUID();
    const receivedEvents: any[] = [];

    const listener = (event: any) => {
      receivedEvents.push(event);
    };

    chatStreamBroadcaster.on(`chat:${testIssueId}`, listener);

    chatStreamBroadcaster.broadcast(testIssueId, {
      type: "status",
      status: "running_tool",
      message: "Executing code search...",
    });

    chatStreamBroadcaster.broadcast(testIssueId, {
      type: "chunk",
      text: "Found 3 matching files.",
    });

    expect(receivedEvents).toHaveLength(2);
    expect(receivedEvents[0].type).toBe("status");
    expect(receivedEvents[1].type).toBe("chunk");

    // History is queryable for reconnecting clients
    const recent = chatStreamBroadcaster.getRecentEvents(testIssueId);
    expect(recent).toHaveLength(2);

    chatStreamBroadcaster.off(`chat:${testIssueId}`, listener);
  });
});

const support = await getEmbeddedPostgresTestSupport();
(support.supported ? describe : describe.skip)(
  "Agent Chat Stable - Database Integration",
  () => {
    let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
    let db: ReturnType<typeof createDb>;
    let companyId: string;
    let agentId: string;
    let userId: string;

    beforeAll(async () => {
      database = await startEmbeddedPostgresTestDatabase("geetorus-chat-stable-");
      db = createDb(database.connectionString);
      companyId = randomUUID();
      agentId = randomUUID();
      userId = "test-user-1";

      await db.insert(companies).values({
        id: companyId,
        name: "Acme Corp",
      });

      await db.insert(agents).values({
        id: agentId,
        companyId,
        name: "Lead Dev",
        role: "Engineer",
      });

      await db.insert(authUsers).values({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    });

    it("creates and lists multi-scope conversation threads (agent, project, task)", async () => {
      const projectId = randomUUID();
      await db.insert(projects).values({
        id: projectId,
        companyId,
        name: "Core Infrastructure",
      });

      // 1. Create Agent 1:1 chat
      const agentThread = await createOrResolveChatThread(db, companyId, userId, {
        agentId,
        scope: "agent",
      });
      expect(agentThread.conversationAgentId).toBe(agentId);
      expect(agentThread.conversationScope).toBe("agent");

      // 2. Create Project-scoped chat
      const projectThread = await createOrResolveChatThread(db, companyId, userId, {
        agentId,
        scope: "project",
        projectId,
        title: "Project Architecture Discussion",
      });
      expect(projectThread.conversationScope).toBe("project");
      expect(projectThread.projectId).toBe(projectId);

      // 3. List threads
      const threads = await listChatThreads(db, companyId, userId);
      expect(threads.length).toBeGreaterThanOrEqual(2);

      const foundProjectThread = threads.find((t) => t.id === projectThread.id);
      expect(foundProjectThread?.scope).toBe("project");
      expect(foundProjectThread?.projectName).toBe("Core Infrastructure");
    });

    it("executes /task slash command to hand off work into an assigned task with reciprocal links", async () => {
      const chat = await createOrResolveChatThread(db, companyId, userId, {
        agentId,
        scope: "agent",
      });

      const parsed = parseChatSlashCommand("/task Deploy backend service")!;
      const result = await executeChatSlashCommand(db, companyId, chat.id, userId, parsed);

      expect(result.success).toBe(true);
      expect(result.data.taskId).toBeDefined();

      // Verify the task exists and is assigned
      const [createdTask] = await db.select().from(issues).where(eq(issues.id, result.data.taskId));
      expect(createdTask.title).toBe("Deploy backend service");
      expect(createdTask.assigneeAgentId).toBe(agentId);
      expect(createdTask.originKind).toBe("agent_chat_handoff");
      expect(createdTask.originId).toBe(chat.id);

      // Verify reciprocal link comment was posted in chat
      const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, chat.id));
      expect(comments.some((c) => c.body.includes(createdTask.id))).toBe(true);
    });

    it("executes /pause slash command and records an active tree hold", async () => {
      const chat = await createOrResolveChatThread(db, companyId, userId, {
        agentId,
        scope: "agent",
      });

      const parsed = parseChatSlashCommand("/pause")!;
      const result = await executeChatSlashCommand(db, companyId, chat.id, userId, parsed);

      expect(result.success).toBe(true);

      const [hold] = await db.select().from(issueTreeHolds).where(eq(issueTreeHolds.rootIssueId, chat.id));
      expect(hold).toBeDefined();
      expect(hold.mode).toBe("pause");
      expect(hold.status).toBe("active");
    });

    it("creates an interactive approval confirmation card for safety & permission parity", async () => {
      const chat = await createOrResolveChatThread(db, companyId, userId, {
        agentId,
        scope: "agent",
      });

      const interaction = await ensureChatApprovalCard(db, companyId, chat.id, agentId, {
        title: "Database Migration",
        action: "Run production schema migration",
        requiredPermission: "admin:db:migrate",
        estimatedCostCents: 50,
      });

      expect(interaction.kind).toBe("request_confirmation");
      expect(interaction.status).toBe("pending");
      expect((interaction.payload as any).title).toBe("Database Migration");

      const [stored] = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interaction.id));
      expect(stored).toBeDefined();
      expect(stored.kind).toBe("request_confirmation");
      expect(stored.status).toBe("pending");
    });

    afterAll(async () => {
      await database?.cleanup();
    });
  },
);
