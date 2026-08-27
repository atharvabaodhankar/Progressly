import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from ai-worker or monorepo root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export function getBedrockRuntimeClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'ap-south-1';

  const clientConfig: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  } = {
    region,
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && {
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }),
    };
  }

  return new BedrockRuntimeClient(clientConfig);
}

export const bedrockRuntimeClient = getBedrockRuntimeClient();

export const BEDROCK_EXTRACTION_MODEL_ID =
  process.env.BEDROCK_EXTRACTION_MODEL_ID || 'apac.amazon.nova-micro-v1:0';
export const BEDROCK_EMBEDDING_MODEL_ID =
  process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';
