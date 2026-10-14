import { Router } from "express";
import { and, eq } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import { agents, issues } from "@geetorusai/db";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import {
  collaborationService,
  type AgentCandidate,
} from "../services/collaboration/index.js";
import { logActivity } from "../services/index.js";

export function collaborationRoutes(db: Db) {
  const router = Router();
  const svc = collaborationService(db);

  async function loadCompanyAgents(companyId: string): Promise<AgentCandidate[]> {
    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        title: agents.title,
        capabilities: agents.capabilities,
        adapterType: agents.adapterType,
        status: agents.status,
        adapterConfig: agents.adapterConfig,
      })
      .from(agents)
      .where(eq(agents.companyId, companyId));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      title: r.title,
      capabilities: r.capabilities,
      adapterType: r.adapterType,
      status: r.status,
      adapterConfig: r.adapterConfig as Record<string, unknown> | null,
    }));
  }

  async function loadIssue(companyId: string, issueId: string) {
    return db
      .select({
        id: issues.id,
        title: issues.title,
        description: issues.description,
        priority: issues.priority,
        status: issues.status,
        companyId: issues.companyId,
      })
      .from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)))
      .then((rows) => rows[0] ?? null);
  }

  // 1. Analyze Task Requirements & Complexity
  router.post("/companies/:companyId/issues/:id/collaboration/analyze", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const issue = await loadIssue(companyId, issueId);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const analysis = svc.analyze(issue);
    res.json(analysis);
  });

  // 2. Create or Retrieve Collaborative Execution Plan
  router.post("/companies/:companyId/issues/:id/collaboration/plan", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const issue = await loadIssue(companyId, issueId);
    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const companyAgents = await loadCompanyAgents(companyId);
    const options = {
      concurrencyLimit: typeof req.body?.concurrencyLimit === "number" ? req.body.concurrencyLimit : undefined,
      customStrategy: req.body?.strategy === "single_agent" || req.body?.strategy === "multi_agent_collaborative"
        ? req.body.strategy
        : undefined,
    };

    const workflow = await svc.createWorkflow(companyId, issue, companyAgents, options);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.workflow_created",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: {
        issueId: issue.id,
        strategy: workflow.strategy,
        subtaskCount: workflow.subtasks.length,
      },
    });

    res.status(201).json(workflow);
  });

  // 3. Get Active Collaboration State & DAG
  router.get("/companies/:companyId/issues/:id/collaboration", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      const issue = await loadIssue(companyId, issueId);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      const companyAgents = await loadCompanyAgents(companyId);
      const autoWf = await svc.createWorkflow(companyId, issue, companyAgents);
      res.json(autoWf);
      return;
    }

    res.json(workflow);
  });

  // 4. Start / Step Execution
  router.post("/companies/:companyId/issues/:id/collaboration/start", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    let workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      const issue = await loadIssue(companyId, issueId);
      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }
      const companyAgents = await loadCompanyAgents(companyId);
      workflow = await svc.createWorkflow(companyId, issue, companyAgents);
    }

    const updated = await svc.startOrStepWorkflow(workflow.id);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.workflow_started",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { status: updated.status },
    });

    res.json(updated);
  });

  // 5. Pause Execution
  router.post("/companies/:companyId/issues/:id/collaboration/pause", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const updated = svc.pauseWorkflow(workflow.id);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.workflow_paused",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { status: updated.status },
    });

    res.json(updated);
  });

  // 6. Resume Execution
  router.post("/companies/:companyId/issues/:id/collaboration/resume", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const updated = svc.resumeWorkflow(workflow.id);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.workflow_resumed",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { status: updated.status },
    });

    res.json(updated);
  });

  // 7. Complete Subtask
  router.post("/companies/:companyId/issues/:id/collaboration/subtasks/:subtaskId/complete", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    const subtaskId = req.params.subtaskId as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { outputNotes, tokenUsage } = req.body ?? {};
    const updated = await svc.completeSubtask(
      workflow.id,
      subtaskId,
      outputNotes,
      tokenUsage,
    );

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.subtask_completed",
      entityType: "collaboration_subtask",
      entityId: subtaskId,
      details: { workflowId: workflow.id },
    });

    res.json(updated);
  });

  // 8. Claim File Lock
  router.post("/companies/:companyId/issues/:id/collaboration/locks", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { filePath, agentId, subtaskId, reason } = req.body ?? {};
    if (!filePath || !agentId || !subtaskId) {
      res.status(400).json({ error: "filePath, agentId, and subtaskId are required" });
      return;
    }

    const lock = svc.acquireFileLock(workflow.id, filePath, agentId, subtaskId, reason);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.file_lock_acquired",
      entityType: "collaboration_lock",
      entityId: filePath,
      details: { workflowId: workflow.id, agentId, subtaskId },
    });

    res.json(lock);
  });

  // 9. Release File Lock
  router.delete("/companies/:companyId/issues/:id/collaboration/locks", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { filePath, agentId } = req.body ?? {};
    if (!filePath || !agentId) {
      res.status(400).json({ error: "filePath and agentId are required" });
      return;
    }

    svc.releaseFileLock(workflow.id, filePath, agentId);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.file_lock_released",
      entityType: "collaboration_lock",
      entityId: filePath,
      details: { workflowId: workflow.id, agentId },
    });

    res.status(204).end();
  });

  // 10. Add Architectural Directive
  router.post("/companies/:companyId/issues/:id/collaboration/directives", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { directive } = req.body ?? {};
    if (!directive) {
      res.status(400).json({ error: "directive is required" });
      return;
    }

    svc.addArchitecturalDirective(workflow.id, directive);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.directive_added",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { directive },
    });

    res.json(svc.getSharedContext(workflow.id));
  });

  // 11. Add Shared Contract Schema
  router.post("/companies/:companyId/issues/:id/collaboration/contracts", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { name, content } = req.body ?? {};
    if (!name || !content) {
      res.status(400).json({ error: "name and content are required" });
      return;
    }

    svc.addSharedContract(workflow.id, name, content);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.contract_added",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { name },
    });

    res.json(svc.getSharedContext(workflow.id));
  });

  // 12. Company Collaboration Settings (Get)
  router.get("/companies/:companyId/collaboration/settings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const settings = await svc.getSettings(companyId);
    res.json(settings);
  });

  // 13. Company Collaboration Settings (Update)
  router.put("/companies/:companyId/collaboration/settings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const updated = await svc.updateSettings(companyId, req.body ?? {});

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.settings_updated",
      entityType: "company_collaboration_settings",
      entityId: companyId,
      details: { ...updated } as Record<string, unknown>,
    });

    res.json(updated);
  });

  // 14. Stream Subtask Tokens (WebSocket / Token Stream Hook)
  router.post("/companies/:companyId/issues/:id/collaboration/subtasks/:subtaskId/stream-tokens", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    const subtaskId = req.params.subtaskId as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const inputTokens = typeof req.body?.inputTokens === "number" ? req.body.inputTokens : 0;
    const outputTokens = typeof req.body?.outputTokens === "number" ? req.body.outputTokens : 0;

    const result = await svc.streamSubtaskTokens(companyId, workflow.id, subtaskId, {
      inputTokens,
      outputTokens,
    });

    res.json(result);
  });

  // 15. Request Budget Override
  router.post("/companies/:companyId/issues/:id/collaboration/budget-override", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const { reason, amountUsd } = req.body ?? {};
    const updated = await svc.requestBudgetOverride(workflow.id, reason, amountUsd);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "collaboration.budget_override_requested",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { reason, amountUsd },
    });

    res.json(updated);
  });

  // 16. Resolve Budget Override
  router.post("/companies/:companyId/issues/:id/collaboration/budget-override/resolve", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const workflow = svc.getWorkflowByIssueId(issueId);
    if (!workflow) {
      res.status(404).json({ error: "Collaboration workflow not found" });
      return;
    }

    const approved = Boolean(req.body?.approved);
    const updated = await svc.resolveBudgetOverride(workflow.id, approved);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: approved ? "collaboration.budget_override_approved" : "collaboration.budget_override_rejected",
      entityType: "collaboration_workflow",
      entityId: workflow.id,
      details: { approved },
    });

    res.json(updated);
  });

  return router;
}
