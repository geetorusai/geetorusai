export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
  getModelName(): string;
}

export class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {
  private readonly dimension = 64;

  public async embed(text: string): Promise<number[]> {
    return this.generateVector(text);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateVector(t));
  }

  public getDimension(): number {
    return this.dimension;
  }

  public getModelName(): string {
    return "local-deterministic-64d";
  }

  private generateVector(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (tokens.length === 0) {
      vector[0] = 1.0;
      return vector;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      let hash = 5381;
      for (let j = 0; j < token.length; j++) {
        hash = (hash * 33) ^ token.charCodeAt(j);
      }

      const idx = Math.abs(hash) % this.dimension;
      const weight = 1.0 / Math.log2(i + 3);
      vector[idx] += weight;

      // Also hash character bigrams for subword robustness
      if (token.length >= 2) {
        for (let b = 0; b < token.length - 1; b++) {
          const bigram = token.slice(b, b + 2);
          const bHash = Math.abs((bigram.charCodeAt(0) << 8) | bigram.charCodeAt(1)) % this.dimension;
          vector[bHash] += weight * 0.35;
        }
      }
    }

    // L2 Normalization
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] /= norm;
      }
    } else {
      vector[0] = 1.0;
    }

    return vector;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, dot / denom));
}

let activeEmbeddingProvider: EmbeddingProvider = new LocalDeterministicEmbeddingProvider();

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  activeEmbeddingProvider = provider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return activeEmbeddingProvider;
}
