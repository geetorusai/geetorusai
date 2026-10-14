import { api } from "./client";
import type {
  CompanyMemorySettings,
  HybridSearchQuery,
  MemoryInjectionContext,
  MemoryItem,
  MemorySearchResult,
  MergeMemoriesInput,
  ProposeMemoryInput,
} from "@geetorusai/shared";

export const memoryApi = {
  listMemories: (
    companyId: string,
    filters?: {
      scope?: string;
      scopeId?: string;
      type?: string;
      status?: string;
      tag?: string;
      limit?: number;
    },
  ) => {
    const searchParams = new URLSearchParams();
    if (filters?.scope) searchParams.set("scope", filters.scope);
    if (filters?.scopeId) searchParams.set("scopeId", filters.scopeId);
    if (filters?.type) searchParams.set("type", filters.type);
    if (filters?.status) searchParams.set("status", filters.status);
    if (filters?.tag) searchParams.set("tag", filters.tag);
    if (filters?.limit) searchParams.set("limit", String(filters.limit));
    const qs = searchParams.toString();
    return api.get<MemoryItem[]>(`/companies/${companyId}/memories${qs ? `?${qs}` : ""}`);
  },

  getMemory: (companyId: string, id: string) =>
    api.get<MemoryItem>(`/companies/${companyId}/memories/${id}`),

  createMemory: (
    companyId: string,
    data: {
      title: string;
      content: string;
      scope?: string;
      scopeId?: string | null;
      type?: string;
      tags?: string[];
      confidence?: number;
      expiresAt?: string | null;
    },
  ) =>
    api.post<{ memory: MemoryItem; duplicates: { hasDuplicate: boolean; duplicates: Array<{ item: MemoryItem; similarity: number }> } }>(
      `/companies/${companyId}/memories`,
      data,
    ),

  updateMemory: (companyId: string, id: string, updates: Partial<MemoryItem>) =>
    api.put<MemoryItem>(`/companies/${companyId}/memories/${id}`, updates),

  deleteMemory: (companyId: string, id: string) =>
    api.delete<{ success: boolean; memory: MemoryItem }>(
      `/companies/${companyId}/memories/${id}`,
    ),

  searchMemories: (companyId: string, query: HybridSearchQuery) =>
    api.post<MemorySearchResult[]>(`/companies/${companyId}/memories/search`, query),

  proposeMemory: (companyId: string, proposal: ProposeMemoryInput) =>
    api.post<{ status: "saved" | "pending_approval" | "rejected_by_policy"; memory: MemoryItem | null }>(
      `/companies/${companyId}/memories/propose`,
      proposal,
    ),

  approveMemory: (companyId: string, id: string) =>
    api.post<MemoryItem>(`/companies/${companyId}/memories/${id}/approve`, {}),

  rejectMemory: (companyId: string, id: string) =>
    api.post<MemoryItem>(`/companies/${companyId}/memories/${id}/reject`, {}),

  mergeMemories: (companyId: string, input: MergeMemoriesInput) =>
    api.post<{ survivor: MemoryItem | null; supersededCount: number }>(
      `/companies/${companyId}/memories/merge`,
      input,
    ),

  importMarkdown: (
    companyId: string,
    data: {
      markdownText: string;
      defaultScope?: string;
      defaultScopeId?: string;
      defaultType?: string;
      defaultTags?: string[];
    },
  ) =>
    api.post<{ importedCount: number; items: MemoryItem[] }>(
      `/companies/${companyId}/memories/import`,
      data,
    ),

  exportMarkdownUrl: (companyId: string) =>
    `/api/companies/${companyId}/memories/export`,

  injectMemories: (
    companyId: string,
    data: {
      query: string;
      projectId?: string | null;
      agentId?: string | null;
      issueId?: string | null;
      runId?: string | null;
      tokenBudget?: number;
    },
  ) =>
    api.post<MemoryInjectionContext>(`/companies/${companyId}/memories/inject`, data),

  getRunMemories: (companyId: string, runId: string) =>
    api.get<Array<{ id: string; memoryItemId: string; score: number; injectedTokens: number; item: MemoryItem | null }>>(
      `/companies/${companyId}/runs/${runId}/memories`,
    ),

  getSettings: (companyId: string) =>
    api.get<CompanyMemorySettings>(`/companies/${companyId}/memories/settings`),

  updateSettings: (companyId: string, settings: Partial<CompanyMemorySettings>) =>
    api.put<CompanyMemorySettings>(`/companies/${companyId}/memories/settings`, settings),
};
