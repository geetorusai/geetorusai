CREATE TABLE IF NOT EXISTS "collaboration_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"issue_id" uuid NOT NULL REFERENCES "issues"("id") ON DELETE cascade,
	"status" text DEFAULT 'analyzing' NOT NULL,
	"complexity" text DEFAULT 'low' NOT NULL,
	"execution_strategy" text DEFAULT 'single_agent' NOT NULL,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"allocated_agents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"token_budget" integer DEFAULT 100000 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"active_parallel_agents" integer DEFAULT 0 NOT NULL,
	"max_parallel_agents" integer DEFAULT 4 NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_report" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_workflows_company_issue_idx" ON "collaboration_workflows" ("company_id", "issue_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_workflows_company_status_idx" ON "collaboration_workflows" ("company_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_workflows_issue_uq" ON "collaboration_workflows" ("company_id", "issue_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collaboration_subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"workflow_id" uuid NOT NULL REFERENCES "collaboration_workflows"("id") ON DELETE cascade,
	"subtask_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assigned_agent_id" uuid REFERENCES "agents"("id") ON DELETE set null,
	"role" text DEFAULT 'lead_architect' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_tier" text DEFAULT 'standard' NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"token_budget" integer DEFAULT 20000 NOT NULL,
	"child_issue_id" uuid REFERENCES "issues"("id") ON DELETE set null,
	"git_branch" text,
	"execution_workspace_id" uuid,
	"output" text,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_subtasks_company_workflow_idx" ON "collaboration_subtasks" ("company_id", "workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_subtasks_company_status_idx" ON "collaboration_subtasks" ("company_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_subtasks_agent_assigned_idx" ON "collaboration_subtasks" ("company_id", "assigned_agent_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_subtasks_workflow_subtask_uq" ON "collaboration_subtasks" ("workflow_id", "subtask_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collaboration_shared_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"workflow_id" uuid NOT NULL REFERENCES "collaboration_workflows"("id") ON DELETE cascade,
	"file_locks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shared_contracts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"architectural_directives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projected_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collaboration_shared_contexts_company_workflow_idx" ON "collaboration_shared_contexts" ("company_id", "workflow_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_shared_contexts_workflow_uq" ON "collaboration_shared_contexts" ("workflow_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_collaboration_settings" (
	"company_id" uuid PRIMARY KEY REFERENCES "companies"("id") ON DELETE cascade NOT NULL,
	"auto_collaboration_enabled" boolean DEFAULT true NOT NULL,
	"default_max_parallel_agents" integer DEFAULT 4 NOT NULL,
	"cost_threshold_dollars" text DEFAULT '10.00' NOT NULL,
	"require_approval_for_multi_agent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
