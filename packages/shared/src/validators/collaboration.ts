import { z } from "zod";

export const taskComplexityEnum = z.enum(["low", "medium", "high"]);
export const collaborativeRoleEnum = z.enum([
  "planner",
  "researcher",
  "implementer",
  "integrator",
  "tester",
  "reviewer",
  "documenter",
  "coordinator",
]);
export const collaborationExecutionStrategyEnum = z.enum([
  "single_agent",
  "multi_agent_collaborative",
]);
export const collaborativeSubtaskStatusEnum = z.enum([
  "pending",
  "assigned",
  "in_progress",
  "blocked",
  "completed",
  "failed",
]);
export const collaborationWorkflowStatusEnum = z.enum([
  "analyzing",
  "planned",
  "in_progress",
  "paused",
  "verifying",
  "completed",
  "failed",
  "cancelled",
]);

export const analyzeTaskInputSchema = z.object({
  taskId: z.string().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().default(""),
  context: z.string().optional(),
});

export const createWorkflowInputSchema = z.object({
  issueId: z.string().min(1, "Issue ID is required"),
  strategy: collaborationExecutionStrategyEnum.optional(),
  concurrencyLimit: z.number().int().min(1).max(16).optional(),
  tokenBudget: z.number().int().min(1000).optional(),
});

export const updateSubtaskStatusInputSchema = z.object({
  status: collaborativeSubtaskStatusEnum,
  output: z.string().optional(),
  error: z.string().optional(),
  tokensUsed: z.number().int().min(0).optional(),
});

export const claimFileLockInputSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  subtaskId: z.string().min(1, "Subtask ID is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  reason: z.string().optional(),
});

export const releaseFileLockInputSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  agentId: z.string().min(1, "Agent ID is required"),
});

export const updateCollaborationSettingsInputSchema = z.object({
  maxParallelAgents: z.number().int().min(1).max(16).optional(),
  taskBudgetUsd: z.number().min(0).optional(),
  tokenBudgetPerTask: z.number().int().min(1000).optional(),
  autoDecompositionEnabled: z.boolean().optional(),
  preferredPlannerModel: z.string().optional(),
  preferredImplementerModel: z.string().optional(),
  preferredTestingModel: z.string().optional(),
});

export const addSharedContractInputSchema = z.object({
  contractName: z.string().min(1, "Contract name is required"),
  schemaContent: z.string().min(1, "Schema content is required"),
});

export const addArchitecturalDirectiveInputSchema = z.object({
  directive: z.string().min(1, "Directive is required"),
});

export type AnalyzeTaskInput = z.infer<typeof analyzeTaskInputSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowInputSchema>;
export type UpdateSubtaskStatusInput = z.infer<typeof updateSubtaskStatusInputSchema>;
export type ClaimFileLockInput = z.infer<typeof claimFileLockInputSchema>;
export type ReleaseFileLockInput = z.infer<typeof releaseFileLockInputSchema>;
export type UpdateCollaborationSettingsInput = z.infer<typeof updateCollaborationSettingsInputSchema>;
export type AddSharedContractInput = z.infer<typeof addSharedContractInputSchema>;
export type AddArchitecturalDirectiveInput = z.infer<typeof addArchitecturalDirectiveInputSchema>;
