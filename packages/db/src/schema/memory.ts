import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { companies } from "./companies.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { issues } from "./issues.js";

export const memoryItems = pgTable(
  "memory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    scope: text("scope").notNull().default("company"), // "company" | "project" | "agent" | "issue"
    scopeId: text("scope_id"), // project_id, agent_id, or issue_id
    type: text("type").notNull().default("fact"), // "fact" | "decision" | "preference" | "document-chunk" | "lesson"
    title: text("title").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull().default("manual"), // "task" | "comment" | "manual" | "import"
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    confidence: real("confidence").notNull().default(1.0),
    createdBy: text("created_by").notNull().default("human"), // "human" | "agent"
    createdById: text("created_by_id"),
    status: text("status").notNull().default("active"), // "active" | "pending_approval" | "archived" | "superseded"
    supersedesId: uuid("supersedes_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("memory_items_company_status_idx").on(table.companyId, table.status),
    companyScopeIdx: index("memory_items_company_scope_idx").on(table.companyId, table.scope, table.scopeId),
    companyTypeIdx: index("memory_items_company_type_idx").on(table.companyId, table.type),
    createdAtIdx: index("memory_items_created_at_idx").on(table.companyId, table.createdAt),
  }),
);

export const memoryEmbeddings = pgTable(
  "memory_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    memoryItemId: uuid("memory_item_id").notNull().references(() => memoryItems.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("local"),
    model: text("model").notNull().default("local-fallback"),
    embedding: jsonb("embedding").$type<number[]>().notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyItemIdx: index("memory_embeddings_company_item_idx").on(table.companyId, table.memoryItemId),
  }),
);

export const memoryUsages = pgTable(
  "memory_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    runId: uuid("run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    memoryItemId: uuid("memory_item_id").notNull().references(() => memoryItems.id, { onDelete: "cascade" }),
    score: real("score").notNull().default(1.0),
    injectedTokens: integer("injected_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyRunIdx: index("memory_usages_company_run_idx").on(table.companyId, table.runId),
    companyItemIdx: index("memory_usages_company_item_idx").on(table.companyId, table.memoryItemId),
  }),
);

export const companyMemorySettings = pgTable(
  "company_memory_settings",
  {
    companyId: uuid("company_id").primaryKey().references(() => companies.id),
    writePolicy: text("write_policy").notNull().default("auto_save"), // "auto_save" | "require_approval" | "off"
    injectionTokenBudget: integer("injection_token_budget").notNull().default(2000),
    similarityThreshold: real("similarity_threshold").notNull().default(0.70),
    dedupThreshold: real("dedup_threshold").notNull().default(0.88),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
