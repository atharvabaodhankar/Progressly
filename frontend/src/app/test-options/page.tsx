'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Download,
  FileText,
  Layers,
  HelpCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  Clock,
  Building2,
  Sun,
  Train,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  organization: string;
  location: string;
  difficulty: 'Easy / Everyday' | 'Medium / Commercial' | 'Advanced / Industrial';
  difficultyColor: string;
  summary: string;
  whyEasy: string;
  csvFilename: string;
  csvData: string;
  reports: {
    title: string;
    type: 'Progress Report (Happy Path)' | 'Delay & Risk Report (Edge Case)';
    content: string;
    expectedOutcome: {
      novaExtraction: string;
      titanLinking: string;
      reviewQueueTier: string;
      timelineImpact: string;
    };
  }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'metro',
    name: 'Central Metro Station Modernization',
    badge: 'Urban Infrastructure',
    badgeColor: 'from-blue-500 to-indigo-600',
    icon: Train,
    organization: 'Metro Rail Corporation',
    location: 'Central Junction Station',
    difficulty: 'Easy / Everyday',
    difficultyColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    summary: 'Construction and outfitting of a passenger metro station concourse, platforms, escalators, and ticketing gates.',
    whyEasy: 'Everyone understands escalators, tile flooring, CCTV cameras, and ticketing gates. No complex chemical jargon!',
    csvFilename: 'metro_station_schedule.csv',
    csvData: `activity_code,description,discipline,line,location,planned_start,planned_end
MTR-CIV-0101,Cast Concrete Base Slab Platform 1,Civil,,Station Platform 1,2026-10-01,2026-10-12
MTR-CIV-0102,Install Platform Flooring Granite Tiles,Civil,,Station Platform 1,2026-10-13,2026-10-22
MTR-ELE-0201,Install Concourse Lighting & Power Cables,Electrical,,Main Concourse,2026-10-05,2026-10-15
MTR-ELE-0202,Wire Automatic Ticket Gates & Vending Machines,Electrical,,Entry Hall A,2026-10-16,2026-10-24
MTR-MEC-0301,Assemble Passenger Escalator Unit 1,Static/Rotating,,Entry Hall A,2026-10-08,2026-10-18
MTR-INS-0401,Mount CCTV Security Cameras & Public Display Screens,Instrumentation,,Platform & Concourse,2026-10-20,2026-10-28
MTR-HSE-0501,Fire Suppression & Emergency Exit Safety Audit,HSE,,All Station Zones,2026-10-29,2026-10-31`,
    reports: [
      {
        title: 'Daily Shift Report — Escalators & Concourse Lighting',
        type: 'Progress Report (Happy Path)',
        content: `DAILY SITE REPORT — CENTRAL METRO STATION
Date: 2026-10-14
Contractor: Hyundai Rotem & L&T Electrical
Lead Engineer: Ananya Roy

Executive Summary:
Good progress across the main entry hall and concourse. Passenger escalator assembly is moving rapidly.

Shift Progress:
- Activity MTR-MEC-0301 (Assemble Passenger Escalator Unit 1): Motor drive and upper steps assembled in Entry Hall A. Total progress is now 75% complete.
- Activity MTR-ELE-0201 (Install Concourse Lighting & Power Cables): Completed pulling 350m of main power feed cables in Main Concourse area. 90% completed.

Workforce & Equipment:
- 18 electricians and 6 mechanical rigging technicians on site. All PPE compliant.`,
        expectedOutcome: {
          novaExtraction: 'Extracts 2 distinct events: Escalator assembly at 75% (Location: Entry Hall A) and Concourse Lighting at 90% (Location: Main Concourse).',
          titanLinking: 'Titan V2 matches MTR-MEC-0301 with >95% confidence and MTR-ELE-0201 with >96% confidence.',
          reviewQueueTier: 'Tier 1 Auto-Approved (Green badge). Automatically applied to project baseline.',
          timelineImpact: 'Timeline Dashboard immediately advances Escalator progress bar from 0% to 75% and Lighting to 90%.',
        },
      },
      {
        title: 'Site Delay Log — Granite Tile Delivery & Rain Intrusion',
        type: 'Delay & Risk Report (Edge Case)',
        content: `INCIDENT & DELAY LOG — METRO PLATFORM 1
Date: 2026-10-18
Shift: Night Shift
Inspector: Vikram Saxena

Notes:
- Activity MTR-CIV-0102 (Install Platform Flooring Granite Tiles): Rain water seeped into Station Platform 1 through ventilation shaft, halting tile adhesive curing.
- Only 20% flooring tiles laid so far. Material supplier shipment delayed by 3 days due to transport strike.
- Safety: Barricaded wet platform area to prevent slip hazards.`,
        expectedOutcome: {
          novaExtraction: 'Extracts flooring tile activity at 20% with explicit delay cause ("Rain water seepage & transport strike delay 3 days").',
          titanLinking: 'Titan V2 matches MTR-CIV-0102 at ~93-96% confidence.',
          reviewQueueTier: 'Tier 1 or Tier 2 depending on variance flags. Highlights 3-day critical path delay for Planner review.',
          timelineImpact: 'Flags Platform 1 flooring as lagging behind baseline schedule with orange delay indicator.',
        },
      },
    ],
  },
  {
    id: 'solar',
    name: '50MW Thar Desert Solar Farm',
    badge: 'Clean Energy & Utilities',
    badgeColor: 'from-amber-500 to-orange-600',
    icon: Sun,
    organization: 'CleanGrid Energy Solutions',
    location: 'Jaisalmer Solar Park, Rajasthan',
    difficulty: 'Medium / Commercial',
    difficultyColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    summary: 'Ground-mount solar PV array installation, underground cabling, weather pyranometer sensors, and 33kV grid transformer synchronization.',
    whyEasy: 'Intuitive clean energy concepts: driving metal poles into the sand, bolting solar panels, and connecting inverters to the power grid.',
    csvFilename: 'solar_farm_schedule.csv',
    csvData: `activity_code,description,discipline,line,location,planned_start,planned_end
SLR-CIV-101,Drive Ground Mounting Steel Piles Sector A,Civil,,Sector A Ground,2026-11-01,2026-11-10
SLR-ELE-201,Mount 550W Bifacial Solar PV Panels,Electrical,,Sector A Racks,2026-11-11,2026-11-20
SLR-ELE-202,Lay Underground DC Array Cables to Inverter,Electrical,,Central Trench,2026-11-15,2026-11-25
SLR-INS-301,Install Weather Monitoring & Solar Pyranometers,Instrumentation,,Control Station,2026-11-22,2026-11-27
SLR-ELE-203,Synchronize 33kV Step-Up Grid Transformer,Electrical,,Substation Yard,2026-11-28,2026-11-30
SLR-HSE-401,High Voltage Electrical Energization Safety Inspection,HSE,,All Array Sectors,2026-12-01,2026-12-02`,
    reports: [
      {
        title: 'Daily Array Progress — Solar PV Panel Mounting',
        type: 'Progress Report (Happy Path)',
        content: `DAILY SITE REPORT — THAR SOLAR PARK SECTOR A
Date: 2026-11-14
Contractor: Sterling & Wilson Renewable Energy
Supervisor: Harish Choudhary

Today's Progress:
- Activity SLR-ELE-201 (Mount 550W Bifacial Solar PV Panels): Team bolted 1,200 panels onto steel torque tubes in Sector A Racks. Reached 60% completion.
- Activity SLR-CIV-101 (Drive Ground Mounting Steel Piles Sector A): Completed 100% piling across all 40 table rows in Sector A Ground. Pile driving completed and verified.`,
        expectedOutcome: {
          novaExtraction: 'Extracts SLR-ELE-201 at 60% (1,200 panels) and SLR-CIV-101 at 100% (Complete).',
          titanLinking: 'Titan V2 matches both activities with 98% and 99% confidence.',
          reviewQueueTier: 'Tier 1 Auto-Approved.',
          timelineImpact: 'Piling activity turns solid Green (100% Complete) with checkmark; Solar Panel mounting bar advances to 60%.',
        },
      },
    ],
  },
  {
    id: 'pipeline',
    name: 'Paradip-Hyderabad Cross-Country Pipeline',
    badge: 'Oil & Gas Midstream',
    badgeColor: 'from-purple-500 to-pink-600',
    icon: Building2,
    organization: 'Indian Oil Corporation Ltd',
    location: 'Odisha / Andhra Pradesh',
    difficulty: 'Advanced / Industrial',
    difficultyColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    summary: 'Heavy hydrocarbon cross-country pipeline trenching, mainline pipe welding, pump station concrete pedestals, and hydrostatic pressure testing.',
    whyEasy: 'Standard oil & gas pipeline demonstration showcasing real industrial line tags (Line PL-100), NDT radiographic testing, and civil pump house pedestals.',
    csvFilename: 'paradip_pipeline_schedule.csv',
    csvData: `activity_code,description,discipline,line,location,planned_start,planned_end
PL-PIP-1001,Trenching and Stringing Sector 1,Piping,PL-100,Paradip Terminal,2026-09-01,2026-09-15
PL-PIP-1002,Mainline Welding & NDT Testing,Piping,PL-100,Paradip Terminal,2026-09-16,2026-09-28
PL-CIV-1003,Construct Pumping Station Pedestals,Civil,,Pumping Station A,2026-09-05,2026-09-20
PL-ELE-1004,Install SCADA Telemetry & Power Feeder,Electrical,,Control Building,2026-09-22,2026-09-30
PL-PIP-1005,Hydrostatic Pressure Testing Section 1,Piping,PL-100,Paradip Terminal,2026-10-01,2026-10-05
PL-HSE-1006,Pre-Commissioning Safety Integrity Check,HSE,,Pumping Station A,2026-10-06,2026-10-08`,
    reports: [
      {
        title: 'Sector 1 Mainline Progress Report',
        type: 'Progress Report (Happy Path)',
        content: `DAILY PROGRESS REPORT — PARADIP TERMINAL SECTOR 1
Date: 2026-09-08
Contractor: L&T Hydrocarbon Engineering
Author: Rajesh Mohanty (Site Execution Lead)

Executive Summary:
Mainline trenching along Sector 1 reached Chainage 14+200. Trenching and pipe stringing on Line PL-100 is progressing ahead of schedule with 85% linear progress completed. Excavation encountered hard rocky strata between Ch 12+800 and 13+400 requiring rock breaker deployment.

Activity Progress:
- Activity PL-PIP-1001 (Trenching and Stringing Sector 1): Completed 450m trenching today. 85% total completion achieved on Line PL-100.
- Activity PL-CIV-1003 (Construct Pumping Station Pedestals): Rebar tying completed for Pedestal P-01 and P-02 at Pumping Station A. Formwork 40% complete.`,
        expectedOutcome: {
          novaExtraction: 'Extracts PL-PIP-1001 at 85% (Line: PL-100) and PL-CIV-1003 at 40% (Location: Pumping Station A).',
          titanLinking: 'Titan V2 matches both activities with >97% confidence.',
          reviewQueueTier: 'Tier 1 Auto-Approved.',
          timelineImpact: 'Paradip Timeline Dashboard updates both activities live with instant progress visualizer.',
        },
      },
    ],
  },
];

const GLOSSARY_TERMS = [
  {
    engineering: 'Civil Works & Concrete Pouring',
    plain: 'Laying the foundation, digging trenches, and pouring concrete floors.',
    example: 'Pouring the floor of a metro station or building a concrete pump stand.',
  },
  {
    engineering: 'Piping, Spool & Stringing',
    plain: 'Laying out, welding, and connecting large industrial pipes for water, gas, or oil.',
    example: 'Connecting the pipe joints together along a 10km trench.',
  },
  {
    engineering: 'Static & Rotating Mechanical Equipment',
    plain: 'Heavy machines with moving or stationary parts (pumps, escalators, compressors).',
    example: 'Installing the motor and step tracks of a passenger escalator.',
  },
  {
    engineering: 'Instrumentation & SCADA',
    plain: 'Electronic sensors, digital control screens, pressure meters, and CCTV cameras.',
    example: 'Mounting surveillance cameras or digital temperature gauges that report back to a control room.',
  },
  {
    engineering: 'WBS (Work Breakdown Structure)',
    plain: 'A clean, step-by-step master checklist of all jobs required to finish the project.',
    example: 'Level 1: Build Station -> Level 2: Electrical -> Level 3: Install Light Bulbs.',
  },
  {
    engineering: 'Hydrostatic Pressure Testing (Hydrotest)',
    plain: 'Filling a pipe with pressurized water to check if there are any leaks before opening.',
    example: 'Pumping water at 50 PSI to guarantee the pipeline will never burst.',
  },
];

export default function TestOptionsPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('metro');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(true);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadCSV = (filename: string, data: string) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Demo Test Lab & Project Scenarios
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Ready to Test
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/architecture"
            className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            System Architecture
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Live Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Intro Hero Box */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium">
              <Lightbulb className="w-3.5 h-3.5" />
              Easy-to-Understand Testing Sandbox
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Test Progressly with Real-World Projects in Under 60 Seconds
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Whether you are an engineer or a general user, use these curated project examples to test 
              <strong className="text-white"> Multi-Project Onboarding</strong>, 
              <strong className="text-white"> Amazon Nova Micro Report Ingestion</strong>, and 
              <strong className="text-white"> Titan V2 Semantic Schedule Linking</strong>.
            </p>
          </div>
        </div>

        {/* Plain English vs Engineering Terms Cheatsheet (Collapsible) */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-md">
          <button
            onClick={() => setGlossaryOpen(!glossaryOpen)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  &ldquo;Plain English&rdquo; vs &ldquo;Engineering Jargon&rdquo; Cheat Sheet
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    For Normal People &amp; Judges
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  What complex terms like &ldquo;Backfill Foundation Area B&rdquo; or &ldquo;Spool Tie-In&rdquo; actually mean in plain words.
                </p>
              </div>
            </div>
            {glossaryOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {glossaryOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GLOSSARY_TERMS.map((term, idx) => (
                <div key={idx} className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {term.engineering}
                  </div>
                  <div className="text-xs font-medium text-emerald-400">
                    🗣️ Plain English: <span className="text-slate-200">{term.plain}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 italic">
                    💡 Example: {term.example}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Scenario Selector Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Select a Project Scenario to Test
            </h3>
            <span className="text-xs text-slate-400">
              Click any project card below to load its schedule & report examples
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCENARIOS.map((sc) => {
              const Icon = sc.icon;
              const isSelected = sc.id === selectedScenario;
              return (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${sc.badgeColor} flex items-center justify-center shadow-md`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.difficultyColor}`}
                      >
                        {sc.difficulty}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{sc.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{sc.organization}</p>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{sc.summary}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-indigo-400 font-medium flex items-center gap-1">
                      {isSelected ? 'Currently Viewing' : 'Click to View'}
                    </span>
                    <span className="text-slate-500">{sc.location}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Scenario Workspace */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-8 shadow-2xl">
          {/* Header Info */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {scenario.badge}
                </span>
                <span className="text-xs text-slate-400">• {scenario.location}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{scenario.name}</h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Why this is easy to explain:</span> {scenario.whyEasy}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadCSV(scenario.csvFilename, scenario.csvData)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Download CSV ({scenario.csvFilename})
              </button>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Open in App
              </Link>
            </div>
          </div>

          {/* Step 1: Baseline Schedule CSV */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  1
                </div>
                <h4 className="text-sm font-bold text-white">
                  Baseline Project Schedule (CSV Data)
                </h4>
              </div>
              <button
                onClick={() => handleCopy(scenario.csvData, 'csv')}
                className="text-xs text-slate-300 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey === 'csv' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy CSV Content
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              <pre className="whitespace-pre">{scenario.csvData}</pre>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                <strong>How to test this in the app:</strong> Click <strong>&ldquo;+ New Project&rdquo;</strong> in the top navigation, enter project name <em>&ldquo;{scenario.name}&rdquo;</em>, and upload this CSV file. Titan V2 will generate 1024-dim vector embeddings for each row.
              </span>
            </div>
          </div>

          {/* Step 2: Sample Daily Progress Reports */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                2
              </div>
              <h4 className="text-sm font-bold text-white">
                Sample Field Engineer Daily Site Reports
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {scenario.reports.map((report, rIdx) => (
                <div
                  key={rIdx}
                  className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">
                        {report.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          report.type.includes('Happy')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {report.type}
                      </span>
                    </div>

                    <div className="relative">
                      <div className="bg-slate-900/90 rounded-lg p-3.5 text-xs text-slate-300 font-mono leading-relaxed border border-slate-800 whitespace-pre-wrap">
                        {report.content}
                      </div>
                      <button
                        onClick={() => handleCopy(report.content, `report-${rIdx}`)}
                        className="absolute top-2.5 right-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 flex items-center gap-1 shadow transition-all cursor-pointer"
                      >
                        {copiedKey === `report-${rIdx}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[11px]">Copy Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* What to Expect Outcome Box */}
                  <div className="bg-slate-900/60 p-3.5 rounded-lg border border-indigo-500/20 space-y-2 text-xs">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      What Changes to Expect After Ingestion:
                    </div>
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li>
                        <strong className="text-slate-100">1. Nova Micro Extraction:</strong> {report.expectedOutcome.novaExtraction}
                      </li>
                      <li>
                        <strong className="text-slate-100">2. Titan V2 Schedule Linking:</strong> {report.expectedOutcome.titanLinking}
                      </li>
                      <li>
                        <strong className="text-slate-100">3. Review Queue Status:</strong> {report.expectedOutcome.reviewQueueTier}
                      </li>
                      <li>
                        <strong className="text-slate-100">4. Timeline Dashboard Impact:</strong> {report.expectedOutcome.timelineImpact}
                      </li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
