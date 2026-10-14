export type TaskComplexity = "low" | "medium" | "high";

export type CollaborativeRole =
  | "planner"
  | "researcher"
  | "implementer"
  | "integrator"
  | "tester"
  | "reviewer"
  | "documenter"
  | "coordinator";

export type CollaborationExecutionStrategy = "single_agent" | "multi_agent_collaborative";

export type CollaborativeSubtaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed";

export type CollaborationWorkflowStatus =
  | "analyzing"
  | "planned"
  | "in_progress"
  | "paused"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskWorkload {
  estimatedHours: number;
  estimatedTokens: number;
  points: number;
  subtaskCount: number;
}

export interface PlannedSubtask {
  id: string;
  title: string;
  description: string;
  role: CollaborativeRole;
  requiredSkills: string[];
  estimatedTokens: number;
  dependencies: string[];
  targetFiles: string[];
  acceptanceCriteria: string[];
}

export interface TaskAnalysisResult {
  taskId: string;
  taskTitle: string;
  complexity: TaskComplexity;
  workload: TaskWorkload;
  recommendedStrategy: CollaborationExecutionStrategy;
  rationale: string;
  requiredSkills: string[];
  requiredTools: string[];
  estimatedCostUsd: number;
  plannedSubtasks: PlannedSubtask[];
}

export interface CollaborativeSubtask {
  id: string;
  title: string;
  description: string;
  role: CollaborativeRole;
  status: CollaborativeSubtaskStatus;
  requiredSkills: string[];
  dependencies: string[];
  targetFiles: string[];
  acceptanceCriteria: string[];
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  assignedAgentRole: string | null;
  assignedModel: string | null;
  subtaskIssueId: string | null;
  gitBranch?: string | null;
  executionWorkspaceId?: string | null;
  isSynthesizedSpecialist?: boolean;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
  outputNotes: string | null;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  estimatedTokens: number;
}

export interface CollaborationLogEntry {
  id: string;
  timestamp: string;
  agentId: string | null;
  agentName: string | null;
  role: CollaborativeRole | "orchestrator";
  level: "info" | "warn" | "error" | "success";
  message: string;
  subtaskId?: string;
}

export interface CollaborationSharedContext {
  architecturalNotes: string[];
  sharedSchemasAndContracts: Record<string, string>;
  fileLocks: Record<string, { agentId: string; subtaskId: string; lockedAt: string }>;
  findings: Array<{ agentId: string; role: string; topic: string; content: string; timestamp: string }>;
  blockers: Array<{ subtaskId: string; description: string; resolved: boolean }>;
}

export interface CollaborationVerificationResult {
  verified: boolean;
  testsPassed: boolean;
  lintPassed: boolean;
  integrationIssues: string[];
  verificationNotes: string;
}

export interface CollaborationTokenStreamEvent {
  workflowId: string;
  subtaskId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: string;
}

export interface CollaborationWorkflow {
  id: string;
  companyId: string;
  parentIssueId: string;
  strategy: CollaborationExecutionStrategy;
  status: CollaborationWorkflowStatus;
  concurrencyLimit: number;
  totalEstimatedCostUsd: number;
  totalTokensUsed: number;
  budgetPolicyState?: "normal" | "throttled" | "awaiting_approval" | "paused";
  budgetOverrideRequested?: boolean;
  subtasks: CollaborativeSubtask[];
  sharedContext: CollaborationSharedContext;
  verification: CollaborationVerificationResult | null;
  finalConsolidatedOutput: string | null;
  logs: CollaborationLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCollaborationSettings {
  maxParallelAgents: number;
  taskBudgetUsd: number;
  tokenBudgetPerTask: number;
  autoDecompositionEnabled: boolean;
  preferredPlannerModel?: string;
  preferredImplementerModel?: string;
  preferredTestingModel?: string;
}

