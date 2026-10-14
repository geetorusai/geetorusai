import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { memoryRoutes } from "../routes/memory.js";

// Mock logActivity
vi.mock("../services/activity-log.js", () => ({
  logActivity: vi.fn(),
}));

function createApp(actorOverrides: Record<string, unknown> = {}) {
  const app = express();
  app.use(express.json());

  // Attach actor
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: true,
      ...actorOverrides,
    };
    next();
  });

  // Dummy DB (in-memory services handle state)
  const dummyDb: any = {};
  app.use("/api", memoryRoutes(dummyDb));

  // Basic error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}

describe("Memory REST API Routes", () => {
  const allowedCompany = "company-1";
  const forbiddenCompany = "company-2";

  describe("Company Isolation & Authorization", () => {
    it("rejects access to a company the actor does not belong to (403 Forbidden)", async () => {
      const app = createApp({
        source: "session",
        isInstanceAdmin: false,
        companyIds: ["company-1"],
      });
      const res = await request(app).get(`/api/companies/${forbiddenCompany}/memories`);
      expect(res.status).toBe(403);
    });

    it("allows access to authorized company", async () => {
      const app = createApp({ companyIds: [allowedCompany] });
      const res = await request(app).get(`/api/companies/${allowedCompany}/memories`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("CRUD Endpoints", () => {
    it("creates a memory item and retrieves it", async () => {
      const app = createApp();

      const createRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories`)
        .send({
          title: "API Routing Conventions",
          content: "Always scope API routes under /companies/:companyId/",
          type: "decision",
          tags: ["api", "standards"],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.memory).toBeDefined();
      expect(createRes.body.memory.title).toBe("API Routing Conventions");
      const memoryId = createRes.body.memory.id;

      // GET by ID
      const getRes = await request(app).get(`/api/companies/${allowedCompany}/memories/${memoryId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(memoryId);

      // Update
      const updateRes = await request(app)
        .put(`/api/companies/${allowedCompany}/memories/${memoryId}`)
        .send({
          title: "API Routing Conventions (Updated)",
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.title).toBe("API Routing Conventions (Updated)");

      // Delete (archive)
      const deleteRes = await request(app).delete(`/api/companies/${allowedCompany}/memories/${memoryId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.memory.status).toBe("archived");
    });
  });

  describe("Hybrid Search", () => {
    it("searches memories with query text", async () => {
      const app = createApp();

      // Seed item
      await request(app)
        .post(`/api/companies/${allowedCompany}/memories`)
        .send({
          title: "Database Query Optimization",
          content: "Use indexes on company_id and foreign keys.",
          type: "lesson",
          tags: ["db"],
        });

      const searchRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/search`)
        .send({
          query: "database indexes optimization",
        });

      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body)).toBe(true);
      expect(searchRes.body.length).toBeGreaterThan(0);
      expect(searchRes.body[0].item.title).toBe("Database Query Optimization");
      expect(searchRes.body[0].score).toBeGreaterThan(0);
    });
  });

  describe("Proposal & Review Queue Flow", () => {
    it("proposes memory with auto_save policy", async () => {
      const app = createApp();

      await request(app)
        .put(`/api/companies/${allowedCompany}/memories/settings`)
        .send({ writePolicy: "auto_save" });

      const res = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/propose`)
        .send({
          title: "Auto Saved Fact",
          content: "Learned during execution step.",
          type: "fact",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("saved");
      expect(res.body.memory.status).toBe("active");
    });

    it("proposes memory requiring approval, then approves it", async () => {
      const app = createApp();

      const settingsRes = await request(app)
        .put(`/api/companies/${allowedCompany}/memories/settings`)
        .send({ writePolicy: "require_approval" });
      expect(settingsRes.status).toBe(200);
      expect(settingsRes.body.writePolicy).toBe("require_approval");

      const propRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/propose`)
        .send({
          title: "Awaiting Approval Decision",
          content: "Should switch cache to Redis cluster.",
          type: "decision",
        });

      expect(propRes.status).toBe(201);
      expect(propRes.body.status).toBe("pending_approval");
      const memoryId = propRes.body.memory.id;

      // Approve
      const approveRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/${memoryId}/approve`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe("active");
    });
  });

  describe("Merge & Dedup", () => {
    it("merges duplicate items into survivor", async () => {
      const app = createApp();

      const m1 = await request(app)
        .post(`/api/companies/${allowedCompany}/memories`)
        .send({ title: "Cache Rule V1", content: "TTL 60s" });

      const m2 = await request(app)
        .post(`/api/companies/${allowedCompany}/memories`)
        .send({ title: "Cache Rule V2", content: "TTL 120s" });

      const mergeRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/merge`)
        .send({
          survivorId: m2.body.memory.id,
          duplicateIds: [m1.body.memory.id],
          mergedTitle: "Unified Cache Policy",
          mergedContent: "TTL 120s for general endpoints.",
        });

      expect(mergeRes.status).toBe(200);
      expect(mergeRes.body.supersededCount).toBe(1);
      expect(mergeRes.body.survivor.title).toBe("Unified Cache Policy");
    });
  });

  describe("Import & Export", () => {
    it("imports markdown chunks and exports complete knowledge base", async () => {
      const app = createApp();

      const mdContent = `
## Auth Token Standard
Use Bearer token in Authorization header.

## Port Assignment
Dev server operates on 3100.
      `.trim();

      const importRes = await request(app)
        .post(`/api/companies/${allowedCompany}/memories/import`)
        .send({
          markdownText: mdContent,
          defaultTags: ["imported-test"],
        });

      expect(importRes.status).toBe(201);
      expect(importRes.body.importedCount).toBe(2);

      // Export
      const exportRes = await request(app).get(`/api/companies/${allowedCompany}/memories/export`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.text).toContain("Auth Token Standard");
      expect(exportRes.text).toContain("Port Assignment");
    });
  });
});
