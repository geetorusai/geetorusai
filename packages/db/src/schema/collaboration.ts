import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

export const collaborationWorkflows = pgTable(
  "collaboration_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("analyzing"),
    complexity: text("complexity").notNull().default("low"),
    executionStrategy: text("execution_strategy").notNull().default("single_agent"),
    analysis: jsonb("analysis").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    allocatedAgents: jsonb("allocated_agents").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    tokenBudget: integer("token_budget").notNull().default(100000),
    tokensUsed: integer("tokens_used").notNull().default(0),
    activeParallelAgents: integer("active_parallel_agents").notNull().default(0),
    maxParallelAgents: integer("max_parallel_agents").notNull().default(4),
    verificationStatus: text("verification_status").notNull().default("pending"),
    verificationReport: jsonb("verification_report").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIssueIdx: index("collaboration_workflows_company_issue_idx").on(table.companyId, table.issueId),
    companyStatusIdx: index("collaboration_workflows_company_status_idx").on(table.companyId, table.status),
    issueUq: uniqueIndex("collaboration_workflows_issue_uq").on(table.companyId, table.issueId),
  }),
);

export const collaborationSubtasks = pgTable(
  "collaboration_subtasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    workflowId: uuid("workflow_id").notNull().references(() => collaborationWorkflows.id, { onDelete: "cascade" }),
    subtaskId: text("subtask_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assignedAgentId: uuid("assigned_agent_id").references(() => agents.id, { onDelete: "set null" }),
    role: text("role").notNull().default("lead_architect"),
    status: text("status").notNull().default("pending"),
    dependencies: jsonb("dependencies").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    requiredSkills: jsonb("required_skills").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    modelTier: text("model_tier").notNull().default("standard"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    tokenBudget: integer("token_budget").notNull().default(20000),
    childIssueId: uuid("child_issue_id").references(() => issues.id, { onDelete: "set null" }),
    gitBranch: text("git_branch"),
    executionWorkspaceId: uuid("execution_workspace_id"),
    output: text("output"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyWorkflowIdx: index("collaboration_subtasks_company_workflow_idx").on(table.companyId, table.workflowId),
    companyStatusIdx: index("collaboration_subtasks_company_status_idx").on(table.companyId, table.status),
    agentAssignedIdx: index("collaboration_subtasks_agent_assigned_idx").on(table.companyId, table.assignedAgentId),
    workflowSubtaskUq: uniqueIndex("collaboration_subtasks_workflow_subtask_uq").on(table.workflowId, table.subtaskId),
  }),
);

export const collaborationSharedContexts = pgTable(
  "collaboration_shared_contexts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    workflowId: uuid("workflow_id").notNull().references(() => collaborationWorkflows.id, { onDelete: "cascade" }),
    fileLocks: jsonb("file_locks").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sharedContracts: jsonb("shared_contracts").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    architecturalDirectives: jsonb("architectural_directives").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    projectedContext: text("projected_context"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyWorkflowIdx: index("collaboration_shared_contexts_company_workflow_idx").on(table.companyId, table.workflowId),
    workflowUq: uniqueIndex("collaboration_shared_contexts_workflow_uq").on(table.workflowId),
  }),
);

export const companyCollaborationSettings = pgTable(
  "company_collaboration_settings",
  {
    companyId: uuid("company_id").primaryKey().references(() => companies.id, { onDelete: "cascade" }),
    autoCollaborationEnabled: boolean("auto_collaboration_enabled").notNull().default(true),
    defaultMaxParallelAgents: integer("default_max_parallel_agents").notNull().default(4),
    costThresholdDollars: text("cost_threshold_dollars").notNull().default("10.00"),
    requireApprovalForMultiAgent: boolean("require_approval_for_multi_agent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
