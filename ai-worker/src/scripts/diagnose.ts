import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  const models = [
    'us.amazon.nova-micro-v1:0',
    'amazon.nova-micro-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'amazon.titan-text-express-v1',
  ];

  for (const model of models) {
    try {
      console.log(`\nTesting model: ${model}...`);
      const cmd = new ConverseCommand({
        modelId: model,
        messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
      });
      const res = await client.send(cmd);
      console.log(`✓ SUCCESS with ${model}:`, res.output?.message?.content?.[0]?.text);
      break;
    } catch (err: unknown) {
      const errorObj = err as {
        name?: string;
        message?: string;
        $metadata?: { httpStatusCode?: number; requestId?: string };
      };
      console.error(`✗ Failed with ${model}:`, {
        name: errorObj.name,
        message: errorObj.message,
        statusCode: errorObj.$metadata?.httpStatusCode,
        requestId: errorObj.$metadata?.requestId,
      });
    }
  }
}

check();
