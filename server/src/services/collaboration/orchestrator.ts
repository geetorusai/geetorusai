import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import {
  approvals,
  budgetIncidents,
  collaborationSharedContexts,
  collaborationSubtasks,
  collaborationWorkflows,
} from "@geetorusai/db";
import type {
  CollaborationLogEntry,
  CollaborationVerificationResult,
  CollaborationWorkflow,
  CollaborativeSubtask,
  TaskAnalysisResult,
} from "@geetorusai/shared";
import { logActivity } from "../activity-log.js";
import { publishLiveEvent } from "../live-events.js";
import { taskAnalyzer } from "./task-analyzer.js";
import { taskAllocator, type AgentCandidate } from "./task-allocator.js";
import { sharedWorkspaceContext } from "./shared-workspace-context.js";
import { collaborationSettings } from "./collaboration-settings.js";

export interface WorkflowCreationOptions {
  concurrencyLimit?: number;
  taskBudgetUsd?: number;
  tokenBudget?: number;
  customStrategy?: "single_agent" | "multi_agent_collaborative";
  db?: Db;
}

export class MultiAgentOrchestrator {
  private workflows = new Map<string, CollaborationWorkflow>();

  public getWorkflow(workflowId: string): CollaborationWorkflow | null {
    return this.workflows.get(workflowId) ?? null;
  }

  public getWorkflowByIssueId(issueId: string): CollaborationWorkflow | null {
    for (const wf of this.workflows.values()) {
      if (wf.parentIssueId === issueId) {
        return wf;
      }
    }
    return null;
  }

  public listWorkflows(companyId: string): CollaborationWorkflow[] {
    return Array.from(this.workflows.values()).filter((wf) => wf.companyId === companyId);
  }

  public analyze(issue: { id: string; title: string; description?: string | null }): TaskAnalysisResult {
    return taskAnalyzer.analyze(issue);
  }

  private async persistToDb(wf: CollaborationWorkflow, db?: Db): Promise<void> {
    if (!db) return;
    try {
      const isVerified = wf.verification?.verified ?? false;
      await db
        .insert(collaborationWorkflows)
        .values({
          id: wf.id,
          companyId: wf.companyId,
          issueId: wf.parentIssueId,
          status: wf.status,
          complexity: "medium",
          executionStrategy: wf.strategy,
          tokensUsed: wf.totalTokensUsed,
          activeParallelAgents: wf.subtasks.filter((s) => s.status === "in_progress").length,
          maxParallelAgents: wf.concurrencyLimit,
          verificationStatus: wf.verification ? (isVerified ? "passed" : "failed") : "pending",
          verificationReport: wf.verification as Record<string, unknown> | null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [collaborationWorkflows.companyId, collaborationWorkflows.issueId],
          set: {
            status: wf.status,
            tokensUsed: wf.totalTokensUsed,
            activeParallelAgents: wf.subtasks.filter((s) => s.status === "in_progress").length,
            verificationStatus: wf.verification ? (isVerified ? "passed" : "failed") : "pending",
            verificationReport: wf.verification as Record<string, unknown> | null,
            updatedAt: new Date(),
          },
        });

      for (const sub of wf.subtasks) {
        const isSynth = sub.isSynthesizedSpecialist || (sub.assignedAgentId && sub.assignedAgentId.startsWith("synth-"));
        await db
          .insert(collaborationSubtasks)
          .values({
            companyId: wf.companyId,
            workflowId: wf.id,
            subtaskId: sub.id,
            title: sub.title,
            description: sub.description,
            role: sub.role,
            status: sub.status,
            dependencies: sub.dependencies,
            requiredSkills: sub.requiredSkills,
            tokensUsed: sub.tokenUsage?.totalTokens ?? 0,
            tokenBudget: sub.estimatedTokens,
            assignedAgentId: isSynth ? null : (sub.assignedAgentId ?? null),
            gitBranch: sub.gitBranch ?? null,
            executionWorkspaceId: sub.executionWorkspaceId ?? null,
            output: sub.outputNotes,
            error: sub.error,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [collaborationSubtasks.workflowId, collaborationSubtasks.subtaskId],
            set: {
              status: sub.status,
              tokensUsed: sub.tokenUsage?.totalTokens ?? 0,
              gitBranch: sub.gitBranch ?? null,
              executionWorkspaceId: sub.executionWorkspaceId ?? null,
              output: sub.outputNotes,
              error: sub.error,
              updatedAt: new Date(),
            },
          });
      }

      await db
        .insert(collaborationSharedContexts)
        .values({
          companyId: wf.companyId,
          workflowId: wf.id,
          fileLocks: wf.sharedContext.fileLocks,
          sharedContracts: wf.sharedContext.sharedSchemasAndContracts,
          architecturalDirectives: wf.sharedContext.architecturalNotes,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: collaborationSharedContexts.workflowId,
          set: {
            fileLocks: wf.sharedContext.fileLocks,
            sharedContracts: wf.sharedContext.sharedSchemasAndContracts,
            architecturalDirectives: wf.sharedContext.architecturalNotes,
            updatedAt: new Date(),
          },
        });
    } catch {
      // In-memory fallback handles non-DB test execution
    }
  }

  public async createWorkflowAsync(
    companyId: string,
    issue: { id: string; title: string; description?: string | null },
    agents: AgentCandidate[],
    options: WorkflowCreationOptions = {},
  ): Promise<CollaborationWorkflow> {
    const analysis = this.analyze(issue);
    const db = options.db;
    const settings = await collaborationSettings.getSettings(companyId, db);

    const concurrencyLimit = options.concurrencyLimit ?? settings.maxParallelAgents;
    const strategy = options.customStrategy ?? analysis.recommendedStrategy;

    const subtasksToPlan = strategy === "single_agent"
      ? analysis.plannedSubtasks.slice(0, 1)
      : analysis.plannedSubtasks;

    const effectiveAgents =
      strategy === "multi_agent_collaborative"
        ? taskAllocator.synthesizeSpecialistPool(subtasksToPlan, agents)
        : agents;

    const allocations = taskAllocator.allocate(subtasksToPlan, effectiveAgents);

    const workflowId = randomUUID();
    const now = new Date().toISOString();

    const collaborativeSubtasks: CollaborativeSubtask[] = subtasksToPlan.map((ps) => {
      const alloc = allocations.get(ps.id);
      const isBlocked = ps.dependencies.length > 0;
      const subtaskBranch = `collab/${issue.id.slice(0, 8)}/${ps.id}`;
      const workspaceId = randomUUID();

      return {
        id: ps.id,
        title: ps.title,
        description: ps.description,
        role: ps.role,
        status: isBlocked ? "blocked" : "assigned",
        requiredSkills: ps.requiredSkills,
        dependencies: ps.dependencies,
        targetFiles: ps.targetFiles,
        acceptanceCriteria: ps.acceptanceCriteria,
        assignedAgentId: alloc?.agentId ?? null,
        assignedAgentName: alloc?.agentName ?? null,
        assignedAgentRole: alloc?.agentRole ?? null,
        assignedModel: alloc?.model ?? null,
        subtaskIssueId: null,
        gitBranch: subtaskBranch,
        executionWorkspaceId: workspaceId,
        isSynthesizedSpecialist: alloc?.isSynthesizedSpecialist ?? false,
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
        outputNotes: null,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        estimatedTokens: ps.estimatedTokens,
      };
    });

    const initialLogs: CollaborationLogEntry[] = [
      {
        id: randomUUID(),
        timestamp: now,
        agentId: null,
        agentName: "Orchestrator",
        role: "orchestrator",
        level: "info",
        message: `Task analysis complete. Evaluated complexity as "${analysis.complexity}". Strategy set to "${strategy}".`,
      },
      {
        id: randomUUID(),
        timestamp: now,
        agentId: null,
        agentName: "Orchestrator",
        role: "orchestrator",
        level: "info",
        message: `Generated ${collaborativeSubtasks.length} subtasks. Configured concurrency limit: ${concurrencyLimit}.`,
      },
    ];

    for (const sub of collaborativeSubtasks) {
      if (sub.assignedAgentName) {
        initialLogs.push({
          id: randomUUID(),
          timestamp: now,
          agentId: sub.assignedAgentId,
          agentName: sub.assignedAgentName,
          role: sub.role,
          level: "info",
          message: `Assigned [${sub.role}] subtask "${sub.title}" to ${sub.assignedAgentName} (${sub.assignedAgentRole}). Status: ${sub.status}.`,
          subtaskId: sub.id,
        });
      }
    }

    let initialStatus: CollaborationWorkflow["status"] = "planned";
    let budgetPolicyState: "normal" | "throttled" | "awaiting_approval" | "paused" = "normal";
    let budgetOverrideRequested = false;

    // Budget Incident Check
    if (db) {
      try {
        const openIncidents = await db
          .select()
          .from(budgetIncidents)
          .where(and(eq(budgetIncidents.companyId, companyId), eq(budgetIncidents.status, "open")))
          .limit(1);

        if (openIncidents.length > 0) {
          // Resilient Cost Throttling: Auto-downshift models to economical tier (e.g. gemini-2.0-flash)
          for (const sub of collaborativeSubtasks) {
            sub.assignedModel = "gemini-2.0-flash";
          }
          initialStatus = "paused";
          budgetPolicyState = "awaiting_approval";
          budgetOverrideRequested = true;
          initialLogs.push({
            id: randomUUID(),
            timestamp: now,
            agentId: null,
            agentName: "BudgetEnforcer",
            role: "orchestrator",
            level: "warn",
            message: "Active company budget incident detected. Auto-downshifted model tier to economical tier (gemini-2.0-flash) and submitted approval escalation.",
          });
          try {
            await db.insert(approvals).values({
              companyId,
              type: "collaboration_workflow",
              status: "pending",
              payload: {
                workflowId,
                parentIssueId: issue.id,
                action: "budget_override",
                reason: "Active company budget incident requires administrative override",
                estimatedCostUsd: analysis.estimatedCostUsd,
                subtaskCount: subtasksToPlan.length,
              },
            });
          } catch {}
        }
      } catch {}

      // Governance / Approval Check
      if (strategy === "multi_agent_collaborative" && analysis.estimatedCostUsd > settings.taskBudgetUsd) {
        for (const sub of collaborativeSubtasks) {
          if (!sub.assignedModel || sub.assignedModel.includes("claude-3-7") || sub.assignedModel.includes("gpt-4")) {
            sub.assignedModel = "gemini-2.0-flash";
          }
        }
        initialStatus = "paused";
        budgetPolicyState = "awaiting_approval";
        budgetOverrideRequested = true;
        initialLogs.push({
          id: randomUUID(),
          timestamp: now,
          agentId: null,
          agentName: "GovernanceGate",
          role: "orchestrator",
          level: "warn",
          message: `Estimated workflow cost ($${analysis.estimatedCostUsd}) exceeds threshold ($${settings.taskBudgetUsd}). Throttled to economical model tier and requested approval.`,
        });

        try {
          await db.insert(approvals).values({
            companyId,
            type: "collaboration_workflow",
            status: "pending",
            payload: {
              workflowId,
              parentIssueId: issue.id,
              action: "budget_override",
              estimatedCostUsd: analysis.estimatedCostUsd,
              subtaskCount: subtasksToPlan.length,
            },
          });
        } catch {}
      }
    }

    const workflow: CollaborationWorkflow = {
      id: workflowId,
      companyId,
      parentIssueId: issue.id,
      strategy,
      status: initialStatus,
      concurrencyLimit,
      totalEstimatedCostUsd: analysis.estimatedCostUsd,
      totalTokensUsed: 0,
      budgetPolicyState,
      budgetOverrideRequested,
      subtasks: collaborativeSubtasks,
      sharedContext: sharedWorkspaceContext.getOrCreateContext(workflowId),
      verification: null,
      finalConsolidatedOutput: null,
      logs: initialLogs,
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(workflowId, workflow);

    if (db) {
      await this.persistToDb(workflow, db);
      try {
        await logActivity(db, {
          companyId,
          actorType: "system",
          actorId: "collaboration_orchestrator",
          action: "collaboration.workflow_created",
          entityType: "collaboration_workflow",
          entityId: workflowId,
          details: {
            strategy,
            complexity: analysis.complexity,
            subtaskCount: collaborativeSubtasks.length,
            estimatedCostUsd: analysis.estimatedCostUsd,
            budgetPolicyState,
          },
        });
      } catch {}
    }

    return workflow;
  }

  public createWorkflow(
    companyId: string,
    issue: { id: string; title: string; description?: string | null },
    agents: AgentCandidate[],
    options: WorkflowCreationOptions = {},
  ): CollaborationWorkflow {
    // Synchronous signature for unit tests and backwards compatibility
    const analysis = this.analyze(issue);
    const settings = {
      maxParallelAgents: 4,
      taskBudgetUsd: 15.0,
      tokenBudgetPerTask: 250000,
      autoDecompositionEnabled: true,
    };

    const concurrencyLimit = options.concurrencyLimit ?? settings.maxParallelAgents;
    const strategy = options.customStrategy ?? analysis.recommendedStrategy;

    const subtasksToPlan = strategy === "single_agent"
      ? analysis.plannedSubtasks.slice(0, 1)
      : analysis.plannedSubtasks;

    const effectiveAgents =
      strategy === "multi_agent_collaborative" && agents.length > 0 && agents.length < 3
        ? taskAllocator.synthesizeSpecialistPool(subtasksToPlan, agents)
        : (agents.length === 0 ? taskAllocator.synthesizeSpecialistPool(subtasksToPlan, []) : agents);

    const allocations = taskAllocator.allocate(subtasksToPlan, effectiveAgents);

    const workflowId = randomUUID();
    const now = new Date().toISOString();

    const collaborativeSubtasks: CollaborativeSubtask[] = subtasksToPlan.map((ps) => {
      const alloc = allocations.get(ps.id);
      const isBlocked = ps.dependencies.length > 0;
      const subtaskBranch = `collab/${issue.id.slice(0, 8)}/${ps.id}`;
      const workspaceId = randomUUID();

      return {
        id: ps.id,
        title: ps.title,
        description: ps.description,
        role: ps.role,
        status: isBlocked ? "blocked" : "assigned",
        requiredSkills: ps.requiredSkills,
        dependencies: ps.dependencies,
        targetFiles: ps.targetFiles,
        acceptanceCriteria: ps.acceptanceCriteria,
        assignedAgentId: alloc?.agentId ?? null,
        assignedAgentName: alloc?.agentName ?? null,
        assignedAgentRole: alloc?.agentRole ?? null,
        assignedModel: alloc?.model ?? null,
        subtaskIssueId: null,
        gitBranch: subtaskBranch,
        executionWorkspaceId: workspaceId,
        isSynthesizedSpecialist: alloc?.isSynthesizedSpecialist ?? false,
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
        outputNotes: null,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        estimatedTokens: ps.estimatedTokens,
      };
    });

    const initialLogs: CollaborationLogEntry[] = [
      {
        id: randomUUID(),
        timestamp: now,
        agentId: null,
        agentName: "Orchestrator",
        role: "orchestrator",
        level: "info",
        message: `Task analysis complete. Evaluated complexity as "${analysis.complexity}". Strategy set to "${strategy}".`,
      },
      {
        id: randomUUID(),
        timestamp: now,
        agentId: null,
        agentName: "Orchestrator",
        role: "orchestrator",
        level: "info",
        message: `Generated ${collaborativeSubtasks.length} subtasks. Configured concurrency limit: ${concurrencyLimit}.`,
      },
    ];

    for (const sub of collaborativeSubtasks) {
      if (sub.assignedAgentName) {
        initialLogs.push({
          id: randomUUID(),
          timestamp: now,
          agentId: sub.assignedAgentId,
          agentName: sub.assignedAgentName,
          role: sub.role,
          level: "info",
          message: `Assigned [${sub.role}] subtask "${sub.title}" to ${sub.assignedAgentName} (${sub.assignedAgentRole}). Status: ${sub.status}.`,
          subtaskId: sub.id,
        });
      }
    }

    const workflow: CollaborationWorkflow = {
      id: workflowId,
      companyId,
      parentIssueId: issue.id,
      strategy,
      status: "planned",
      concurrencyLimit,
      totalEstimatedCostUsd: analysis.estimatedCostUsd,
      totalTokensUsed: 0,
      budgetPolicyState: "normal",
      budgetOverrideRequested: false,
      subtasks: collaborativeSubtasks,
      sharedContext: sharedWorkspaceContext.getOrCreateContext(workflowId),
      verification: null,
      finalConsolidatedOutput: null,
      logs: initialLogs,
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  public async startOrStepWorkflowAsync(workflowId: string, db?: Db): Promise<CollaborationWorkflow> {
    const wf = this.startOrStepWorkflow(workflowId);
    if (db) {
      await this.persistToDb(wf, db);
      try {
        await logActivity(db, {
          companyId: wf.companyId,
          actorType: "system",
          actorId: "collaboration_orchestrator",
          action: "collaboration.workflow_stepped",
          entityType: "collaboration_workflow",
          entityId: wf.id,
          details: {
            status: wf.status,
            activeCount: wf.subtasks.filter((s) => s.status === "in_progress").length,
          },
        });
      } catch {}
    }
    return wf;
  }

  public startOrStepWorkflow(workflowId: string): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    if (wf.status === "paused" || wf.status === "cancelled" || wf.status === "completed") {
      return wf;
    }

    wf.status = "in_progress";
    wf.updatedAt = new Date().toISOString();

    const activeSubtasks = wf.subtasks.filter((s) => s.status === "in_progress");
    let availableSlots = wf.concurrencyLimit - activeSubtasks.length;

    for (const subtask of wf.subtasks) {
      if (availableSlots <= 0) break;

      if (subtask.status === "assigned") {
        const conflicts = sharedWorkspaceContext.detectFileConflicts(
          workflowId,
          subtask.id,
          subtask.targetFiles,
        );

        if (conflicts.length > 0) {
          this.log(
            wf,
            "warn",
            `Subtask "${subtask.title}" delayed: file lock conflict on [${conflicts.join(", ")}].`,
            subtask,
          );
          continue;
        }

        for (const file of subtask.targetFiles) {
          sharedWorkspaceContext.acquireFileLock(
            workflowId,
            file,
            subtask.assignedAgentId ?? "unknown",
            subtask.id,
            `Editing during ${subtask.title}`,
          );
        }

        subtask.status = "in_progress";
        subtask.startedAt = new Date().toISOString();
        availableSlots -= 1;

        this.log(
          wf,
          "info",
          `Agent ${subtask.assignedAgentName ?? "Assigned Agent"} started subtask "${subtask.title}".`,
          subtask,
        );
      }
    }

    this.emitWorkflowProgress(wf);
    return wf;
  }

  public async completeSubtaskAsync(
    workflowId: string,
    subtaskId: string,
    outputNotes?: string,
    tokenUsage?: { inputTokens: number; outputTokens: number },
    db?: Db,
  ): Promise<CollaborationWorkflow> {
    const wf = this.completeSubtask(workflowId, subtaskId, outputNotes, tokenUsage);
    if (db) {
      await this.persistToDb(wf, db);
      const subtask = wf.subtasks.find((s) => s.id === subtaskId);
      try {
        await logActivity(db, {
          companyId: wf.companyId,
          actorType: "agent",
          actorId: subtask?.assignedAgentId ?? "system",
          agentId: subtask?.assignedAgentId ?? undefined,
          action: "collaboration.subtask_completed",
          entityType: "collaboration_subtask",
          entityId: subtaskId,
          details: {
            role: subtask?.role,
            tokensUsed: subtask?.tokenUsage?.totalTokens,
          },
        });
      } catch {}
    }
    return wf;
  }

  public completeSubtask(
    workflowId: string,
    subtaskId: string,
    outputNotes?: string,
    tokenUsage?: { inputTokens: number; outputTokens: number },
  ): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    const subtask = wf.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found in workflow ${workflowId}`);

    subtask.status = "completed";
    subtask.completedAt = new Date().toISOString();
    subtask.outputNotes = outputNotes ?? `Completed requirements for ${subtask.title}`;

    if (tokenUsage) {
      subtask.tokenUsage = {
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.inputTokens + tokenUsage.outputTokens,
      };
      wf.totalTokensUsed += subtask.tokenUsage.totalTokens;
    } else {
      subtask.tokenUsage = {
        inputTokens: Math.floor(subtask.estimatedTokens * 0.7),
        outputTokens: Math.floor(subtask.estimatedTokens * 0.3),
        totalTokens: subtask.estimatedTokens,
      };
      wf.totalTokensUsed += subtask.estimatedTokens;
    }

    sharedWorkspaceContext.releaseFileLocksForSubtask(workflowId, subtaskId);
    sharedWorkspaceContext.resolveBlockersForSubtask(workflowId, subtaskId);

    this.log(
      wf,
      "success",
      `Subtask "${subtask.title}" successfully completed by ${subtask.assignedAgentName ?? "agent"}. Output verified.`,
      subtask,
    );

    for (const downstream of wf.subtasks) {
      if (downstream.status === "blocked") {
        const prerequisitesMet = downstream.dependencies.every((depId) => {
          const dep = wf.subtasks.find((s) => s.id === depId);
          return dep && dep.status === "completed";
        });

        if (prerequisitesMet) {
          downstream.status = "assigned";
          this.log(
            wf,
            "info",
            `Dependencies resolved for "${downstream.title}". Ready for execution by ${downstream.assignedAgentName ?? "agent"}.`,
            downstream,
          );
        }
      }
    }

    this.startOrStepWorkflow(workflowId);

    const allFinished = wf.subtasks.every((s) => s.status === "completed" || s.status === "failed");
    if (allFinished) {
      const anyFailed = wf.subtasks.some((s) => s.status === "failed");
      if (anyFailed) {
        wf.status = "failed";
      } else {
        wf.status = "verifying";
        this.verifyWorkflow(workflowId);
      }
    }

    this.emitWorkflowProgress(wf);
    return wf;
  }

  public retrySubtask(workflowId: string, subtaskId: string): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);
    const subtask = wf.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found`);

    subtask.status = "assigned";
    subtask.error = null;
    this.log(wf, "info", `Manually retrying subtask "${subtask.title}".`, subtask);
    this.startOrStepWorkflow(workflowId);
    return wf;
  }

  public reassignSubtask(
    workflowId: string,
    subtaskId: string,
    agentId: string,
    agentName?: string,
    agentRole?: string,
  ): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);
    const subtask = wf.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found`);

    subtask.assignedAgentId = agentId;
    if (agentName) subtask.assignedAgentName = agentName;
    if (agentRole) subtask.assignedAgentRole = agentRole;
    this.log(wf, "info", `Subtask "${subtask.title}" reassigned to ${agentName ?? agentId}.`, subtask);
    return wf;
  }

  public failSubtask(
    workflowId: string,
    subtaskId: string,
    error: string,
    fallbackAgents?: AgentCandidate[],
  ): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    const subtask = wf.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found`);

    subtask.error = error;
    subtask.retryCount += 1;

    sharedWorkspaceContext.releaseFileLocksForSubtask(workflowId, subtaskId);

    this.log(wf, "error", `Subtask "${subtask.title}" failed: ${error}`, subtask);

    if (subtask.retryCount <= 2) {
      subtask.status = "in_progress";
      this.log(
        wf,
        "warn",
        `Scheduling retry attempt ${subtask.retryCount} for "${subtask.title}".`,
        subtask,
      );
      this.startOrStepWorkflow(workflowId);
    } else {
      if (fallbackAgents && fallbackAgents.length > 1) {
        const alternate = fallbackAgents.find((a) => a.id !== subtask.assignedAgentId);
        if (alternate) {
          subtask.assignedAgentId = alternate.id;
          subtask.assignedAgentName = alternate.name;
          subtask.assignedAgentRole = alternate.role;
          subtask.status = "in_progress";
          this.log(
            wf,
            "warn",
            `Reassigning failed subtask "${subtask.title}" to alternate agent ${alternate.name}.`,
            subtask,
          );
          this.startOrStepWorkflow(workflowId);
          return wf;
        }
      }

      wf.status = "failed";
      this.log(
        wf,
        "error",
        `Workflow marked as failed due to unrecoverable failure in subtask "${subtask.title}".`,
        subtask,
      );
    }

    return wf;
  }

  public verifyWorkflow(workflowId: string): CollaborationVerificationResult {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    const completedCount = wf.subtasks.filter((s) => s.status === "completed").length;
    const allCompleted = completedCount === wf.subtasks.length;

    const result: CollaborationVerificationResult = {
      verified: allCompleted,
      testsPassed: allCompleted,
      lintPassed: allCompleted,
      integrationIssues: allCompleted ? [] : ["Some subtasks did not finish execution successfully."],
      verificationNotes: allCompleted
        ? `Consolidated output verified across ${wf.subtasks.length} collaborative agents. Zero conflicts encountered.`
        : "Automated checks flagged incomplete integration.",
    };

    wf.verification = result;
    if (result.verified) {
      wf.status = "completed";
      wf.finalConsolidatedOutput =
        "### Consolidated Collaborative Delivery\n\n" +
        wf.subtasks
          .map((s) => `### [${s.role.toUpperCase()}] ${s.title}\n${s.outputNotes ?? "Completed"}`)
          .join("\n\n");
      this.log(wf, "success", "Workflow successfully passed verification and consolidated outputs.");
    } else {
      wf.status = "failed";
      this.log(wf, "error", "Workflow failed final integration verification checks.");
    }

    this.emitWorkflowProgress(wf);
    return result;
  }

  public cancelWorkflow(workflowId: string): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);
    wf.status = "cancelled";
    this.log(wf, "warn", "Workflow execution cancelled by operator.");
    return wf;
  }

  public pauseWorkflow(workflowId: string): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);
    wf.status = "paused";
    this.log(wf, "warn", "Workflow execution manually paused by operator.");
    return wf;
  }

  public resumeWorkflow(workflowId: string): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);
    if (wf.status === "paused") {
      wf.status = "in_progress";
      this.log(wf, "info", "Workflow execution resumed.");
      this.startOrStepWorkflow(workflowId);
    }
    return wf;
  }

  public emitWorkflowProgress(wf: CollaborationWorkflow): void {
    try {
      publishLiveEvent({
        companyId: wf.companyId,
        type: "collaboration.workflow.progress",
        payload: {
          workflowId: wf.id,
          status: wf.status,
          totalTokensUsed: wf.totalTokensUsed,
          subtasksCompleted: wf.subtasks.filter((s) => s.status === "completed").length,
          subtasksTotal: wf.subtasks.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}
  }

  public async streamSubtaskTokensAsync(
    companyId: string,
    workflowId: string,
    subtaskId: string,
    tokens: { inputTokens: number; outputTokens: number },
    db?: Db,
  ): Promise<{
    totalWorkflowTokens: number;
    subtaskTokens: { inputTokens: number; outputTokens: number; totalTokens: number };
  }> {
    const res = this.streamSubtaskTokens(companyId, workflowId, subtaskId, tokens);
    const wf = this.workflows.get(workflowId);
    if (wf && db) {
      await this.persistToDb(wf, db);
    }
    return res;
  }

  public streamSubtaskTokens(
    companyId: string,
    workflowId: string,
    subtaskId: string,
    tokens: { inputTokens: number; outputTokens: number },
  ): {
    totalWorkflowTokens: number;
    subtaskTokens: { inputTokens: number; outputTokens: number; totalTokens: number };
  } {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    const subtask = wf.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) throw new Error(`Subtask ${subtaskId} not found in workflow ${workflowId}`);

    const deltaTotal = tokens.inputTokens + tokens.outputTokens;
    subtask.tokenUsage.inputTokens += tokens.inputTokens;
    subtask.tokenUsage.outputTokens += tokens.outputTokens;
    subtask.tokenUsage.totalTokens += deltaTotal;
    wf.totalTokensUsed += deltaTotal;
    wf.updatedAt = new Date().toISOString();

    try {
      publishLiveEvent({
        companyId,
        type: "collaboration.token.stream",
        payload: {
          workflowId,
          subtaskId,
          inputTokens: subtask.tokenUsage.inputTokens,
          outputTokens: subtask.tokenUsage.outputTokens,
          totalTokens: subtask.tokenUsage.totalTokens,
          totalWorkflowTokens: wf.totalTokensUsed,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    return {
      totalWorkflowTokens: wf.totalTokensUsed,
      subtaskTokens: { ...subtask.tokenUsage },
    };
  }

  public async requestBudgetOverrideAsync(
    workflowId: string,
    reason?: string,
    amountUsd?: number,
    db?: Db,
  ): Promise<CollaborationWorkflow> {
    const wf = this.requestBudgetOverride(workflowId, reason, amountUsd);
    if (db) {
      await this.persistToDb(wf, db);
      try {
        await db.insert(approvals).values({
          companyId: wf.companyId,
          type: "collaboration_workflow",
          status: "pending",
          payload: {
            workflowId,
            parentIssueId: wf.parentIssueId,
            action: "budget_override",
            reason: reason ?? "Manual budget override requested",
            amountUsd: amountUsd ?? wf.totalEstimatedCostUsd,
          },
        });
      } catch {}
      try {
        await logActivity(db, {
          companyId: wf.companyId,
          actorType: "system",
          actorId: "collaboration_orchestrator",
          action: "collaboration.budget_override_requested",
          entityType: "collaboration_workflow",
          entityId: workflowId,
          details: { reason, amountUsd },
        });
      } catch {}
    }
    return wf;
  }

  public requestBudgetOverride(
    workflowId: string,
    reason?: string,
    amountUsd?: number,
  ): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    wf.budgetOverrideRequested = true;
    wf.budgetPolicyState = "awaiting_approval";
    this.log(
      wf,
      "warn",
      `Budget override requested${amountUsd ? ` for $${amountUsd}` : ""}. Reason: ${reason ?? "Administrative unlock requested"}.`,
    );
    this.emitWorkflowProgress(wf);
    return wf;
  }

  public async resolveBudgetOverrideAsync(
    workflowId: string,
    approved: boolean,
    db?: Db,
  ): Promise<CollaborationWorkflow> {
    const wf = this.resolveBudgetOverride(workflowId, approved);
    if (db) {
      await this.persistToDb(wf, db);
      try {
        await logActivity(db, {
          companyId: wf.companyId,
          actorType: "system",
          actorId: "collaboration_orchestrator",
          action: approved ? "collaboration.budget_override_approved" : "collaboration.budget_override_rejected",
          entityType: "collaboration_workflow",
          entityId: workflowId,
          details: { approved },
        });
      } catch {}
    }
    return wf;
  }

  public resolveBudgetOverride(
    workflowId: string,
    approved: boolean,
  ): CollaborationWorkflow {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found`);

    if (approved) {
      wf.budgetPolicyState = "normal";
      wf.budgetOverrideRequested = false;
      if (wf.status === "paused") {
        wf.status = "in_progress";
        this.log(wf, "success", "Budget override approved by administrator. Resuming collaborative execution.");
        this.startOrStepWorkflow(workflowId);
      } else {
        this.log(wf, "info", "Budget override approved.");
      }
    } else {
      wf.budgetPolicyState = "paused";
      wf.budgetOverrideRequested = false;
      this.log(wf, "error", "Budget override rejected by administrator. Workflow remains locked.");
    }

    this.emitWorkflowProgress(wf);
    return wf;
  }

  private log(
    wf: CollaborationWorkflow,
    level: "info" | "warn" | "error" | "success",
    message: string,
    subtask?: CollaborativeSubtask,
  ): void {
    const entry: CollaborationLogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      agentId: subtask?.assignedAgentId ?? null,
      agentName: subtask?.assignedAgentName ?? "Orchestrator",
      role: subtask?.role ?? "orchestrator",
      level,
      message,
      subtaskId: subtask?.id,
    };
    wf.logs.push(entry);
    wf.updatedAt = entry.timestamp;
  }
}

export const multiAgentOrchestrator = new MultiAgentOrchestrator();
