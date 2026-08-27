import { Client } from 'pg';
import { getEmbeddingProvider } from './embeddingProvider';
import { getExtractionProvider } from './extractionProvider';
import { ExtractedEvent } from './types';
import Groq from 'groq-sdk';
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from './bedrockClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

export interface CandidateMatch {
  activity_id: string;
  activity_code: string;
  description: string;
  discipline: string;
  line: string | null;
  location: string | null;
  vector_similarity: number;
  rule_score: number;
  final_confidence: number;
  reasoning?: string;
}

export interface MatchResult {
  event: ExtractedEvent;
  matched_candidate: CandidateMatch | null;
  all_candidates: CandidateMatch[];
  confidence_score: number;
  status: 'auto_approved' | 'pending' | 'manual_resolution';
  policy_action: string;
}

/**
 * Normalizes strings for robust equality comparison.
 */
function clean(str: string | null | undefined): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Applies Oil & Gas business rules to score candidate matches.
 */
export function applyBusinessRules(
  event: ExtractedEvent,
  candidate: {
    discipline: string;
    line: string | null;
    location: string | null;
    vector_similarity: number;
  }
): number {
  let score = candidate.vector_similarity;

  const eventDisc = clean(event.discipline);
  const candDisc = clean(candidate.discipline);

  // 1. Discipline Rule
  if (eventDisc && candDisc) {
    if (eventDisc === candDisc || (eventDisc.includes('static') && candDisc.includes('static'))) {
      score += 0.08; // Discipline match bonus
    } else {
      score -= 0.35; // Severe discipline mismatch penalty (e.g. Civil vs Piping)
    }
  }

  // 2. Line Number Rule
  if (event.line && candidate.line) {
    if (clean(event.line) === clean(candidate.line)) {
      score += 0.15; // Line match boost
    } else {
      score -= 0.25; // Different line penalty (e.g., Line 24 vs Line 25)
    }
  }

  // 3. Location Rule
  if (event.location && candidate.location) {
    if (clean(event.location) === clean(candidate.location)) {
      score += 0.05; // Same plant area
    }
  }

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score));
}

const RERANKER_SYSTEM_PROMPT = `You are an expert schedule matching and verification agent for Oil India Limited.
Your task is to compare an extracted field event against shortlisted baseline schedule activities and determine the exact match confidence.

Given the extracted event and top candidate activities:
- Analyze activity description, engineering discipline, line number, and location.
- Determine if Candidate #1 is a genuine match for the field report.
- Return a JSON object with:
  {
    "best_match_code": "L6-XXX-XXXX" or null if no valid match exists,
    "confidence_score": 0.00 to 1.00 (calibrated match confidence),
    "reasoning": "brief explanation"
  }

CALIBRATION GUIDELINES:
- ≥ 0.95: High certainty exact match in discipline, activity, and line (e.g. "spool erection" -> "Erect Line 24-XX" on line 24).
- 0.70 - 0.94: Likely match with slight ambiguity or missing specifics (routes to planner review queue).
- < 0.70: Vague input, conflicting discipline/line, or new unplanned work that is not in the baseline schedule.
- Return ONLY valid JSON.`;

/**
 * Reranks top candidates using LLM reasoning.
 */
async function rerankCandidates(
  event: ExtractedEvent,
  candidates: CandidateMatch[]
): Promise<{ best_code: string | null; confidence: number; reasoning: string }> {
  if (candidates.length === 0) {
    return { best_code: null, confidence: 0, reasoning: 'No candidate activities found.' };
  }

  const prompt = `Extracted Field Event:
${JSON.stringify(event, null, 2)}

Candidate Activities from Baseline Schedule:
${JSON.stringify(
  candidates.map((c, i) => ({
    rank: i + 1,
    activity_code: c.activity_code,
    description: c.description,
    discipline: c.discipline,
    line: c.line,
    location: c.location,
    vector_similarity: Number(c.vector_similarity.toFixed(3)),
    rule_score: Number(c.rule_score.toFixed(3)),
  })),
  null,
  2
)}

Evaluate the best match and output the JSON verdict:`;

  const provider = getExtractionProvider();

  try {
    let responseText = '';
    if (provider.name.includes('Groq')) {
      const rawKeys = process.env.GROQ_API_KEY || '';
      const key = rawKeys.split(',')[0].trim();
      const groq = new Groq({ apiKey: key });
      const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

      const res = await groq.chat.completions.create({
        model,
        temperature: 0.05,
        messages: [
          { role: 'system', content: RERANKER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });
      responseText = res.choices[0]?.message?.content || '{}';
    } else {
      const client = getBedrockRuntimeClient();
      const modelId = process.env.BEDROCK_EXTRACTION_MODEL_ID || 'amazon.nova-micro-v1:0';
      const cmd = new ConverseCommand({
        modelId,
        system: [{ text: RERANKER_SYSTEM_PROMPT }],
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { temperature: 0.05, maxTokens: 500 },
      });
      const res = await client.send(cmd);
      responseText = res.output?.message?.content?.[0]?.text || '{}';
    }

    // Clean JSON
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    return {
      best_code: parsed.best_match_code || null,
      confidence:
        typeof parsed.confidence_score === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence_score))
          : candidates[0].rule_score,
      reasoning: parsed.reasoning || 'Reranked via semantic matching model.',
    };
  } catch (_err) {
    // Fallback to rule_score if reranker fails
    const top = candidates[0];
    return {
      best_code: top ? top.activity_code : null,
      confidence: top ? top.rule_score : 0,
      reasoning: 'Calculated via vector similarity and business-rule scoring.',
    };
  }
}

/**
 * Full semantic matching pipeline for a single extracted event.
 */
export async function matchEventToSchedule(event: ExtractedEvent): Promise<MatchResult> {
  const embedProvider = getEmbeddingProvider();

  // 1. Build query text and generate vector embedding
  const queryText = `${event.discipline} - ${event.activity_description}. Line: ${
    event.line || 'N/A'
  }. Location: ${event.location || 'N/A'}`;
  const queryVector = await embedProvider.embed(queryText);
  const vectorSql = `[${queryVector.join(',')}]`;

  // 2. Perform pgvector cosine similarity search
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let candidates: CandidateMatch[] = [];

  try {
    const res = await client.query(
      `SELECT 
        id, 
        activity_code, 
        description, 
        discipline, 
        line, 
        location, 
        1 - (embedding <=> $1::vector) AS vector_similarity
       FROM activities
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector ASC
       LIMIT 5;`,
      [vectorSql]
    );

    candidates = res.rows.map((row) => {
      const vector_similarity = Number(row.vector_similarity);
      const rule_score = applyBusinessRules(event, {
        discipline: row.discipline,
        line: row.line,
        location: row.location,
        vector_similarity,
      });

      return {
        activity_id: row.id,
        activity_code: row.activity_code,
        description: row.description,
        discipline: row.discipline,
        line: row.line,
        location: row.location,
        vector_similarity,
        rule_score,
        final_confidence: rule_score,
      };
    });
  } finally {
    await client.end();
  }

  // Sort candidates by combined rule score
  candidates.sort((a, b) => b.rule_score - a.rule_score);

  // 3. Rerank top candidates with LLM
  const reranked = await rerankCandidates(event, candidates.slice(0, 3));

  let matchedCandidate = candidates.find((c) => c.activity_code === reranked.best_code) || null;
  if (!matchedCandidate && candidates.length > 0 && reranked.confidence >= 0.7) {
    matchedCandidate = candidates[0];
  }

  if (matchedCandidate) {
    matchedCandidate.final_confidence = reranked.confidence;
    matchedCandidate.reasoning = reranked.reasoning;
  }

  const confidenceScore = matchedCandidate ? matchedCandidate.final_confidence : 0;

  // 4. Policy Gating
  let status: 'auto_approved' | 'pending' | 'manual_resolution';
  let policyAction: string;

  if (confidenceScore >= 0.95) {
    status = 'auto_approved';
    policyAction = 'Auto-approved (Score ≥ 95%): Schedule updated automatically and logged.';
  } else if (confidenceScore >= 0.7) {
    status = 'pending';
    policyAction = 'Planner Review (70–94%): Routed to planner queue for human verification.';
  } else {
    status = 'manual_resolution';
    policyAction = 'Manual Resolution (< 70%): Flagged for planner review / new activity creation.';
  }

  return {
    event,
    matched_candidate: matchedCandidate,
    all_candidates: candidates,
    confidence_score: confidenceScore,
    status,
    policy_action: policyAction,
  };
}
