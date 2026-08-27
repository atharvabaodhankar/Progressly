/**
 * Extraction entry module.
 * Delegates to the extraction provider abstraction (Groq temporary placeholder / Amazon Bedrock Nova Micro).
 */

export {
  extractEvents,
  getExtractionProvider,
  IExtractionProvider,
  GroqExtractionProvider,
  BedrockExtractionProvider,
  EXTRACTION_SYSTEM_PROMPT,
} from './extractionProvider';

import { extractEvents } from './extractionProvider';

// Alias extractEvents as extractEventsFromText for backward compatibility
export const extractEventsFromText = extractEvents;
