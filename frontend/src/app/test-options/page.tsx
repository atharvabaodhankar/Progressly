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
  LayoutDashboard,
  Upload,
  Network,
  Menu,
  X,
  FileCode,
  CheckCircle,
  BarChart3,
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
    badgeColor: 'from-blue-600 to-indigo-600',
    icon: Train,
    organization: 'Metro Rail Corporation',
    location: 'Central Junction Station',
    difficulty: 'Easy / Everyday',
    difficultyColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    summary: 'Construction and outfitting of a passenger metro station concourse, platforms, escalators, and ticketing gates.',
    whyEasy: 'Everyone understands escalators, granite flooring, CCTV security cameras, and ticketing gates. Zero chemical or oil jargon!',
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
          novaExtraction: 'Extracts 2 events: Escalator assembly at 75% (Location: Entry Hall A) and Concourse Lighting at 90% (Location: Main Concourse).',
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
          reviewQueueTier: 'Flags critical path delay for Planner Review in Tier 2 / Tier 1.',
          timelineImpact: 'Flags Platform 1 flooring as lagging behind baseline schedule with visual delay indicator.',
        },
      },
    ],
  },
  {
    id: 'solar',
    name: '50MW Thar Desert Solar Farm',
    badge: 'Clean Energy & Utilities',
    badgeColor: 'from-amber-500 to-orange-500',
    icon: Sun,
    organization: 'CleanGrid Energy Solutions',
    location: 'Jaisalmer Solar Park, Rajasthan',
    difficulty: 'Medium / Commercial',
    difficultyColor: 'bg-amber-50 text-amber-700 border-amber-200',
    summary: 'Ground-mount solar PV array installation, underground cabling, weather pyranometer sensors, and 33kV grid transformer synchronization.',
    whyEasy: 'Intuitive clean energy concepts: driving metal poles into the ground, bolting solar panels, and connecting inverters to the power grid.',
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
    badgeColor: 'from-purple-600 to-indigo-600',
    icon: Building2,
    organization: 'Indian Oil Corporation Ltd',
    location: 'Odisha / Andhra Pradesh',
    difficulty: 'Advanced / Industrial',
    difficultyColor: 'bg-purple-50 text-purple-700 border-purple-200',
    summary: 'Heavy hydrocarbon cross-country pipeline trenching, mainline pipe welding, pump station concrete pedestals, and hydrostatic pressure testing.',
    whyEasy: 'Standard mega-infrastructure demonstration showcasing industrial line tags (Line PL-100), NDT radiographic testing, and civil pump house pedestals.',
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
    plain: 'Laying foundations, digging trenches, and pouring solid concrete floors.',
    example: 'Pouring the floor of a metro station or building a pump mounting stand.',
  },
  {
    engineering: 'Piping, Spool & Stringing',
    plain: 'Laying out, welding, and connecting large pipes for water, gas, or fuel.',
    example: 'Connecting the pipe joints together along a 10-kilometer trench.',
  },
  {
    engineering: 'Static & Rotating Mechanical Equipment',
    plain: 'Heavy machines with moving or stationary parts (pumps, escalators, motors).',
    example: 'Installing the motor drive and step tracks of a passenger escalator.',
  },
  {
    engineering: 'Instrumentation & SCADA',
    plain: 'Electronic sensors, digital control screens, pressure meters, and CCTV cameras.',
    example: 'Mounting surveillance cameras or digital gauges that report back to a control room.',
  },
  {
    engineering: 'WBS (Work Breakdown Structure)',
    plain: 'A clean, step-by-step master checklist tree of all tasks required for the project.',
    example: 'Level 1: Build Station -> Level 2: Electrical -> Level 3: Install Concourse Lights.',
  },
  {
    engineering: 'Hydrostatic Pressure Testing (Hydrotest)',
    plain: 'Filling a pipe with pressurized water to guarantee zero leaks before opening.',
    example: 'Pumping water at 50 PSI to ensure the pipeline is 100% leak-proof.',
  },
];

export default function TestOptionsPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('metro');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[#F8FAFF] text-[#1B1B23] flex flex-col antialiased selection:bg-[#4648D4]/10 selection:text-[#4648D4]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-white z-50 flex-col border-r border-slate-200 justify-between">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Progressly</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Oil India Ltd • Baghjan</p>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="px-4 space-y-1 mt-2">
            <Link
              href="/"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Timeline Dashboard</span>
            </Link>

            <Link
              href="/?tab=review"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Review Queue</span>
            </Link>

            <Link
              href="/?tab=upload"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Upload Daily Report</span>
            </Link>

            <Link
              href="/?tab=memory"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>Project Memory (RAG)</span>
            </Link>

            <div className="pt-2 border-t border-slate-100 my-2" />

            <Link
              href="/analytics"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span>Token & Cost Telemetry</span>
            </Link>

            <Link
              href="/architecture"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Network className="w-4 h-4 text-slate-400" />
              <span>System Architecture</span>
            </Link>
          </nav>
        </div>

        {/* Quiet Infrastructure Status */}
        <div className="p-4 m-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AWS Bedrock & RDS Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ap-south-1 Mumbai Region</p>
        </div>
      </aside>

      {/* Main Content Wrap */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-20 bg-white/85 backdrop-blur-xl border-b border-[#C7C4D7]/30 px-4 sm:px-8 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {/* Mobile Menu Button & Title */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white p-1 shadow-sm border border-[#C7C4D7]/40 flex items-center justify-center">
                <img
                  src="/progressly-logo.png"
                  alt="Progressly Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-lg text-[#4648D4]">Progressly</span>
            </div>
          </div>

          {/* Breadcrumb / Title */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-[#64748B] hover:text-[#4648D4] transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-[#1B1B23]">Demo Test Lab & Project Scenarios</span>
            <span className="text-[10px] bg-indigo-50 text-[#4648D4] px-2 py-0.5 rounded-full border border-indigo-100 font-bold">
              Ready to Test
            </span>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-10 px-4 rounded-xl bg-[#4648D4] hover:bg-[#3B3DBF] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Live Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Timeline Dashboard</span>
            </Link>
            <Link
              href="/?tab=review"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Review Queue</span>
            </Link>
            <Link
              href="/?tab=upload"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Daily Report</span>
            </Link>
            <Link
              href="/?tab=memory"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              <span>Project Memory (RAG)</span>
            </Link>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Token & Cost Telemetry</span>
            </Link>
            <Link
              href="/architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Network className="w-4 h-4 text-slate-500" />
              <span>System Architecture</span>
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Hero Welcome Card */}
          <div className="bg-gradient-to-br from-white via-indigo-50/30 to-white rounded-3xl p-6 sm:p-8 border border-[#C7C4D7]/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#4648D4] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#4648D4]" />
                Interactive Evaluation Sandbox
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B1B23] tracking-tight">
                Test Progressly with Real-World Projects in Under 60 Seconds
              </h2>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Whether you are an engineer or evaluating as a general judge, use these ready-to-test project templates
                to verify <strong className="text-[#1B1B23]">Multi-Project Onboarding</strong>,{' '}
                <strong className="text-[#1B1B23]">Amazon Nova Micro Extraction</strong>, and{' '}
                <strong className="text-[#1B1B23]">Titan V2 Schedule Linking</strong>.
              </p>
            </div>
          </div>

          {/* Plain English vs Engineering Terms Cheatsheet */}
          <div className="bg-white rounded-3xl border border-[#C7C4D7]/40 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => setGlossaryOpen(!glossaryOpen)}
              className="w-full px-6 sm:px-8 py-5 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1B1B23] flex items-center gap-2">
                    &ldquo;Plain English&rdquo; vs &ldquo;Engineering Jargon&rdquo; Cheat Sheet
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      For Normal People &amp; Judges
                    </span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    What complex terms like &ldquo;Backfill Foundation Area B&rdquo; or &ldquo;Spool Tie-In&rdquo; mean in plain words.
                  </p>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                {glossaryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {glossaryOpen && (
              <div className="px-6 sm:px-8 pb-8 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GLOSSARY_TERMS.map((term, idx) => (
                  <div key={idx} className="bg-[#F8FAFF] p-4 rounded-2xl border border-indigo-100/60 space-y-2">
                    <div className="text-xs font-bold text-[#4648D4] flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#4648D4]" />
                      {term.engineering}
                    </div>
                    <div className="text-xs font-medium text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                      🗣️ <strong>Plain English:</strong> {term.plain}
                    </div>
                    <div className="text-[11px] text-[#64748B] italic">
                      💡 <strong>Example:</strong> {term.example}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Scenarios Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1B1B23] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#4648D4]" />
                Select a Project Scenario to Test
              </h3>
              <span className="text-xs text-[#64748B]">Click any card to inspect its schedule &amp; reports</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SCENARIOS.map((sc) => {
                const Icon = sc.icon;
                const isSelected = sc.id === selectedScenario;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc.id)}
                    className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#4648D4] ring-2 ring-[#4648D4]/20 shadow-xl'
                        : 'bg-white border-[#C7C4D7]/40 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sc.badgeColor} flex items-center justify-center shadow-md text-white`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sc.difficultyColor}`}
                        >
                          {sc.difficulty}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#1B1B23]">{sc.name}</h4>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">{sc.organization}</p>
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed line-clamp-2">{sc.summary}</p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[#4648D4] font-bold flex items-center gap-1">
                        {isSelected ? '✓ Selected' : 'Click to View'}
                      </span>
                      <span className="text-[#94A3B8] font-medium">{sc.location}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Active Workspace */}
          <div className="bg-white rounded-3xl border border-[#C7C4D7]/40 p-6 sm:p-8 space-y-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            {/* Header Info */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-[#4648D4] border border-indigo-100">
                    {scenario.badge}
                  </span>
                  <span className="text-xs text-[#64748B] font-medium">• {scenario.location}</span>
                </div>
                <h3 className="text-2xl font-extrabold text-[#1B1B23]">{scenario.name}</h3>
                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 max-w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Why this is easy to explain:</strong> {scenario.whyEasy}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadCSV(scenario.csvFilename, scenario.csvData)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1B1B23] text-xs font-bold border border-slate-200 flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#4648D4]" />
                  Download CSV ({scenario.csvFilename})
                </button>
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-[#4648D4] hover:bg-[#3B3DBF] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Open in App
                </Link>
              </div>
            </div>

            {/* Step 1: Baseline Schedule CSV */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#4648D4] text-xs font-extrabold flex items-center justify-center border border-indigo-100">
                    1
                  </div>
                  <h4 className="text-sm font-bold text-[#1B1B23]">
                    Baseline Project Schedule (CSV Data)
                  </h4>
                </div>
                <button
                  onClick={() => handleCopy(scenario.csvData, 'csv')}
                  className="text-xs font-semibold text-[#4648D4] bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey === 'csv' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy CSV Content
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 font-mono text-xs text-[#334155] overflow-x-auto">
                <pre className="whitespace-pre">{scenario.csvData}</pre>
              </div>

              <div className="text-xs text-[#475569] flex items-center gap-2 bg-[#F1F5F9] p-3.5 rounded-xl border border-[#E2E8F0]">
                <Info className="w-4 h-4 text-[#4648D4] flex-shrink-0" />
                <span>
                  <strong>How to test this in the app:</strong> Click <strong>&ldquo;+ New Project&rdquo;</strong> in the top navigation bar, enter project name <em>&ldquo;{scenario.name}&rdquo;</em>, and upload this CSV file. Amazon Bedrock Titan V2 will generate 1024-dim vector embeddings for each activity.
                </span>
              </div>
            </div>

            {/* Step 2: Sample Daily Progress Reports */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#4648D4] text-xs font-extrabold flex items-center justify-center border border-indigo-100">
                  2
                </div>
                <h4 className="text-sm font-bold text-[#1B1B23]">
                  Sample Field Engineer Daily Site Reports
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {scenario.reports.map((report, rIdx) => (
                  <div
                    key={rIdx}
                    className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4648D4]">
                          {report.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            report.type.includes('Happy')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {report.type}
                        </span>
                      </div>

                      <div className="relative">
                        <div className="bg-white rounded-xl p-4 text-xs text-[#334155] font-mono leading-relaxed border border-[#E2E8F0] whitespace-pre-wrap shadow-sm">
                          {report.content}
                        </div>
                        <button
                          onClick={() => handleCopy(report.content, `report-${rIdx}`)}
                          className="absolute top-2.5 right-2.5 text-xs bg-slate-100 hover:bg-slate-200 text-[#1B1B23] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 shadow-sm transition cursor-pointer"
                        >
                          {copiedKey === `report-${rIdx}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 text-[11px]">Copied!</span>
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
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2 text-xs shadow-sm">
                      <div className="font-bold text-[#4648D4] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        What Changes to Expect After Ingestion:
                      </div>
                      <ul className="space-y-1.5 text-[#475569] text-[11px]">
                        <li>
                          <strong className="text-[#1B1B23]">1. Nova Micro Extraction:</strong> {report.expectedOutcome.novaExtraction}
                        </li>
                        <li>
                          <strong className="text-[#1B1B23]">2. Titan V2 Schedule Linking:</strong> {report.expectedOutcome.titanLinking}
                        </li>
                        <li>
                          <strong className="text-[#1B1B23]">3. Review Queue Status:</strong> {report.expectedOutcome.reviewQueueTier}
                        </li>
                        <li>
                          <strong className="text-[#1B1B23]">4. Timeline Dashboard Impact:</strong> {report.expectedOutcome.timelineImpact}
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
    </div>
  );
}
