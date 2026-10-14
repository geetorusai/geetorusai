import type {
  HybridSearchQuery,
  MemoryItem,
  MemorySearchResult,
} from "@geetorusai/shared";
import { cosineSimilarity, getEmbeddingProvider } from "./embedding-provider.js";

export interface MemoryWithEmbedding {
  item: MemoryItem;
  embedding: number[];
}

export class HybridRetriever {
  public async search(
    candidates: MemoryWithEmbedding[],
    query: HybridSearchQuery,
  ): Promise<MemorySearchResult[]> {
    if (candidates.length === 0 || !query.query.trim()) {
      return [];
    }

    const queryText = query.query.toLowerCase().trim();
    const queryTokens = queryText.split(/\s+/).filter((t) => t.length > 1);
    const queryVector = await getEmbeddingProvider().embed(queryText);

    const now = new Date();
    const results: MemorySearchResult[] = [];

    for (const { item, embedding } of candidates) {
      // 1. Expiration check
      if (item.expiresAt && new Date(item.expiresAt) <= now) {
        continue;
      }

      // 2. Status filter (default active)
      if (query.status && item.status !== query.status) {
        continue;
      } else if (!query.status && item.status !== "active") {
        continue;
      }

      // 3. Scope filter
      if (query.scope && item.scope !== query.scope) {
        continue;
      }
      if (query.scopeId && item.scopeId !== query.scopeId) {
        continue;
      }

      // 4. Type filter
      if (query.type && item.type !== query.type) {
        continue;
      }

      // 5. Tags filter
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every((t) =>
          item.tags.some((itemTag) => itemTag.toLowerCase() === t.toLowerCase()),
        );
        if (!hasAllTags) {
          continue;
        }
      }

      // 6. Keyword scoring (BM25 / token matching)
      const targetText = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
      let matchCount = 0;
      let titleBonus = 0;

      for (const token of queryTokens) {
        if (targetText.includes(token)) {
          matchCount++;
          if (item.title.toLowerCase().includes(token)) {
            titleBonus += 0.2;
          }
        }
      }

      const keywordScore = queryTokens.length > 0
        ? Math.min(1.0, (matchCount / queryTokens.length) + titleBonus)
        : 0;

      // 7. Vector similarity
      const vectorScore = Math.max(0, cosineSimilarity(queryVector, embedding));

      // 8. Hybrid score with confidence weighting
      const rawHybridScore = (0.45 * keywordScore) + (0.55 * vectorScore);
      const confidence = item.confidence ?? 1.0;
      const finalScore = Number((rawHybridScore * confidence).toFixed(4));

      const minScore = query.minScore ?? 0.15;
      if (finalScore >= minScore) {
        results.push({
          item,
          score: finalScore,
          keywordScore: Number(keywordScore.toFixed(4)),
          vectorScore: Number(vectorScore.toFixed(4)),
        });
      }
    }

    // Rank descending by score
    results.sort((a, b) => b.score - a.score);

    const limit = query.limit ?? 10;
    return results.slice(0, limit);
  }
}

export const hybridRetriever = new HybridRetriever();
