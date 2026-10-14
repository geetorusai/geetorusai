CREATE TABLE IF NOT EXISTS "memory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"scope" text DEFAULT 'company' NOT NULL,
	"scope_id" text,
	"type" text DEFAULT 'fact' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_by" text DEFAULT 'human' NOT NULL,
	"created_by_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "memory_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"memory_item_id" uuid NOT NULL REFERENCES "memory_items"("id") ON DELETE cascade,
	"provider" text DEFAULT 'local' NOT NULL,
	"model" text DEFAULT 'local-fallback' NOT NULL,
	"embedding" jsonb NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "memory_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id"),
	"run_id" uuid REFERENCES "heartbeat_runs"("id") ON DELETE set null,
	"issue_id" uuid REFERENCES "issues"("id") ON DELETE set null,
	"memory_item_id" uuid NOT NULL REFERENCES "memory_items"("id") ON DELETE cascade,
	"score" real DEFAULT 1 NOT NULL,
	"injected_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "company_memory_settings" (
	"company_id" uuid PRIMARY KEY REFERENCES "companies"("id") NOT NULL,
	"write_policy" text DEFAULT 'auto_save' NOT NULL,
	"injection_token_budget" integer DEFAULT 2000 NOT NULL,
	"similarity_threshold" real DEFAULT 0.7 NOT NULL,
	"dedup_threshold" real DEFAULT 0.88 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "memory_items_company_status_idx" ON "memory_items" ("company_id", "status");
CREATE INDEX IF NOT EXISTS "memory_items_company_scope_idx" ON "memory_items" ("company_id", "scope", "scope_id");
CREATE INDEX IF NOT EXISTS "memory_items_company_type_idx" ON "memory_items" ("company_id", "type");
CREATE INDEX IF NOT EXISTS "memory_items_created_at_idx" ON "memory_items" ("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "memory_embeddings_company_item_idx" ON "memory_embeddings" ("company_id", "memory_item_id");
CREATE INDEX IF NOT EXISTS "memory_usages_company_run_idx" ON "memory_usages" ("company_id", "run_id");
CREATE INDEX IF NOT EXISTS "memory_usages_company_item_idx" ON "memory_usages" ("company_id", "memory_item_id");
