ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "conversation_scope" text DEFAULT 'agent';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issues_conversation_scope_idx" ON "issues" ("company_id", "conversation_scope", "conversation_agent_id");
