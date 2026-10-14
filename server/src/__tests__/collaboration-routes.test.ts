import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { collaborationRoutes } from "../routes/collaboration.js";
import { multiAgentOrchestrator, collaborationSettings } from "../services/collaboration/index.js";

vi.mock("../routes/authz.js", () => ({
  assertCompanyAccess: vi.fn(),
  getActorInfo: vi.fn().mockReturnValue({
    actorType: "user",
    actorId: "user-123",
    agentId: null,
  }),
}));

vi.mock("../services/index.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe("Collaboration Routes API", () => {
  let app: express.Express;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((condition) => {
            // Mock agents or issue query
            return Promise.resolve([
              {
                id: "issue-abc",
                title: "Build Collaborative Multi-Agent Engine",
                description: "Implement task analysis, orchestrator, shared context, and test suite.",
                priority: "high",
                status: "todo",
                companyId: "comp-123",
                name: "Agent One",
                role: "cto",
                capabilities: "architecture, review",
                adapterType: "process",
                adapterConfig: { model: "claude-3-7-sonnet" },
              },
            ]);
          }),
        }),
      }),
    };

    app = express();
    app.use(express.json());
    app.use("/api", collaborationRoutes(mockDb));
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/analyze returns analysis", async () => {
    const res = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/analyze")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.complexity).toBeDefined();
    expect(res.body.recommendedStrategy).toBeDefined();
    expect(res.body.plannedSubtasks).toBeInstanceOf(Array);
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/plan creates a new workflow", async () => {
    const res = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/plan")
      .send({ concurrencyLimit: 3 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.concurrencyLimit).toBe(3);
    expect(res.body.subtasks.length).toBeGreaterThan(0);
  });

  it("GET /api/companies/:companyId/issues/:id/collaboration returns active workflow", async () => {
    const res = await request(app)
      .get("/api/companies/comp-123/issues/issue-abc/collaboration");

    expect(res.status).toBe(200);
    expect(res.body.subtasks).toBeDefined();
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/start transitions independent subtasks", async () => {
    const res = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/start");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/pause pauses workflow", async () => {
    const res = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/pause");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paused");
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/resume resumes workflow", async () => {
    const res = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/resume");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
  });

  it("GET and PUT /api/companies/:companyId/collaboration/settings reads and updates configuration", async () => {
    const getRes = await request(app)
      .get("/api/companies/comp-123/collaboration/settings");

    expect(getRes.status).toBe(200);
    expect(getRes.body.maxParallelAgents).toBeDefined();

    const putRes = await request(app)
      .put("/api/companies/comp-123/collaboration/settings")
      .send({ maxParallelAgents: 5, taskBudgetUsd: 20.0 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.maxParallelAgents).toBe(5);
    expect(putRes.body.taskBudgetUsd).toBe(20.0);
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/subtasks/:subtaskId/stream-tokens records token increments", async () => {
    // First ensure plan exists
    const planRes = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/plan")
      .send();
    const subtaskId = planRes.body.subtasks[0].id;

    const res = await request(app)
      .post(`/api/companies/comp-123/issues/issue-abc/collaboration/subtasks/${subtaskId}/stream-tokens`)
      .send({ inputTokens: 120, outputTokens: 80 });

    expect(res.status).toBe(200);
    expect(res.body.totalWorkflowTokens).toBeGreaterThanOrEqual(200);
    expect(res.body.subtaskTokens.totalTokens).toBeGreaterThanOrEqual(200);
  });

  it("POST /api/companies/:companyId/issues/:id/collaboration/budget-override requests and resolves override", async () => {
    // Request override
    const reqRes = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/budget-override")
      .send({ reason: "Scaling required for large sprint", amountUsd: 100.0 });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.budgetOverrideRequested).toBe(true);
    expect(reqRes.body.budgetPolicyState).toBe("awaiting_approval");

    // Resolve override
    const resolveRes = await request(app)
      .post("/api/companies/comp-123/issues/issue-abc/collaboration/budget-override/resolve")
      .send({ approved: true });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.budgetOverrideRequested).toBe(false);
    expect(resolveRes.body.budgetPolicyState).toBe("normal");
  });
});
