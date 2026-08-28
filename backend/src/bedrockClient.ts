import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

let bedrockClientInstance: BedrockRuntimeClient | null = null;

export function getBedrockRuntimeClient(): BedrockRuntimeClient {
  if (!bedrockClientInstance) {
    const region =
      process.env.BEDROCK_AWS_REGION ||
      process.env.AWS_REGION ||
      'ap-south-1';

    const accessKeyId =
      process.env.BEDROCK_AWS_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID;

    const secretAccessKey =
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      console.log(`[BridgeIQ Backend] Initializing Bedrock Runtime Client in region ${region} with explicit credentials`);
      bedrockClientInstance = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      console.log(`[BridgeIQ Backend] Initializing Bedrock Runtime Client in region ${region} with default provider`);
      bedrockClientInstance = new BedrockRuntimeClient({ region });
    }
  }

  return bedrockClientInstance;
}
