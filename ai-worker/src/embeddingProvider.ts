/**
 * ============================================================================
 * EMBEDDING PROVIDER — Amazon Bedrock Titan Text Embeddings V2 (1024 dims)
 * ============================================================================
 */

import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from './bedrockClient';
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
  return new BedrockTitanEmbeddingProvider();
}

/**
 * Unified embed helper.
 */
export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  return provider.embed(text);
}
