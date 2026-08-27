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
import { getBedrockRuntimeClient } from './bedrockClient';
import { ExtractedEvent, ExtractionResult, EventType } from './types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert infrastructure construction AI assistant for Oil India Limited.
Your task is to parse raw daily field reports, spreadsheets, site diary entries, or supervisor updates and extract structured activity events.

CRITICAL EXTRACTION RULES:
1. ONE EVENT PER DISTINCT PHYSICAL ACTIVITY:
   - Extract exactly ONE event per major physical work activity.
   - Do NOT split a single activity into multiple events based on intermediate verbs, supporting sub-steps, inspection checks, or narrative clauses.
   - Sub-steps like "alignment checked", "gauges installed", "valves confirmed closed", "QA sign-off" belong to the primary parent activity (e.g., "spool erection" or "hydrotest preparation") and must NOT be emitted as standalone events.
   - For CSV / spreadsheets, extract one event per distinct table row.

2. STRICT EVENT_TYPE SEMANTICS:
   - "start": The activity was started, commenced, or initiated today (e.g., "prep started", "began work", "kickoff").
   - "end": The activity was fully completed, finished, or signed off today (e.g., "completed erection", "alignment complete", "finished today", "3 nos completed").
   - "progress": The activity was ongoing today but remains incomplete or continues tomorrow (e.g., "continuing tomorrow", "in progress", "60% complete", "work ongoing").

3. OUTPUT SCHEMA:
   For each distinct activity, extract:
   - "discipline": Capitalized discipline ("Piping", "Civil", "Electrical", "Instrumentation", "Static/Rotating", "HSE").
   - "activity_description": Concise, normalized description of the primary activity (e.g., "spool erection", "hydrotest preparation", "electrical work", "foundation backfill", "pump skid alignment", "temporary support installation").
   - "line": The pipeline number or equipment line identifier if mentioned (e.g. "24", "18", "30", "P-101", "Sub-04"), or null.
   - "location": The physical plant location/area (e.g. "Tank Farm", "Substation", "Pump House"), or null.
   - "quantity": Integer count of items completed if explicitly stated (e.g., 3 for "3 spools"), or null.
   - "event_type": Strictly "start", "end", or "progress".

4. NO DUPLICATES:
   Never generate duplicate or near-duplicate event objects for the same physical work in the same report.

5. FORMAT:
   Return ONLY a valid JSON array of event objects. No markdown formatting, code block wrappers, or conversational filler.`;

/**
 * Normalizes event_type to ensure strict compliance with database constraints.
 */
export function normalizeEventType(rawType: string): EventType {
  const lower = (rawType || '').toLowerCase().trim();
  if (
    lower.includes('end') ||
    lower.includes('complete') ||
    lower.includes('finish') ||
    lower.includes('done') ||
    lower.includes('verified')
  ) {
    return 'end';
  }
  if (lower.includes('start') || lower.includes('initiat') || lower.includes('kick') || lower.includes('prep started')) {
    return 'start';
  }
  return 'progress';
}

/**
 * Parses raw LLM response text into a validated, deduplicated array of ExtractedEvents.
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

  const seenKeys = new Set<string>();
  const results: ExtractedEvent[] = [];

  for (const item of rawArray as Record<string, unknown>[]) {
    const discipline = item.discipline ? String(item.discipline).trim() : 'General';
    const activity_description = item.activity_description
      ? String(item.activity_description).trim()
      : 'General construction work';
    const line = item.line !== undefined && item.line !== null ? String(item.line).trim() : null;
    const location =
      item.location !== undefined && item.location !== null
        ? String(item.location).trim()
        : null;
    const quantity =
      typeof item.quantity === 'number'
        ? item.quantity
        : !isNaN(Number(item.quantity)) && item.quantity !== null
        ? Number(item.quantity)
        : null;
    const event_type = normalizeEventType(
      typeof item.event_type === 'string' ? item.event_type : ''
    );

    // Deduplication key based on normalized activity, discipline, line, and location
    const dedupeKey = `${discipline.toLowerCase()}|${activity_description.toLowerCase()}|${line || ''}|${location || ''}|${event_type}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      results.push({
        discipline,
        activity_description,
        line,
        location,
        quantity,
        event_type,
      });
    }
  }

  return results;
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
      temperature: 0.05,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Field Report Input:\n"""\n${inputText}\n"""\n\nExtract the activity events JSON array:`,
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
    const client = getBedrockRuntimeClient();
    const modelId = process.env.BEDROCK_EXTRACTION_MODEL_ID || 'amazon.nova-micro-v1:0';
    const prompt = `Field Report Input:\n"""\n${inputText}\n"""\n\nExtract the activity events JSON array:`;

    const command = new ConverseCommand({
      modelId,
      system: [{ text: EXTRACTION_SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        temperature: 0.05,
        maxTokens: 1000,
      },
    });

    const response = await client.send(command);
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

  // If explicitly configured for bedrock:
  if (providerType === 'bedrock') {
    return new BedrockExtractionProvider();
  }

  // Default to Groq if GROQ_API_KEY exists or EXTRACTION_PROVIDER=groq
  if (process.env.GROQ_API_KEY || providerType === 'groq') {
    return new GroqExtractionProvider();
  }

  return new BedrockExtractionProvider();
}

/**
 * Unified export function for all consumers.
 */
export async function extractEvents(inputText: string): Promise<ExtractionResult> {
  const provider = getExtractionProvider();
  return provider.extractEvents(inputText);
}
