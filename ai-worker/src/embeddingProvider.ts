/**
 * ============================================================================
 * EMBEDDING PROVIDER ABSTRACTION
 * ============================================================================
 * ARCHITECTURE NOTE:
 * The production architecture specifies Amazon Bedrock Titan Text Embeddings V2
 * (1024 dimensions) for cosine similarity candidate retrieval in pgvector.
 *
 * While AWS Bedrock quota approval is pending, a local open-source transformer
 * model (Xenova/all-MiniLM-L6-v2, 384 dimensions) is used as a drop-in provider
 * running 100% locally in Node.js.
 *
 * Switching back to Titan V2 only requires setting EMBEDDING_PROVIDER=bedrock
 * and re-running the schedule embedding script.
 * ============================================================================
 */

import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from './bedrockClient';
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface IEmbeddingProvider {
  name: string;
  dimension: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Local Open-Source Transformer Embedding Provider (384 dimensions).
 * Runs completely locally without external API dependencies.
 */
export class LocalTransformerEmbeddingProvider implements IEmbeddingProvider {
  public name = 'Local Transformer (Xenova/all-MiniLM-L6-v2)';
  public dimension = 384;
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      });
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const t of texts) {
      const vec = await this.embed(t);
      results.push(vec);
    }
    return results;
  }
}

/**
 * Amazon Bedrock Titan Text Embeddings V2 Provider (1024 dimensions).
 */
export class BedrockTitanEmbeddingProvider implements IEmbeddingProvider {
  public name = 'Amazon Bedrock Titan Text Embeddings V2';
  public dimension = 1024;
  private modelId: string;

  constructor() {
    this.modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';
  }

  async embed(text: string): Promise<number[]> {
    const client = getBedrockRuntimeClient();
    const payload = {
      inputText: text,
      dimensions: 1024,
      normalize: true,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const t of texts) {
      results.push(await this.embed(t));
    }
    return results;
  }
}

/**
 * Factory function to retrieve the configured embedding provider.
 */
export function getEmbeddingProvider(): IEmbeddingProvider {
  const providerType = (process.env.EMBEDDING_PROVIDER || '').toLowerCase().trim();

  if (providerType === 'bedrock') {
    return new BedrockTitanEmbeddingProvider();
  }

  // Default to local transformer provider while Bedrock quota is pending
  const localProvider = new LocalTransformerEmbeddingProvider();
  return localProvider;
}

/**
 * Unified embed helper.
 */
export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  return provider.embed(text);
}
