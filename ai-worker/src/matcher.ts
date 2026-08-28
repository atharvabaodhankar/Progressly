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
 * - Multiplicative scaling: rule bonuses scale with base semantic similarity rather than adding flat percentages.
 * - Semantic gating: positive bonuses only apply when base similarity is viable (>= 0.70).
 * - Line asymmetry penalty: if the field report specifies a line number but the schedule activity has line = NULL,
 *   a penalty (-0.08) is applied for unverified dimension.
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
  const baseSim = candidate.vector_similarity;
  let multiplier = 1.0;
  let penalty = 0.0;

  const eventDisc = clean(event.discipline);
  const candDisc = clean(candidate.discipline);

  // 1. Discipline Rule
  if (eventDisc && candDisc) {
    if (eventDisc === candDisc || (eventDisc.includes('static') && candDisc.includes('static'))) {
      if (baseSim >= 0.70) {
        multiplier += 0.10; // Scaled discipline bonus only for viable semantic matches
      }
    } else {
      penalty += 0.35; // Severe discipline mismatch penalty
    }
  }

  // 2. Line Number Rule
  if (event.line) {
    if (candidate.line) {
      if (clean(event.line) === clean(candidate.line)) {
        if (baseSim >= 0.70) {
          multiplier += 0.15; // Scaled line match bonus
        }
      } else {
        penalty += 0.30; // Direct line conflict (e.g. Line 18 vs Line 30)
      }
    } else {
      // Schedule line is NULL but report explicitly specified a line:
      // Treat as missing verification dimension penalty
      penalty += 0.08;
    }
  }

  // 3. Location Rule
  if (event.location && candidate.location) {
    if (clean(event.location) === clean(candidate.location)) {
      if (baseSim >= 0.70) {
        multiplier += 0.05; // Scaled location match bonus
      }
    }
  }

  const finalScore = baseSim * multiplier - penalty;
  return Math.max(0, Math.min(1, finalScore));
}

export type SemanticAlignment = 'EXACT' | 'LIKELY' | 'PARTIAL' | 'NONE';

const RERANKER_SYSTEM_PROMPT = `You are an expert infrastructure schedule verification agent for Oil India Limited.
Your task is to judge the semantic correspondence between an extracted field event and candidate baseline schedule activities.

EVALUATION CRITERIA:
- "EXACT": The field event directly describes the identical physical work or is an exact industry synonym (e.g., "spool erection" <=> "Erect Line 24-XX", "foundation backfill" <=> "Backfill Foundation Area B", "pump skid alignment" <=> "Align Pump Skid P-101").
- "LIKELY": The field event is strongly related to the candidate activity with high contextual alignment, but may represent a preparatory or supporting stage.
- "PARTIAL": The field event is too vague or ambiguous to distinguish between candidate activities (e.g., "electrical work" when candidate is a specific cable tray).
- "NONE": The field event describes distinct or unrelated work (e.g., "temporary support installation" is NOT "coupling guard installation").

Output strictly valid JSON with this schema:
{
  "best_match_code": "L6-XXX-XXXX" or null,
  "semantic_alignment": "EXACT" | "LIKELY" | "PARTIAL" | "NONE",
  "reasoning": "Concise 1-2 sentence engineering justification"
}`;

/**
 * Evaluates semantic alignment via LLM at temperature 0 (no numeric scores in prompt).
 */
async function evaluateSemanticAlignment(
  event: ExtractedEvent,
  candidates: CandidateMatch[]
): Promise<{ best_code: string | null; alignment: SemanticAlignment; reasoning: string }> {
  if (candidates.length === 0) {
    return { best_code: null, alignment: 'NONE', reasoning: 'No candidate activities found.' };
  }

  // Format prompt with TEXT ONLY — no similarity numbers to eliminate anchoring bias
  const prompt = `Extracted Field Event:
- Discipline: ${event.discipline}
- Activity: ${event.activity_description}
- Line: ${event.line || 'Not specified'}
- Location: ${event.location || 'Not specified'}

Candidate Baseline Schedule Activities:
${candidates
  .map(
    (c, i) => `Candidate #${i + 1}:
  Code: ${c.activity_code}
  Description: ${c.description}
  Discipline: ${c.discipline}
  Line: ${c.line || 'Not specified'}
  Location: ${c.location || 'Not specified'}`
  )
  .join('\n\n')}

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
        temperature: 0.0,
        messages: [
          { role: 'system', content: RERANKER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });
      responseText = res.choices[0]?.message?.content || '{}';
    } else {
      const client = getBedrockRuntimeClient();
      const modelId = process.env.BEDROCK_EXTRACTION_MODEL_ID || 'apac.amazon.nova-micro-v1:0';
      const cmd = new ConverseCommand({
        modelId,
        system: [{ text: RERANKER_SYSTEM_PROMPT }],
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { temperature: 0.0, maxTokens: 400 },
      });
      const res = await client.send(cmd);
      responseText = res.output?.message?.content?.[0]?.text || '{}';
    }

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    const validAlignments: SemanticAlignment[] = ['EXACT', 'LIKELY', 'PARTIAL', 'NONE'];
    const alignment: SemanticAlignment = validAlignments.includes(parsed.semantic_alignment)
      ? parsed.semantic_alignment
      : 'LIKELY';

    return {
      best_code: parsed.best_match_code || candidates[0].activity_code,
      alignment,
      reasoning: parsed.reasoning || 'Evaluated via semantic alignment analysis.',
    };
  } catch (_err) {
    return {
      best_code: candidates[0]?.activity_code || null,
      alignment: 'LIKELY',
      reasoning: 'Calculated via vector similarity and business-rule scoring.',
    };
  }
}

/**
 * Calculates a deterministic final confidence score in code.
 */
export function calculateFinalConfidence(
  ruleScore: number,
  alignment: SemanticAlignment
): number {
  if (alignment === 'NONE') return 0.0;
  if (ruleScore <= 0) return 0.0;

  switch (alignment) {
    case 'EXACT':
      // Exact physical synonym with matching rules -> High confidence (0.95 - 0.98)
      return Math.min(0.98, Math.max(0.95, Number((ruleScore * 0.98).toFixed(3))));
    case 'LIKELY':
      // Likely contextual match -> Planner review band (0.75 - 0.90)
      return Math.min(0.90, Math.max(0.70, Number((ruleScore * 0.85).toFixed(3))));
    case 'PARTIAL':
      // Ambiguous / vague match -> Under 0.70
      return Math.min(0.65, Number((ruleScore * 0.65).toFixed(3)));
    default:
      return 0.0;
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
  const isProdDb = DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('amazonaws.com');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: isProdDb ? { rejectUnauthorized: false } : undefined,
  });
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

    candidates = res.rows.map((row: Record<string, any>) => {
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

  // 3. Evaluate Semantic Alignment with LLM at temperature 0 (text-only prompt)
  const evalResult = await evaluateSemanticAlignment(event, candidates.slice(0, 3));

  let matchedCandidate = candidates.find((c) => c.activity_code === evalResult.best_code) || null;
  if (!matchedCandidate && candidates.length > 0 && evalResult.alignment !== 'NONE') {
    matchedCandidate = candidates[0];
  }

  // Deterministically compute final calibrated confidence score in code
  const confidenceScore = matchedCandidate
    ? calculateFinalConfidence(matchedCandidate.rule_score, evalResult.alignment)
    : 0;

  if (matchedCandidate) {
    matchedCandidate.final_confidence = confidenceScore;
    matchedCandidate.reasoning = `[${evalResult.alignment}] ${evalResult.reasoning}`;
  }

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
