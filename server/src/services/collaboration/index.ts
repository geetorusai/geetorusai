import type { Db } from "@geetorusai/db";
import { multiAgentOrchestrator } from "./orchestrator.js";
import { sharedWorkspaceContext } from "./shared-workspace-context.js";
import { collaborationSettings } from "./collaboration-settings.js";
import { taskAnalyzer } from "./task-analyzer.js";
import type { AgentCandidate } from "./task-allocator.js";
import type { WorkflowCreationOptions } from "./orchestrator.js";

export * from "./task-analyzer.js";
export * from "./task-allocator.js";
export * from "./shared-workspace-context.js";
export * from "./collaboration-settings.js";
export * from "./orchestrator.js";

export function collaborationService(db: Db) {
  return {
    analyze: (issue: { id: string; title: string; description?: string | null }) =>
      taskAnalyzer.analyze(issue),

    createWorkflow: async (
      companyId: string,
      issue: { id: string; title: string; description?: string | null },
      agents: AgentCandidate[],
      options: WorkflowCreationOptions = {},
    ) => multiAgentOrchestrator.createWorkflowAsync(companyId, issue, agents, { ...options, db }),

    getWorkflow: (workflowId: string) => multiAgentOrchestrator.getWorkflow(workflowId),

    getWorkflowByIssueId: (issueId: string) => multiAgentOrchestrator.getWorkflowByIssueId(issueId),

    listWorkflows: (companyId: string) => multiAgentOrchestrator.listWorkflows(companyId),

    startOrStepWorkflow: async (workflowId: string) =>
      multiAgentOrchestrator.startOrStepWorkflowAsync(workflowId, db),

    completeSubtask: async (
      workflowId: string,
      subtaskId: string,
      outputNotes?: string,
      tokenUsage?: { inputTokens: number; outputTokens: number },
    ) => multiAgentOrchestrator.completeSubtaskAsync(workflowId, subtaskId, outputNotes, tokenUsage, db),

    failSubtask: (workflowId: string, subtaskId: string, error: string) =>
      multiAgentOrchestrator.failSubtask(workflowId, subtaskId, error),

    verifyWorkflow: (workflowId: string) => multiAgentOrchestrator.verifyWorkflow(workflowId),

    pauseWorkflow: (workflowId: string) => multiAgentOrchestrator.pauseWorkflow(workflowId),

    resumeWorkflow: (workflowId: string) => multiAgentOrchestrator.resumeWorkflow(workflowId),

    getSettings: async (companyId: string) => collaborationSettings.getSettings(companyId, db),

    updateSettings: async (companyId: string, updates: Parameters<typeof collaborationSettings.updateSettings>[1]) =>
      collaborationSettings.updateSettings(companyId, updates, db),

    acquireFileLock: (
      workflowId: string,
      filePath: string,
      agentId: string,
      subtaskId: string,
      reason?: string,
    ) => sharedWorkspaceContext.acquireFileLock(workflowId, filePath, agentId, subtaskId, reason),

    releaseFileLock: (workflowId: string, filePath: string, agentId: string) =>
      sharedWorkspaceContext.releaseFileLock(workflowId, filePath, agentId),

    addSharedContract: (workflowId: string, name: string, content: string) =>
      sharedWorkspaceContext.addSharedContract(workflowId, name, content),

    addArchitecturalDirective: (workflowId: string, directive: string) =>
      sharedWorkspaceContext.addArchitecturalDirective(workflowId, directive),

    getSharedContext: (workflowId: string) => sharedWorkspaceContext.getOrCreateContext(workflowId),

    streamSubtaskTokens: async (
      companyId: string,
      workflowId: string,
      subtaskId: string,
      tokens: { inputTokens: number; outputTokens: number },
    ) => multiAgentOrchestrator.streamSubtaskTokensAsync(companyId, workflowId, subtaskId, tokens, db),

    requestBudgetOverride: async (workflowId: string, reason?: string, amountUsd?: number) =>
      multiAgentOrchestrator.requestBudgetOverrideAsync(workflowId, reason, amountUsd, db),

    resolveBudgetOverride: async (workflowId: string, approved: boolean) =>
      multiAgentOrchestrator.resolveBudgetOverrideAsync(workflowId, approved, db),
  };
}
