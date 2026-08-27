import { SampleReport } from './types';

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: 1,
    title: 'Report 1 — Free-text (supervisor typed update)',
    description: 'Discipline: Piping | Should match: L6-PIP-0241',
    expected_match: 'L6-PIP-0241 (Erect Line 24-XX)',
    format: 'free-text',
    input: `Team completed erection of three spools on line 24 near the tank farm today. Alignment checked, ready for welding tomorrow. No issues reported. Weather clear, full crew of 6 present.`,
  },
  {
    id: 2,
    title: 'Report 2 — Free-text (ambiguous discipline overlap)',
    description: 'Discipline: Piping vs Civil overlap | Should match: L6-PIP-0189 (not L6-CIV-0112)',
    expected_match: 'L6-PIP-0189 (Hydrotest Line 24-XX)',
    format: 'free-text',
    input: `Hydrotest prep started on the 24-inch line at tank farm. Pressure gauges installed, isolation valves confirmed closed. Test scheduled for tomorrow AM pending QA sign-off.`,
  },
  {
    id: 3,
    title: 'Report 3 — Free-text (low information / deliberately vague)',
    description: 'Should route to manual resolution / multiple candidate overlap',
    expected_match: 'Low confidence candidate split (L6-ELE-0301, L6-ELE-0302) < 70%',
    format: 'free-text',
    input: `Some electrical work done near the substation today. Continuing tomorrow.`,
  },
  {
    id: 4,
    title: 'Report 4 — Spreadsheet-style / CSV daily log (multi-event)',
    description: 'Discipline: Civil & Static/Rotating | 2 events in 1 upload',
    expected_match: 'L6-CIV-0113 (Backfill) & L6-STE-0501 (Pump skid alignment)',
    format: 'csv',
    input: `date,discipline,area,activity,status,crew_size,notes
2026-08-21,Civil,Tank Farm,Backfill foundation area B,In Progress,4,Backfilling 60% complete
2026-08-21,Static/Rotating,Pump House,Pump skid P-101 alignment,Complete,3,Alignment verified by QC`,
  },
  {
    id: 5,
    title: 'Report 5 — Terminology mismatch (Problem Statement core example)',
    description: 'Discipline: Piping | Phrased as "spools erected" vs schedule "Erect Line 24-XX"',
    expected_match: 'L6-PIP-0241 (Erect Line 24-XX)',
    format: 'free-text',
    input: `Line 24 spools erected near tank farm — 3 nos completed. Crew moving to line 25 tomorrow.`,
  },
  {
    id: 6,
    title: 'Report 6 — New/unmatched activity (planner review flag)',
    description: 'Unplanned corrosion damage | No existing schedule item',
    expected_match: 'No good match found (< 70%) -> Flags for planner review',
    format: 'free-text',
    input: `Discovered unplanned corrosion damage on line 18 support bracket near pump house. Temporary support installed, awaiting engineering assessment before repair work can be scheduled.`,
  },
];
