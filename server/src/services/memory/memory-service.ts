import { randomUUID } from "node:crypto";
import { and, eq, inArray, desc } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import {
  memoryItems,
  memoryEmbeddings,
  memoryUsages,
  companyMemorySettings,
} from "@geetorusai/db";
import { redactSensitiveText } from "../../redaction.js";
import type {
  CompanyMemorySettings,
  HybridSearchQuery,
  MemoryInjectionContext,
  MemoryItem,
  MemorySearchResult,
  MergeMemoriesInput,
  ProposeMemoryInput,
} from "@geetorusai/shared";
import { getEmbeddingProvider } from "./embedding-provider.js";
import { hybridRetriever, type MemoryWithEmbedding } from "./hybrid-retriever.js";
import { memoryDedupService, type DuplicateDetectionResult } from "./dedup-service.js";
import { memoryInjectionService, type InjectionRequest } from "./injection-service.js";

export class MemoryService {
  private inMemoryCache = new Map<string, MemoryWithEmbedding>();
  private settingsCache = new Map<string, CompanyMemorySettings>();

  private defaultSettings: CompanyMemorySettings = {
    companyId: "",
    writePolicy: "auto_save",
    injectionTokenBudget: 2000,
    similarityThreshold: 0.7,
    dedupThreshold: 0.88,
  };

  public async getSettings(companyId: string, db?: Db): Promise<CompanyMemorySettings> {
    const cached = this.settingsCache.get(companyId);
    if (cached) return { ...cached };

    if (db && typeof db.select === "function") {
      try {
        const rows = await db
          .select()
          .from(companyMemorySettings)
          .where(eq(companyMemorySettings.companyId, companyId))
          .limit(1);
        if (rows.length > 0) {
          const row = rows[0]!;
          const s: CompanyMemorySettings = {
            companyId: row.companyId,
            writePolicy: row.writePolicy as CompanyMemorySettings["writePolicy"],
            injectionTokenBudget: row.injectionTokenBudget,
            similarityThreshold: row.similarityThreshold,
            dedupThreshold: row.dedupThreshold,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          };
          this.settingsCache.set(companyId, s);
          return { ...s };
        }
      } catch {}
    }

    const initial: CompanyMemorySettings = {
      ...this.defaultSettings,
      companyId,
    };
    this.settingsCache.set(companyId, initial);
    return { ...initial };
  }

  public async updateSettings(
    companyId: string,
    updates: Partial<CompanyMemorySettings>,
    db?: Db,
  ): Promise<CompanyMemorySettings> {
    const current = await this.getSettings(companyId, db);
    const updated: CompanyMemorySettings = {
      ...current,
      ...updates,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    this.settingsCache.set(companyId, updated);

    if (db && typeof db.insert === "function") {
      try {
        await db
          .insert(companyMemorySettings)
          .values({
            companyId,
            writePolicy: updated.writePolicy,
            injectionTokenBudget: updated.injectionTokenBudget,
            similarityThreshold: updated.similarityThreshold,
            dedupThreshold: updated.dedupThreshold,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: companyMemorySettings.companyId,
            set: {
              writePolicy: updated.writePolicy,
              injectionTokenBudget: updated.injectionTokenBudget,
              similarityThreshold: updated.similarityThreshold,
              dedupThreshold: updated.dedupThreshold,
              updatedAt: new Date(),
            },
          });
      } catch {}
    }

    return updated;
  }

  public async createMemory(
    companyId: string,
    data: {
      scope?: MemoryItem["scope"];
      scopeId?: string | null;
      type?: MemoryItem["type"];
      title: string;
      content: string;
      source?: MemoryItem["source"];
      tags?: string[];
      confidence?: number;
      createdBy?: MemoryItem["createdBy"];
      createdById?: string | null;
      status?: MemoryItem["status"];
      expiresAt?: string | null;
    },
    db?: Db,
  ): Promise<{ memory: MemoryItem; duplicates: DuplicateDetectionResult }> {
    // 1. Secret scrubbing
    const cleanTitle = redactSensitiveText(data.title.trim());
    const cleanContent = redactSensitiveText(data.content.trim());

    const id = randomUUID();
    const now = new Date().toISOString();

    const item: MemoryItem = {
      id,
      companyId,
      scope: data.scope ?? "company",
      scopeId: data.scopeId ?? null,
      type: data.type ?? "fact",
      title: cleanTitle,
      content: cleanContent,
      source: data.source ?? "manual",
      tags: data.tags ?? [],
      confidence: data.confidence ?? 1.0,
      createdBy: data.createdBy ?? "human",
      createdById: data.createdById ?? null,
      status: data.status ?? "active",
      supersedesId: null,
      expiresAt: data.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Compute embedding
    const textToEmbed = `${item.title}\n${item.content}`;
    const embedding = await getEmbeddingProvider().embed(textToEmbed);

    // 3. Duplicate detection
    const existing = await this.loadCandidates(companyId, db);
    const settings = await this.getSettings(companyId, db);
    const duplicates = await memoryDedupService.detectDuplicates(
      item.title,
      item.content,
      existing,
      settings.dedupThreshold,
    );

    // 4. Cache
    this.inMemoryCache.set(id, { item, embedding });

    // 5. Persist to DB
    if (db && typeof db.insert === "function") {
      try {
        await db.insert(memoryItems).values({
          id: item.id,
          companyId: item.companyId,
          scope: item.scope,
          scopeId: item.scopeId,
          type: item.type,
          title: item.title,
          content: item.content,
          source: item.source,
          tags: item.tags,
          confidence: item.confidence,
          createdBy: item.createdBy,
          createdById: item.createdById,
          status: item.status,
          supersedesId: item.supersedesId,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        });

        await db.insert(memoryEmbeddings).values({
          companyId: item.companyId,
          memoryItemId: item.id,
          provider: getEmbeddingProvider().getModelName().startsWith("local") ? "local" : "external",
          model: getEmbeddingProvider().getModelName(),
          embedding: embedding,
          tokenCount: Math.ceil(textToEmbed.length / 4),
          createdAt: new Date(),
        });
      } catch {}
    }

    return { memory: item, duplicates };
  }

  public async proposeMemory(
    companyId: string,
    proposal: ProposeMemoryInput,
    agentId?: string | null,
    db?: Db,
  ): Promise<{ status: "saved" | "pending_approval" | "rejected_by_policy"; memory: MemoryItem | null }> {
    const settings = await this.getSettings(companyId, db);

    if (settings.writePolicy === "off") {
      return { status: "rejected_by_policy", memory: null };
    }

    const initialStatus = settings.writePolicy === "require_approval" ? "pending_approval" : "active";

    const { memory } = await this.createMemory(
      companyId,
      {
        scope: proposal.scope ?? "company",
        scopeId: proposal.scopeId ?? null,
        type: proposal.type ?? "fact",
        title: proposal.title,
        content: proposal.content,
        source: proposal.source ?? "task",
        tags: proposal.tags ?? [],
        confidence: proposal.confidence ?? 0.9,
        createdBy: "agent",
        createdById: agentId ?? null,
        status: initialStatus,
      },
      db,
    );

    return {
      status: initialStatus === "pending_approval" ? "pending_approval" : "saved",
      memory,
    };
  }

  public async updateMemory(
    companyId: string,
    id: string,
    updates: Partial<{
      title: string;
      content: string;
      scope: MemoryItem["scope"];
      scopeId: string | null;
      type: MemoryItem["type"];
      tags: string[];
      confidence: number;
      status: MemoryItem["status"];
      expiresAt: string | null;
    }>,
    db?: Db,
  ): Promise<MemoryItem | null> {
    const existing = await this.getMemory(companyId, id, db);
    if (!existing) return null;

    const cleanTitle = updates.title !== undefined ? redactSensitiveText(updates.title.trim()) : existing.title;
    const cleanContent = updates.content !== undefined ? redactSensitiveText(updates.content.trim()) : existing.content;

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      title: cleanTitle,
      content: cleanContent,
      updatedAt: new Date().toISOString(),
    };

    let newEmbedding: number[] | null = null;
    if (updates.title !== undefined || updates.content !== undefined) {
      newEmbedding = await getEmbeddingProvider().embed(`${updated.title}\n${updated.content}`);
    }

    const currentCached = this.inMemoryCache.get(id);
    this.inMemoryCache.set(id, {
      item: updated,
      embedding: newEmbedding ?? currentCached?.embedding ?? (await getEmbeddingProvider().embed(`${updated.title}\n${updated.content}`)),
    });

    if (db && typeof db.update === "function") {
      try {
        await db
          .update(memoryItems)
          .set({
            title: updated.title,
            content: updated.content,
            scope: updated.scope,
            scopeId: updated.scopeId,
            type: updated.type,
            tags: updated.tags,
            confidence: updated.confidence,
            status: updated.status,
            expiresAt: updated.expiresAt ? new Date(updated.expiresAt) : null,
            updatedAt: new Date(),
          })
          .where(and(eq(memoryItems.id, id), eq(memoryItems.companyId, companyId)));

        if (newEmbedding) {
          await db
            .update(memoryEmbeddings)
            .set({
              embedding: newEmbedding,
            })
            .where(and(eq(memoryEmbeddings.memoryItemId, id), eq(memoryEmbeddings.companyId, companyId)));
        }
      } catch {}
    }

    return updated;
  }

  public async getMemory(companyId: string, id: string, db?: Db): Promise<MemoryItem | null> {
    const cached = this.inMemoryCache.get(id);
    if (cached && cached.item.companyId === companyId) {
      return cached.item;
    }

    if (db && typeof db.select === "function") {
      try {
        const rows = await db
          .select()
          .from(memoryItems)
          .where(and(eq(memoryItems.id, id), eq(memoryItems.companyId, companyId)))
          .limit(1);

        if (rows.length > 0) {
          const row = rows[0]!;
          const item = this.mapDbRow(row);
          const embRows = await db
            .select()
            .from(memoryEmbeddings)
            .where(eq(memoryEmbeddings.memoryItemId, id))
            .limit(1);
          const embedding = (embRows[0]?.embedding as number[]) ?? (await getEmbeddingProvider().embed(`${item.title}\n${item.content}`));
          this.inMemoryCache.set(id, { item, embedding });
          return item;
        }
      } catch {}
    }

    return null;
  }

  public async listMemories(
    companyId: string,
    filters: {
      scope?: MemoryItem["scope"];
      scopeId?: string;
      type?: MemoryItem["type"];
      status?: MemoryItem["status"];
      tag?: string;
      limit?: number;
    } = {},
    db?: Db,
  ): Promise<MemoryItem[]> {
    const candidates = await this.loadCandidates(companyId, db);
    let items = candidates.map((c) => c.item);

    if (filters.status) {
      items = items.filter((i) => i.status === filters.status);
    } else {
      items = items.filter((i) => i.status !== "archived" && i.status !== "superseded");
    }

    if (filters.scope) {
      items = items.filter((i) => i.scope === filters.scope);
    }
    if (filters.scopeId) {
      items = items.filter((i) => i.scopeId === filters.scopeId);
    }
    if (filters.type) {
      items = items.filter((i) => i.type === filters.type);
    }
    if (filters.tag) {
      const targetTag = filters.tag.toLowerCase();
      items = items.filter((i) => i.tags.some((t) => t.toLowerCase() === targetTag));
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = filters.limit ?? 50;
    return items.slice(0, limit);
  }

  public async searchMemories(
    companyId: string,
    query: HybridSearchQuery,
    db?: Db,
  ): Promise<MemorySearchResult[]> {
    const candidates = await this.loadCandidates(companyId, db);
    return hybridRetriever.search(candidates, query);
  }

  public async approveMemory(companyId: string, id: string, db?: Db): Promise<MemoryItem | null> {
    return this.updateMemory(companyId, id, { status: "active" }, db);
  }

  public async rejectMemory(companyId: string, id: string, db?: Db): Promise<MemoryItem | null> {
    return this.updateMemory(companyId, id, { status: "archived" }, db);
  }

  public async mergeMemories(
    companyId: string,
    input: MergeMemoriesInput,
    db?: Db,
  ): Promise<{ survivor: MemoryItem | null; supersededCount: number }> {
    const survivor = await this.getMemory(companyId, input.survivorId, db);
    if (!survivor) return { survivor: null, supersededCount: 0 };

    let supersededCount = 0;
    for (const dupId of input.duplicateIds) {
      if (dupId === input.survivorId) continue;
      const dup = await this.getMemory(companyId, dupId, db);
      if (dup) {
        dup.status = "superseded";
        dup.supersedesId = survivor.id;
        dup.updatedAt = new Date().toISOString();
        if (db && typeof db.update === "function") {
          try {
            await db
              .update(memoryItems)
              .set({
                status: "superseded",
                supersedesId: survivor.id,
                updatedAt: new Date(),
              })
              .where(and(eq(memoryItems.id, dupId), eq(memoryItems.companyId, companyId)));
          } catch {}
        }
        supersededCount++;
      }
    }

    // Update survivor content/tags if provided
    const updatedSurvivor = await this.updateMemory(
      companyId,
      survivor.id,
      {
        title: input.mergedTitle ?? survivor.title,
        content: input.mergedContent ?? survivor.content,
        tags: input.mergedTags ?? survivor.tags,
      },
      db,
    );

    return { survivor: updatedSurvivor, supersededCount };
  }

  public async injectMemoriesForRun(
    companyId: string,
    request: InjectionRequest,
    runId?: string | null,
    db?: Db,
  ): Promise<MemoryInjectionContext> {
    const candidates = await this.loadCandidates(companyId, db);
    const settings = await this.getSettings(companyId, db);

    const injection = await memoryInjectionService.prepareInjection(candidates, {
      ...request,
      tokenBudget: request.tokenBudget ?? settings.injectionTokenBudget,
    });

    // Record usages in DB
    if (db && typeof db.insert === "function") {
      for (const item of injection.injectedItems) {
        try {
          await db.insert(memoryUsages).values({
            companyId,
            runId: runId ?? null,
            issueId: request.issueId ?? null,
            memoryItemId: item.id,
            score: 1.0,
            injectedTokens: Math.ceil(item.content.length / 4),
            createdAt: new Date(),
          });
        } catch {}
      }
    }

    return injection;
  }

  public async getMemoryUsagesForRun(
    companyId: string,
    runId: string,
    db?: Db,
  ): Promise<Array<{ id: string; memoryItemId: string; score: number; injectedTokens: number; item: MemoryItem | null }>> {
    if (db && typeof db.select === "function") {
      try {
        const rows = await db
          .select()
          .from(memoryUsages)
          .where(and(eq(memoryUsages.companyId, companyId), eq(memoryUsages.runId, runId)));

        const results = [];
        for (const row of rows) {
          const item = await this.getMemory(companyId, row.memoryItemId, db);
          results.push({
            id: row.id,
            memoryItemId: row.memoryItemId,
            score: row.score,
            injectedTokens: row.injectedTokens,
            item,
          });
        }
        return results;
      } catch {}
    }
    return [];
  }

  public async importMarkdown(
    companyId: string,
    markdownText: string,
    options: {
      defaultScope?: MemoryItem["scope"];
      defaultScopeId?: string;
      defaultType?: MemoryItem["type"];
      defaultTags?: string[];
    } = {},
    db?: Db,
  ): Promise<{ importedCount: number; items: MemoryItem[] }> {
    // Split markdown by H2/H3 headings
    const sections = markdownText.split(/\n(?=#{2,3}\s+)/);
    const imported: MemoryItem[] = [];

    for (const raw of sections) {
      const section = raw.trim();
      if (!section) continue;

      const lines = section.split("\n");
      const headerLine = lines[0] ?? "";
      const title = headerLine.replace(/^#{2,3}\s+/, "").trim() || "Imported Knowledge Note";
      const content = lines.slice(1).join("\n").trim() || title;

      const { memory } = await this.createMemory(
        companyId,
        {
          scope: options.defaultScope ?? "company",
          scopeId: options.defaultScopeId ?? null,
          type: options.defaultType ?? "document-chunk",
          title,
          content,
          source: "import",
          tags: options.defaultTags ?? ["imported"],
          confidence: 1.0,
          createdBy: "human",
          status: "active",
        },
        db,
      );

      imported.push(memory);
    }

    return { importedCount: imported.length, items: imported };
  }

  public async exportMarkdown(companyId: string, db?: Db): Promise<string> {
    const memories = await this.listMemories(companyId, { status: "active", limit: 500 }, db);

    const blocks: string[] = [
      `# Geetorus Knowledge Base Export - ${new Date().toISOString().split("T")[0]}\n`,
    ];

    for (const m of memories) {
      blocks.push(
        `## [${m.type.toUpperCase()}] ${m.title}\n` +
        `- **Scope**: ${m.scope}${m.scopeId ? ` (${m.scopeId})` : ""}\n` +
        `- **Tags**: ${m.tags.join(", ") || "none"}\n` +
        `- **Confidence**: ${m.confidence}\n` +
        `- **Source**: ${m.source}\n` +
        `- **Created**: ${m.createdAt}\n\n` +
        `${m.content}\n\n---`
      );
    }

    return blocks.join("\n\n");
  }

  private async loadCandidates(companyId: string, db?: Db): Promise<MemoryWithEmbedding[]> {
    const list: MemoryWithEmbedding[] = [];

    // From cache
    for (const cached of this.inMemoryCache.values()) {
      if (cached.item.companyId === companyId) {
        list.push(cached);
      }
    }

    // If cache has items, return
    if (list.length > 0) {
      return list;
    }

    // Load from DB
    if (db && typeof db.select === "function") {
      try {
        const rows = await db
          .select()
          .from(memoryItems)
          .where(eq(memoryItems.companyId, companyId))
          .limit(200);

        for (const row of rows) {
          const item = this.mapDbRow(row);
          const embRows = await db
            .select()
            .from(memoryEmbeddings)
            .where(eq(memoryEmbeddings.memoryItemId, item.id))
            .limit(1);

          let embedding = embRows[0]?.embedding as number[] | undefined;
          if (!embedding) {
            embedding = await getEmbeddingProvider().embed(`${item.title}\n${item.content}`);
          }
          const pair: MemoryWithEmbedding = { item, embedding };
          this.inMemoryCache.set(item.id, pair);
          list.push(pair);
        }
      } catch {}
    }

    return list;
  }

  private mapDbRow(row: any): MemoryItem {
    return {
      id: row.id,
      companyId: row.companyId,
      scope: row.scope,
      scopeId: row.scopeId,
      type: row.type,
      title: row.title,
      content: row.content,
      source: row.source,
      tags: (row.tags as string[]) ?? [],
      confidence: row.confidence,
      createdBy: row.createdBy,
      createdById: row.createdById,
      status: row.status,
      supersedesId: row.supersedesId,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}

type CompanyCollaborationSettingsFallback = CompanyMemorySettings;

export const memoryServiceInstance = new MemoryService();
export const memoryService = (db: Db) => ({
  createMemory: (companyId: string, data: Parameters<MemoryService["createMemory"]>[1]) =>
    memoryServiceInstance.createMemory(companyId, data, db),
  getMemory: (companyId: string, id: string) => memoryServiceInstance.getMemory(companyId, id, db),
  listMemories: (companyId: string, filters?: Parameters<MemoryService["listMemories"]>[1]) =>
    memoryServiceInstance.listMemories(companyId, filters, db),
  updateMemory: (companyId: string, id: string, updates: Parameters<MemoryService["updateMemory"]>[2]) =>
    memoryServiceInstance.updateMemory(companyId, id, updates, db),
  proposeMemory: (companyId: string, proposal: ProposeMemoryInput, agentId?: string | null) =>
    memoryServiceInstance.proposeMemory(companyId, proposal, agentId, db),
  approveMemory: (companyId: string, id: string) => memoryServiceInstance.approveMemory(companyId, id, db),
  rejectMemory: (companyId: string, id: string) => memoryServiceInstance.rejectMemory(companyId, id, db),
  mergeMemories: (companyId: string, input: MergeMemoriesInput) =>
    memoryServiceInstance.mergeMemories(companyId, input, db),
  searchMemories: (companyId: string, query: HybridSearchQuery) =>
    memoryServiceInstance.searchMemories(companyId, query, db),
  injectMemoriesForRun: (companyId: string, request: InjectionRequest, runId?: string | null) =>
    memoryServiceInstance.injectMemoriesForRun(companyId, request, runId, db),
  getMemoryUsagesForRun: (companyId: string, runId: string) =>
    memoryServiceInstance.getMemoryUsagesForRun(companyId, runId, db),
  importMarkdown: (companyId: string, text: string, options?: Parameters<MemoryService["importMarkdown"]>[2]) =>
    memoryServiceInstance.importMarkdown(companyId, text, options, db),
  exportMarkdown: (companyId: string) => memoryServiceInstance.exportMarkdown(companyId, db),
  getSettings: (companyId: string) => memoryServiceInstance.getSettings(companyId, db),
  updateSettings: (companyId: string, updates: Partial<CompanyMemorySettings>) =>
    memoryServiceInstance.updateSettings(companyId, updates, db),
});
