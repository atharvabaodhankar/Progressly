import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockRuntimeClient } from './bedrockClient';

export interface HistoricalRecord {
  id: string;
  project_name: string;
  discipline: string;
  activity_description: string;
  planned_duration_days: number;
  actual_duration_days: number;
  delay_days: number;
  delay_cause: string | null;
  notes: string;
  similarity_score?: number;
}

export interface SynthesisStats {
  totalRetrieved: number;
  delayedCount: number;
  averageDelayDays: number;
  causeBreakdown: { [cause: string]: number };
  maxDelayDays: number;
}

export interface SynthesisResult {
  answer: string;
  sources: string[];
  computedStats: SynthesisStats;
  model: string;
}

export interface ISynthesisProvider {
  synthesizeAnswer(
    query: string,
    retrievedRecords: HistoricalRecord[]
  ): Promise<SynthesisResult>;
  getPrimaryModelId(): string;
  getFallbackModelId(): string;
}

/**
 * Computes deterministic ground-truth statistics directly from retrieved records
 * to guarantee that all numeric figures are mathematically exact and unhallucinated.
 */
export function computeHistoricalStats(records: HistoricalRecord[]): SynthesisStats {
  if (records.length === 0) {
    return {
      totalRetrieved: 0,
      delayedCount: 0,
      averageDelayDays: 0,
      causeBreakdown: {},
      maxDelayDays: 0,
    };
  }

  const delayed = records.filter((r) => r.delay_days > 0);
  const totalDelayDays = delayed.reduce((acc, r) => acc + r.delay_days, 0);
  const averageDelayDays =
    delayed.length > 0 ? Number((totalDelayDays / delayed.length).toFixed(1)) : 0;
  const maxDelayDays = records.reduce((max, r) => Math.max(max, r.delay_days), 0);

  const causeBreakdown: { [cause: string]: number } = {};
  records.forEach((r) => {
    const cause = r.delay_cause || 'No Delay / On Schedule';
    causeBreakdown[cause] = (causeBreakdown[cause] || 0) + 1;
  });

  return {
    totalRetrieved: records.length,
    delayedCount: delayed.length,
    averageDelayDays,
    causeBreakdown,
    maxDelayDays,
  };
}

const SYNTHESIS_SYSTEM_PROMPT = `You are BridgeIQ's Institutional Memory & Knowledge Synthesis AI for capital infrastructure projects (Oil India Ltd).
Your job is to answer project management and engineering inquiries STRICTLY based on the provided historical project records.

CRITICAL RULES:
1. STRICT GROUNDING: Base your answer ONLY on the provided retrieved historical records and the verified computed statistics. Do NOT invent, assume, or extrapolate causes, project names, numbers, or equipment not present in the provided context.
2. CITATIONS: Every claim or finding MUST explicitly cite the supporting record using the format: [Project Name — Activity Description]. Do NOT use generic citations like "Record #1" or "in one past project".
3. UNCERTAINTY HANDLING: If the retrieved records do not contain sufficient evidence to answer the query with confidence, state clearly: "The historical dataset does not contain sufficient records regarding [topic]..." rather than fabricating a plausible answer.
4. QUANTITATIVE ACCURACY: When quoting delay numbers, percentages, or frequencies, use ONLY the verified computed statistics provided in the context. Do NOT perform your own estimation of statistics.
5. STRUCTURE: Structure your answer cleanly with:
   - **Executive Summary** (Direct, concise summary of the primary finding)
   - **Key Root Cause Drivers** (Detailed breakdown with specific [Project Name — Activity Description] citations)
   - **Institutional Takeaways & Mitigation** (Actionable insights for current schedule planners)`;

export class BedrockSynthesisProvider implements ISynthesisProvider {
  private primaryModelId: string;
  private fallbackModelId: string;

  constructor() {
    this.primaryModelId =
      process.env.BEDROCK_SYNTHESIS_MODEL_ID ||
      'apac.amazon.nova-pro-v1:0';
    this.fallbackModelId =
      this.primaryModelId === 'apac.amazon.nova-pro-v1:0'
        ? 'apac.anthropic.claude-3-7-sonnet-20250219-v1:0'
        : 'apac.amazon.nova-pro-v1:0';
  }

  public getPrimaryModelId(): string {
    return this.primaryModelId;
  }

  public getFallbackModelId(): string {
    return this.fallbackModelId;
  }

  async synthesizeAnswer(
    query: string,
    retrievedRecords: HistoricalRecord[]
  ): Promise<SynthesisResult> {
    const stats = computeHistoricalStats(retrievedRecords);

    // Extract unique source tags
    const sources = retrievedRecords.map(
      (r) => `${r.project_name} — ${r.activity_description}`
    );

    // Format retrieved records context
    const recordsContext = retrievedRecords
      .map((r, idx) => {
        const sim = r.similarity_score ? ` (Cosine Similarity: ${(r.similarity_score * 100).toFixed(1)}%)` : '';
        const delayStr = r.delay_days > 0 ? `+${r.delay_days} days delay` : '0 days (On Schedule)';
        return `[RECORD ${idx + 1}] ${r.project_name} — ${r.activity_description}${sim}
- Discipline: ${r.discipline.toUpperCase()}
- Planned Duration: ${r.planned_duration_days} days | Actual Duration: ${r.actual_duration_days} days
- Delay Variance: ${delayStr}
- Delay Cause: ${r.delay_cause || 'None / On Schedule'}
- Engineering Notes: "${r.notes}"`;
      })
      .join('\n\n');

    // Format verified computed stats context
    const statsContext = `VERIFIED COMPUTED DATASET STATISTICS (DO NOT DEVIATE FROM THESE NUMBERS):
- Total Relevant Records Analyzed: ${stats.totalRetrieved}
- Records with Schedule Delays: ${stats.delayedCount} of ${stats.totalRetrieved}
- Average Delay for Delayed Activities: ${stats.averageDelayDays} days
- Maximum Single Delay: ${stats.maxDelayDays} days
- Root Cause Frequency Breakdown:
${Object.entries(stats.causeBreakdown)
  .map(([cause, count]) => `  * ${cause}: ${count} record(s) (${Math.round((count / stats.totalRetrieved) * 100)}%)`)
  .join('\n')}`;

    const userPrompt = `USER INQUIRY:
"${query}"

${statsContext}

RETRIEVED HISTORICAL RECORDS:
${recordsContext}

Please synthesize a grounded, cited answer to the user's inquiry adhering strictly to all grounding and citation instructions.`;

    const client = getBedrockRuntimeClient();

    let targetModel = this.primaryModelId;
    let response;

    try {
      const command = new ConverseCommand({
        modelId: targetModel,
        system: [{ text: SYNTHESIS_SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: userPrompt }],
          },
        ],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 1500,
        },
      });

      response = await client.send(command);
    } catch (primaryErr: unknown) {
      const errName = (primaryErr as { name?: string })?.name || '';
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const isAccessOrQuotaError =
        errName === 'AccessDeniedException' ||
        errName === 'ResourceNotFoundException' ||
        msg.includes('use case details have not been submitted') ||
        msg.includes('INVALID_PAYMENT_INSTRUMENT') ||
        msg.includes('Model access is denied') ||
        msg.includes('ResourceNotFoundException') ||
        msg.includes('AccessDeniedException');

      if (isAccessOrQuotaError) {
        console.warn(
          `\n[Bedrock Synthesis WARNING] Primary model (${this.primaryModelId}) failed (${errName || 'Error'}): "${msg}".\n[Bedrock Synthesis FALLBACK] Initiating fallback request to alternative model (${this.fallbackModelId})...\n`
        );
        targetModel = this.fallbackModelId;

        const fallbackCommand = new ConverseCommand({
          modelId: targetModel,
          system: [{ text: SYNTHESIS_SYSTEM_PROMPT }],
          messages: [
            {
              role: 'user',
              content: [{ text: userPrompt }],
            },
          ],
          inferenceConfig: {
            temperature: 0.1,
            maxTokens: 1500,
          },
        });

        response = await client.send(fallbackCommand);
      } else {
        throw primaryErr;
      }
    }

    const answer =
      response.output?.message?.content?.[0]?.text ||
      'Unable to synthesize response from historical records.';

    return {
      answer,
      sources,
      computedStats: stats,
      model: targetModel,
    };
  }
}

// Export alias for backward compatibility
export const BedrockClaudeSynthesisProvider = BedrockSynthesisProvider;
