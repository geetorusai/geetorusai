import type { MemoryItem } from "@geetorusai/shared";
import { cosineSimilarity, getEmbeddingProvider } from "./embedding-provider.js";
import type { MemoryWithEmbedding } from "./hybrid-retriever.js";

export interface DuplicateDetectionResult {
  hasDuplicate: boolean;
  duplicates: Array<{
    item: MemoryItem;
    similarity: number;
  }>;
}

export class MemoryDedupService {
  public async detectDuplicates(
    newTitle: string,
    newContent: string,
    existingItems: MemoryWithEmbedding[],
    threshold: number = 0.88,
  ): Promise<DuplicateDetectionResult> {
    const textToCompare = `${newTitle}\n${newContent}`.trim();
    const newVector = await getEmbeddingProvider().embed(textToCompare);

    const matches: Array<{ item: MemoryItem; similarity: number }> = [];

    for (const { item, embedding } of existingItems) {
      if (item.status !== "active") continue;

      const similarity = cosineSimilarity(newVector, embedding);
      if (similarity >= threshold) {
        matches.push({
          item,
          similarity: Number(similarity.toFixed(4)),
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      hasDuplicate: matches.length > 0,
      duplicates: matches,
    };
  }
}

export const memoryDedupService = new MemoryDedupService();
