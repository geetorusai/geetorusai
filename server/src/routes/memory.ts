import { Router } from "express";
import type { Db } from "@geetorusai/db";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { memoryService } from "../services/memory/index.js";
import { logActivity } from "../services/activity-log.js";
import type {
  CompanyMemorySettings,
  HybridSearchQuery,
  MemoryItem,
  MergeMemoriesInput,
  ProposeMemoryInput,
} from "@geetorusai/shared";

export function memoryRoutes(db: Db) {
  const router = Router();
  const svc = memoryService(db);

  // 1. List Memories (Collection GET)
  router.get("/companies/:companyId/memories", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const filters = {
      scope: req.query.scope as MemoryItem["scope"] | undefined,
      scopeId: req.query.scopeId as string | undefined,
      type: req.query.type as MemoryItem["type"] | undefined,
      status: req.query.status as MemoryItem["status"] | undefined,
      tag: req.query.tag as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const items = await svc.listMemories(companyId, filters);
    res.json(items);
  });

  // 2. Create Memory (Collection POST)
  router.post("/companies/:companyId/memories", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const { title, content, scope, scopeId, type, tags, confidence, expiresAt } = req.body ?? {};

    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }

    const { memory, duplicates } = await svc.createMemory(companyId, {
      title: String(title),
      content: String(content),
      scope,
      scopeId,
      type,
      tags: Array.isArray(tags) ? tags : [],
      confidence: typeof confidence === "number" ? confidence : 1.0,
      createdBy: "human",
      createdById: actor.actorId,
      status: "active",
      expiresAt,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.created",
      entityType: "memory_item",
      entityId: memory.id,
      details: {
        title: memory.title,
        scope: memory.scope,
        type: memory.type,
        hasDuplicates: duplicates.hasDuplicate,
      },
    });

    res.status(201).json({ memory, duplicates });
  });

  // 3. Search Memories (Hybrid)
  router.post("/companies/:companyId/memories/search", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const query: HybridSearchQuery = {
      query: String(req.body?.query ?? ""),
      scope: req.body?.scope,
      scopeId: req.body?.scopeId,
      type: req.body?.type,
      tags: req.body?.tags,
      limit: typeof req.body?.limit === "number" ? req.body.limit : undefined,
      minScore: typeof req.body?.minScore === "number" ? req.body.minScore : undefined,
      status: req.body?.status,
    };

    const results = await svc.searchMemories(companyId, query);
    res.json(results);
  });

  // 4. Propose Memory (Agent path / Policy Gated)
  router.post("/companies/:companyId/memories/propose", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const proposal: ProposeMemoryInput = {
      title: String(req.body?.title ?? "").trim(),
      content: String(req.body?.content ?? "").trim(),
      scope: req.body?.scope,
      scopeId: req.body?.scopeId,
      type: req.body?.type,
      tags: req.body?.tags,
      confidence: req.body?.confidence,
      source: req.body?.source ?? "task",
    };

    if (!proposal.title || !proposal.content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }

    const result = await svc.proposeMemory(companyId, proposal, actor.agentId ?? actor.actorId);

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.proposed",
      entityType: "memory_item",
      entityId: result.memory?.id ?? "policy-rejected",
      details: {
        status: result.status,
        title: proposal.title,
        type: proposal.type,
      },
    });

    res.status(result.status === "rejected_by_policy" ? 200 : 201).json(result);
  });

  // 5. Memory Settings (Get) - MUST precede /:id
  router.get("/companies/:companyId/memories/settings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const settings = await svc.getSettings(companyId);
    res.json(settings);
  });

  // 6. Memory Settings (Update) - MUST precede /:id
  router.put("/companies/:companyId/memories/settings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const updated = await svc.updateSettings(companyId, req.body ?? {});

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.settings_updated",
      entityType: "company_memory_settings",
      entityId: companyId,
      details: { ...updated } as Record<string, unknown>,
    });

    res.json(updated);
  });

  // 7. Bulk Import Markdown / Text - MUST precede /:id
  router.post("/companies/:companyId/memories/import", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const { markdownText, defaultScope, defaultScopeId, defaultType, defaultTags } = req.body ?? {};

    if (!markdownText) {
      res.status(400).json({ error: "markdownText is required" });
      return;
    }

    const result = await svc.importMarkdown(
      companyId,
      String(markdownText),
      { defaultScope, defaultScopeId, defaultType, defaultTags },
    );

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.imported",
      entityType: "memory_items",
      entityId: companyId,
      details: { importedCount: result.importedCount },
    });

    res.status(201).json(result);
  });

  // 8. Export Memories as Markdown - MUST precede /:id
  router.get("/companies/:companyId/memories/export", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const markdown = await svc.exportMarkdown(companyId);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="geetorus-memories-${companyId}-${new Date().toISOString().split("T")[0]}.md"`,
    );
    res.send(markdown);
  });

  // 9. Merge & Supersede Duplicate Memories - MUST precede /:id
  router.post("/companies/:companyId/memories/merge", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const input: MergeMemoriesInput = {
      survivorId: String(req.body?.survivorId ?? ""),
      duplicateIds: Array.isArray(req.body?.duplicateIds) ? req.body.duplicateIds : [],
      mergedTitle: req.body?.mergedTitle,
      mergedContent: req.body?.mergedContent,
      mergedTags: req.body?.mergedTags,
    };

    if (!input.survivorId || input.duplicateIds.length === 0) {
      res.status(400).json({ error: "survivorId and duplicateIds are required" });
      return;
    }

    const result = await svc.mergeMemories(companyId, input);

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.merged",
      entityType: "memory_item",
      entityId: input.survivorId,
      details: {
        supersededCount: result.supersededCount,
        duplicateIds: input.duplicateIds,
      },
    });

    res.json(result);
  });

  // 10. Inject Memories for Task/Heartbeat Run - MUST precede /:id
  router.post("/companies/:companyId/memories/inject", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { query, projectId, agentId, issueId, runId, tokenBudget } = req.body ?? {};

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const injection = await svc.injectMemoriesForRun(
      companyId,
      {
        query: String(query),
        projectId,
        agentId,
        issueId,
        tokenBudget: typeof tokenBudget === "number" ? tokenBudget : undefined,
      },
      runId,
    );

    res.json(injection);
  });

  // 11. Memories Used on a Run
  router.get("/companies/:companyId/runs/:runId/memories", async (req, res) => {
    const companyId = req.params.companyId as string;
    const runId = req.params.runId as string;
    assertCompanyAccess(req, companyId);

    const usages = await svc.getMemoryUsagesForRun(companyId, runId);
    res.json(usages);
  });

  // 12. Get Memory by ID
  router.get("/companies/:companyId/memories/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const memory = await svc.getMemory(companyId, id);
    if (!memory) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    res.json(memory);
  });

  // 13. Update Memory
  router.put("/companies/:companyId/memories/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const updated = await svc.updateMemory(companyId, id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.updated",
      entityType: "memory_item",
      entityId: id,
      details: {
        title: updated.title,
        status: updated.status,
      },
    });

    res.json(updated);
  });

  // 14. Delete / Archive Memory
  router.delete("/companies/:companyId/memories/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const archived = await svc.rejectMemory(companyId, id);
    if (!archived) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.archived",
      entityType: "memory_item",
      entityId: id,
      details: { title: archived.title },
    });

    res.json({ success: true, memory: archived });
  });

  // 15. Review Queue: Approve Memory
  router.post("/companies/:companyId/memories/:id/approve", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const approved = await svc.approveMemory(companyId, id);
    if (!approved) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.approved",
      entityType: "memory_item",
      entityId: id,
      details: { title: approved.title },
    });

    res.json(approved);
  });

  // 16. Review Queue: Reject Memory
  router.post("/companies/:companyId/memories/:id/reject", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const actor = getActorInfo(req);
    const rejected = await svc.rejectMemory(companyId, id);
    if (!rejected) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "memory.rejected",
      entityType: "memory_item",
      entityId: id,
      details: { title: rejected.title },
    });

    res.json(rejected);
  });

  return router;
}
