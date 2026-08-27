/**
 * ============================================================================
 * TEMPORARY EXTRACTION PROVIDER ABSTRACTION
 * ============================================================================
 * ARCHITECTURE NOTE:
 * Amazon Bedrock model access (Nova Micro) is currently pending quota approval.
 * To enable immediate development and end-to-end testing of the extraction
 * pipeline, Groq SDK is used as a temporary, drop-in extraction provider.
 *
 * This module isolates the provider behind the `extractEvents()` interface.
 * The system prompt, JSON schema, and event normalization are identical
 * between Groq and Bedrock Nova Micro, ensuring zero rework when switching
 * back to Amazon Bedrock.
 * ============================================================================
 */

import Groq from 'groq-sdk';
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockRuntimeClient, BEDROCK_EXTRACTION_MODEL_ID } from './bedrockClient';
import { ExtractedEvent, ExtractionResult, EventType } from './types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert infrastructure construction AI assistant for Oil India Limited.
Your task is to parse raw daily field reports, spreadsheets, site diary entries, or supervisor updates and extract structured activity events.

For each distinct construction/engineering event in the input text, extract:
- "discipline": The engineering discipline (e.g. "Piping", "Civil", "Electrical", "Instrumentation", "Static/Rotating", "HSE").
- "activity_description": A concise, clear summary of the actual executable activity (e.g., "spool erection", "hydrotest preparation", "cable pulling", "foundation backfill", "pump skid alignment").
- "line": The pipeline number or equipment line identifier if mentioned (e.g. "24", "18", "30", "Sub-04"), or null.
- "location": The physical plant location/area (e.g. "Tank Farm", "Substation", "Pump House", "Corridor West"), or null.
- "quantity": A numeric count of items completed or installed if explicitly mentioned (e.g., 3 for "three spools"), or null.
- "event_type": Must strictly be one of:
  - "start" (for initiation, kickoff, preparation started)
  - "end" (for completed, finished, signed off, verified)
  - "progress" (for ongoing work, partial completion, in progress, continuing)

IMPORTANT INSTRUCTIONS:
1. Return ONLY a valid JSON array containing one or more event objects matching the schema:
   [
     {
       "discipline": "Piping",
       "activity_description": "spool erection",
       "line": "24",
       "location": "Tank Farm",
       "quantity": 3,
       "event_type": "progress"
     }
   ]
2. If the input contains multiple tasks (e.g. multiple CSV rows or multi-task updates), extract each as a separate object in the array.
3. Do not include markdown commentary, explanations, or conversational filler. Return raw JSON array only.`;

/**
 * Normalizes event_type to ensure strict compliance with database constraints.
 */
export function normalizeEventType(rawType: string): EventType {
  const lower = (rawType || '').toLowerCase().trim();
  if (lower.includes('start') || lower.includes('initiat') || lower.includes('kick')) {
    return 'start';
  }
  if (
    lower.includes('end') ||
    lower.includes('complete') ||
    lower.includes('finish') ||
    lower.includes('done') ||
    lower.includes('verified')
  ) {
    return 'end';
  }
  return 'progress';
}

/**
 * Parses raw LLM response text into a validated array of ExtractedEvents.
 */
export function parseAndValidateJson(rawText: string): ExtractedEvent[] {
  let cleaned = rawText.trim();

  // Strip markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find first [ or {
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');

  let jsonStr = cleaned;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1) {
      jsonStr = cleaned.substring(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      jsonStr = `[${cleaned.substring(firstBrace, lastBrace + 1)}]`;
    }
  }

  const parsed = JSON.parse(jsonStr);
  const rawArray = Array.isArray(parsed) ? parsed : [parsed];

  return rawArray.map((item: Record<string, unknown>) => ({
    discipline: item.discipline ? String(item.discipline).trim() : 'General',
    activity_description: item.activity_description
      ? String(item.activity_description).trim()
      : 'General construction work',
    line: item.line !== undefined && item.line !== null ? String(item.line).trim() : null,
    location:
      item.location !== undefined && item.location !== null
        ? String(item.location).trim()
        : null,
    quantity:
      typeof item.quantity === 'number'
        ? item.quantity
        : !isNaN(Number(item.quantity)) && item.quantity !== null
        ? Number(item.quantity)
        : null,
    event_type: normalizeEventType(typeof item.event_type === 'string' ? item.event_type : ''),
  }));
}

export interface IExtractionProvider {
  name: string;
  extractEvents(inputText: string): Promise<ExtractionResult>;
}

/**
 * Temporary Groq Extraction Provider with Round-Robin API Key support.
 */
export class GroqExtractionProvider implements IExtractionProvider {
  public name = 'Groq (Temporary Placeholder)';
  private apiKeys: string[];
  private currentKeyIndex = 0;
  private model: string;

  constructor() {
    const rawKeys = process.env.GROQ_API_KEY || '';
    this.apiKeys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  }

  private getNextClient(): Groq {
    if (this.apiKeys.length === 0) {
      throw new Error(
        'No GROQ_API_KEY found in environment variables. Please add GROQ_API_KEY to ai-worker/.env'
      );
    }
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return new Groq({ apiKey: key });
  }

  async extractEvents(inputText: string): Promise<ExtractionResult> {
    const client = this.getNextClient();

    const response = await client.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Input Field Report / Data:\n"""\n${inputText}\n"""\n\nExtract all activity events into a JSON array:`,
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content || '[]';
    const events = parseAndValidateJson(responseText);

    return {
      input_text: inputText,
      raw_response: responseText,
      events,
    };
  }
}

/**
 * Production Amazon Bedrock Nova Micro Provider.
 */
export class BedrockExtractionProvider implements IExtractionProvider {
  public name = 'Amazon Bedrock Nova Micro';

  async extractEvents(inputText: string): Promise<ExtractionResult> {
    const prompt = `Input Field Report / Data:\n"""\n${inputText}\n"""\n\nExtract all activity events into a JSON array:`;

    const command = new ConverseCommand({
      modelId: BEDROCK_EXTRACTION_MODEL_ID,
      system: [{ text: EXTRACTION_SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        temperature: 0.1,
        maxTokens: 1000,
      },
    });

    const response = await bedrockRuntimeClient.send(command);
    const responseText = response.output?.message?.content?.[0]?.text || '[]';
    const events = parseAndValidateJson(responseText);

    return {
      input_text: inputText,
      raw_response: responseText,
      events,
    };
  }
}

/**
 * Factory function to get active provider.
 */
export function getExtractionProvider(): IExtractionProvider {
  const providerType = (process.env.EXTRACTION_PROVIDER || '').toLowerCase().trim();

  // If explicitly configured for bedrock and no override:
  if (providerType === 'bedrock') {
    return new BedrockExtractionProvider();
  }

  // Default to Groq if GROQ_API_KEY exists or EXTRACTION_PROVIDER=groq
  if (process.env.GROQ_API_KEY || providerType === 'groq') {
    return new GroqExtractionProvider();
  }

  // Fallback to Bedrock
  return new BedrockExtractionProvider();
}

/**
 * Unified export function for all consumers.
 */
export async function extractEvents(inputText: string): Promise<ExtractionResult> {
  const provider = getExtractionProvider();
  return provider.extractEvents(inputText);
}
