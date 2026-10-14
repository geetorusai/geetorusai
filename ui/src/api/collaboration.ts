import { api } from "./client";
import type {
  CollaborationWorkflow,
  CompanyCollaborationSettings,
  TaskAnalysisResult,
} from "@geetorusai/shared";

export const collaborationApi = {
  analyzeTask: (companyId: string, issueId: string) =>
    api.post<TaskAnalysisResult>(
      `/companies/${companyId}/issues/${issueId}/collaboration/analyze`,
      {},
    ),

  planWorkflow: (
    companyId: string,
    issueId: string,
    options?: { concurrencyLimit?: number; strategy?: string },
  ) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/plan`,
      options ?? {},
    ),

  getWorkflow: (companyId: string, issueId: string) =>
    api.get<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration`,
    ),

  startWorkflow: (companyId: string, issueId: string) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/start`,
      {},
    ),

  pauseWorkflow: (companyId: string, issueId: string) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/pause`,
      {},
    ),

  resumeWorkflow: (companyId: string, issueId: string) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/resume`,
      {},
    ),

  cancelWorkflow: (companyId: string, issueId: string) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/cancel`,
      {},
    ),

  completeSubtask: (
    companyId: string,
    issueId: string,
    subtaskId: string,
    body?: { outputNotes?: string; tokenUsage?: { inputTokens: number; outputTokens: number } },
  ) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/subtasks/${subtaskId}/complete`,
      body ?? {},
    ),

  retrySubtask: (companyId: string, issueId: string, subtaskId: string) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/subtasks/${subtaskId}/retry`,
      {},
    ),

  reassignSubtask: (
    companyId: string,
    issueId: string,
    subtaskId: string,
    data: { agentId: string; agentName?: string; agentRole?: string },
  ) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/subtasks/${subtaskId}/reassign`,
      data,
    ),

  getSettings: (companyId: string) =>
    api.get<CompanyCollaborationSettings>(
      `/companies/${companyId}/collaboration/settings`,
    ),

  updateSettings: (companyId: string, settings: Partial<CompanyCollaborationSettings>) =>
    api.put<CompanyCollaborationSettings>(
      `/companies/${companyId}/collaboration/settings`,
      settings,
    ),

  requestBudgetOverride: (companyId: string, issueId: string, data?: { reason?: string; amountUsd?: number }) =>
    api.post<CollaborationWorkflow>(
      `/companies/${companyId}/issues/${issueId}/collaboration/budget-override`,
      data ?? {},
    ),

  streamTokens: (
    companyId: string,
    issueId: string,
    subtaskId: string,
    tokens: { inputTokens: number; outputTokens: number },
  ) =>
    api.post<{ totalWorkflowTokens: number; subtaskTokens: { inputTokens: number; outputTokens: number; totalTokens: number } }>(
      `/companies/${companyId}/issues/${issueId}/collaboration/subtasks/${subtaskId}/stream-tokens`,
      tokens,
    ),
};
