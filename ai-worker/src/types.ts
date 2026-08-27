export type EventType = 'start' | 'end' | 'progress';

export interface ExtractedEvent {
  discipline: string;
  activity_description: string;
  line: string | null;
  location: string | null;
  quantity: number | null;
  event_type: EventType;
}

export interface ExtractionResult {
  input_text: string;
  raw_response: string;
  events: ExtractedEvent[];
}

export interface SampleReport {
  id: number;
  title: string;
  description: string;
  expected_match: string;
  input: string;
  format: 'free-text' | 'csv';
}
