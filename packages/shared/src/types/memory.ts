export type MemoryScope = "company" | "project" | "agent" | "issue";

export type MemoryType =
  | "fact"
  | "decision"
  | "preference"
  | "document-chunk"
  | "lesson";

export type MemorySource = "task" | "comment" | "manual" | "import";

export type MemoryStatus =
  | "active"
  | "pending_approval"
  | "archived"
  | "superseded";

export type MemoryWritePolicy = "auto_save" | "require_approval" | "off";

export type MemoryCreatedBy = "human" | "agent";

export interface MemoryItem {
  id: string;
  companyId: string;
  scope: MemoryScope;
  scopeId: string | null;
  type: MemoryType;
  title: string;
  content: string;
  source: MemorySource;
  tags: string[];
  confidence: number;
  createdBy: MemoryCreatedBy;
  createdById: string | null;
  status: MemoryStatus;
  supersedesId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEmbedding {
  id: string;
  companyId: string;
  memoryItemId: string;
  provider: string;
  model: string;
  embedding: number[];
  tokenCount: number;
  createdAt: string;
}

export interface MemoryUsage {
  id: string;
  companyId: string;
  runId: string | null;
  issueId: string | null;
  memoryItemId: string;
  score: number;
  injectedTokens: number;
  createdAt: string;
  memoryItem?: MemoryItem;
}

export interface CompanyMemorySettings {
  companyId: string;
  writePolicy: MemoryWritePolicy;
  injectionTokenBudget: number;
  similarityThreshold: number;
  dedupThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemorySearchResult {
  item: MemoryItem;
  score: number;
  keywordScore: number;
  vectorScore: number;
  highlight?: string;
}

export interface HybridSearchQuery {
  query: string;
  scope?: MemoryScope;
  scopeId?: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  minScore?: number;
  status?: MemoryStatus;
}

export interface ProposeMemoryInput {
  scope?: MemoryScope;
  scopeId?: string;
  type?: MemoryType;
  title: string;
  content: string;
  tags?: string[];
  confidence?: number;
  source?: MemorySource;
  sourceId?: string;
}

export interface MergeMemoriesInput {
  survivorId: string;
  duplicateIds: string[];
  mergedTitle?: string;
  mergedContent?: string;
  mergedTags?: string[];
}

export interface MemoryInjectionContext {
  injectedItems: MemoryItem[];
  formattedContext: string;
  totalTokens: number;
}

export interface BulkImportMemoryInput {
  markdownOrText: string;
  defaultScope?: MemoryScope;
  defaultScopeId?: string;
  defaultType?: MemoryType;
  defaultTags?: string[];
}
