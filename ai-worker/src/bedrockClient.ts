import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from ai-worker or monorepo root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export function getBedrockRuntimeClient(): BedrockRuntimeClient {
  const region = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId = process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.BEDROCK_AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    console.log(`[BridgeIQ AI-Worker] Initializing Bedrock Runtime Client in region ${region} with explicit cross-account credentials`);
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken && { sessionToken }),
      },
    });
  }

  console.log(`[BridgeIQ AI-Worker] Initializing Bedrock Runtime Client in region ${region} with default provider`);
  return new BedrockRuntimeClient({ region });
}

export const bedrockRuntimeClient = getBedrockRuntimeClient();

export const BEDROCK_EXTRACTION_MODEL_ID =
  process.env.BEDROCK_EXTRACTION_MODEL_ID || 'apac.amazon.nova-micro-v1:0';
export const BEDROCK_EMBEDDING_MODEL_ID =
  process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';
