import { Client } from 'pg';
import { BedrockTitanEmbeddingProvider } from '../embeddingProvider';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';

interface HistoricalSeedRecord {
  project_name: string;
  discipline: string;
  activity_description: string;
  planned_duration_days: number;
  actual_duration_days: number;
  delay_cause: string | null;
  notes: string;
}

const HISTORICAL_DATASET: HistoricalSeedRecord[] = [
  // ==========================================
  // PIPING - CLUSTER 1: MATERIAL SHORTAGES (~30% of piping delays)
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'piping',
    activity_description: 'Erect 24-inch crude header spools at Tank Farm 3',
    planned_duration_days: 14,
    actual_duration_days: 26,
    delay_cause: 'material shortage',
    notes: 'Severe delay caused by non-delivery of ASTM A106 Grade B pipe fittings and 300# flanges from the regional vendor. Spool fabrication was halted for 12 days awaiting materials.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'piping',
    activity_description: 'Install stainless steel 316L bypass spools on Line 18',
    planned_duration_days: 8,
    actual_duration_days: 18,
    delay_cause: 'material shortage',
    notes: 'Specialty high-pressure stainless steel seamless spools were delayed at port customs. Crew had to be reassigned to secondary pipe rack supports while awaiting delivery.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'piping',
    activity_description: 'Fit-up and weld carbon steel manifold lines 12-CS-04',
    planned_duration_days: 10,
    actual_duration_days: 19,
    delay_cause: 'material shortage',
    notes: 'Shortage of approved low-temperature carbon steel welding filler consumables and matching blind flanges delayed manifold fit-up by 9 days.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'piping',
    activity_description: 'Fabricate and erect condensate drain lines on Unit 400',
    planned_duration_days: 7,
    actual_duration_days: 14,
    delay_cause: 'material shortage',
    notes: 'Vendor delivered incorrect schedule 80 wall-thickness elbows instead of schedule 160. Work was paused until emergency air shipment of correct piping materials arrived.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'piping',
    activity_description: 'Install high-pressure gas injection piping spools',
    planned_duration_days: 12,
    actual_duration_days: 22,
    delay_cause: 'material shortage',
    notes: 'Critical path delay due to lead-time failure on cryogenic ball valves and Class 600 gasket sets. Piping contractor could not close tie-in spools without valves.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'piping',
    activity_description: 'Lay underground firewater ring main piping Section C',
    planned_duration_days: 20,
    actual_duration_days: 31,
    delay_cause: 'material shortage',
    notes: 'Batch manufacturing defects in factory-applied 3LPE external coating required rejecting 400m of ductile iron pipes. Waiting for re-coated pipe shipment created an 11-day delay.',
  },

  // ==========================================
  // PIPING & MECHANICAL - CLUSTER 2: PRECEDING CIVIL DELAYS (~20%)
  // ==========================================
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'piping',
    activity_description: 'Erect overhead pipe rack spools across Area 3 corridor',
    planned_duration_days: 15,
    actual_duration_days: 24,
    delay_cause: 'preceding civil delay',
    notes: 'Piping erection crew could not access the corridor because the civil contractor had not completed concrete anchor pedastals and structural steel column grouting.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'piping',
    activity_description: 'Tie-in interconnecting utility piping to main compressor shelter',
    planned_duration_days: 9,
    actual_duration_days: 16,
    delay_cause: 'preceding civil delay',
    notes: 'Civil handover of the compressor equipment pit was 7 days behind schedule due to water ingress in unbackfilled trenches. Piping alignment was forced to wait.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'static/rotating',
    activity_description: 'Position and align heavy feed pump skids P-101A/B',
    planned_duration_days: 6,
    actual_duration_days: 13,
    delay_cause: 'preceding civil delay',
    notes: 'Pump foundation concrete did not achieve 28-day target compressive strength on time. Skid placement was halted to prevent micro-cracking of the foundation block.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'piping',
    activity_description: 'Install separator inlet piping and valve manifold',
    planned_duration_days: 11,
    actual_duration_days: 18,
    delay_cause: 'preceding civil delay',
    notes: 'Civil anchor bolts were embedded with 25mm misalignment on the vessel saddle support, requiring 7 days of structural chipping, rebar verification, and epoxy re-grouting.',
  },

  // ==========================================
  // PIPING - OTHER (MINOR DELAYS & ON SCHEDULE)
  // ==========================================
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'piping',
    activity_description: 'Hydrostatic pressure test of fuel oil line 16-FO-01',
    planned_duration_days: 5,
    actual_duration_days: 7,
    delay_cause: 'permit/inspection hold',
    notes: 'Minor 2-day hold while third-party inspection agency (TPI) verified pressure chart recorder calibration certificates before approving test pressurization.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'piping',
    activity_description: 'Apply wrap insulation and cladding to hot steam tracer lines',
    planned_duration_days: 8,
    actual_duration_days: 9,
    delay_cause: 'weather',
    notes: 'Unseasonal heavy monsoon downpour prevented fiberglass insulation application for 1 day to avoid moisture entrapment.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'piping',
    activity_description: 'Weld and NDT 100% radiography on Line 24 field joints',
    planned_duration_days: 10,
    actual_duration_days: 10,
    delay_cause: null,
    notes: 'Completed exactly on schedule. Zero weld repairs required on all 42 butt welds; RT inspection cleared on first pass.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'piping',
    activity_description: 'Golden tie-in weld execution during scheduled plant shutdown',
    planned_duration_days: 3,
    actual_duration_days: 3,
    delay_cause: null,
    notes: 'Night shift hot-tap and golden weld completed within the 72-hour turnaround window with full safety clearance.',
  },

  // ==========================================
  // CIVIL DISCIPLINE RECORDS
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'civil',
    activity_description: 'Deep excavation and sheet piling for crude tank foundation TK-02',
    planned_duration_days: 21,
    actual_duration_days: 29,
    delay_cause: 'weather',
    notes: 'Heavy monsoon rains flooded the 4m excavation pit. Required continuous high-capacity dewatering pumps and soil re-compaction testing before raft rebar placement.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'civil',
    activity_description: 'Construct reinforced concrete bund wall around storage area',
    planned_duration_days: 14,
    actual_duration_days: 15,
    delay_cause: 'minor labor shortage',
    notes: 'Shuttering carpenter sub-contractor experienced high festival absenteeism; resolved within 24 hours by mobilizing standby crew.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'civil',
    activity_description: 'Pour mass concrete slab for substructure Area B',
    planned_duration_days: 10,
    actual_duration_days: 10,
    delay_cause: null,
    notes: 'Continuous RMC pour executed smoothly over 36 hours. Curing blankets installed immediately; compressive strength tests met specification.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'civil',
    activity_description: 'Cast-in-situ concrete pipe sleeper foundations along corridor',
    planned_duration_days: 18,
    actual_duration_days: 20,
    delay_cause: 'permit/inspection hold',
    notes: 'Encountered unmapped existing buried telecom cable during manual trial trenching. Work paused 2 days for utility clearance.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'civil',
    activity_description: 'Paving and storm water drainage channels around pump house',
    planned_duration_days: 12,
    actual_duration_days: 12,
    delay_cause: null,
    notes: 'Slope grading and precast drain covers installed on schedule with zero quality non-conformance.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'civil',
    activity_description: 'Backfill and compaction around foundation Area B',
    planned_duration_days: 8,
    actual_duration_days: 8,
    delay_cause: null,
    notes: 'Completed in 250mm compacted layers with nuclear density testing confirming 98% Proctor density on each lift.',
  },

  // ==========================================
  // ELECTRICAL DISCIPLINE RECORDS
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'electrical',
    activity_description: 'Install heavy cable tray network in Substation 2',
    planned_duration_days: 10,
    actual_duration_days: 16,
    delay_cause: 'material shortage',
    notes: 'Perforated hot-dip galvanized cable tray bends and heavy-duty unistrut brackets were under-shipped by supplier, causing a 6-day installation halt.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'electrical',
    activity_description: 'Pull 11kV medium voltage power feeder cables from Grid SS',
    planned_duration_days: 12,
    actual_duration_days: 14,
    delay_cause: 'contractor manpower shortage',
    notes: 'Specialized cable pulling winch crew was delayed on an adjoining gas plant shutdown, causing a 2-day start lag.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'electrical',
    activity_description: 'Install and terminate 415V motor control center (MCC) panels',
    planned_duration_days: 9,
    actual_duration_days: 9,
    delay_cause: null,
    notes: 'Busbar torque verification and hi-pot dielectric insulation testing completed flawlessly on schedule.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'electrical',
    activity_description: 'Install explosion-proof plant perimeter lighting and earthing grid',
    planned_duration_days: 15,
    actual_duration_days: 16,
    delay_cause: 'weather',
    notes: 'Exothermic weld earthing connections delayed by 1 day due to surface moisture and light rain.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'electrical',
    activity_description: 'Commission emergency diesel generator (EDG) automatic transfer switch',
    planned_duration_days: 5,
    actual_duration_days: 5,
    delay_cause: null,
    notes: 'Full load test and blackout simulation successfully triggered transfer switch in 6.2 seconds, well within specification.',
  },

  // ==========================================
  // INSTRUMENTATION DISCIPLINE RECORDS
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'instrumentation',
    activity_description: 'Install radar tank gauging transmitters and remote telemetry',
    planned_duration_days: 7,
    actual_duration_days: 13,
    delay_cause: 'material shortage',
    notes: 'Custom HART-compatible guided wave radar sensor antennas were delayed during international freight transit for 6 days.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'instrumentation',
    activity_description: 'Run stainless steel instrument impulse tubing for orifice meters',
    planned_duration_days: 8,
    actual_duration_days: 9,
    delay_cause: 'permit/inspection hold',
    notes: 'Nitrogen leak test signoff delayed 1 day awaiting client instrumentation engineer counter-signature.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'instrumentation',
    activity_description: 'Loop check and calibration of automated emergency shutdown valves (ESDVs)',
    planned_duration_days: 6,
    actual_duration_days: 6,
    delay_cause: null,
    notes: 'All 18 ESDVs verified for full stroke time (<2.5 sec) and smart positioner feedback loop integrity.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'instrumentation',
    activity_description: 'Install distributed control system (DCS) Marshalling Cabinets',
    planned_duration_days: 10,
    actual_duration_days: 12,
    delay_cause: 'preceding civil delay',
    notes: 'HVAC positive-pressure clean air conditioning in the central control room was not commissioned on time, delaying electronic cabinet uncrating.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'instrumentation',
    activity_description: 'Deploy ultrasonic gas flow meters on sales metering skid',
    planned_duration_days: 5,
    actual_duration_days: 5,
    delay_cause: null,
    notes: 'Calibration certificates validated; zero-flow noise verification test passed on first attempt.',
  },

  // ==========================================
  // STATIC / ROTATING MECHANICAL RECORDS
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'static/rotating',
    activity_description: 'Erect vertical hydrocarbon separator column C-102',
    planned_duration_days: 8,
    actual_duration_days: 10,
    delay_cause: 'weather',
    notes: 'Heavy wind gusting above 35 knots exceeded maximum crane safety limits for tandem heavy lift on day 3, delaying column rigging.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'static/rotating',
    activity_description: 'Align and grout multistage crude booster pump P-201',
    planned_duration_days: 6,
    actual_duration_days: 11,
    delay_cause: 'material shortage',
    notes: 'Missing precision stainless steel shim sets and API-compliant mechanical seal spare kits held up final shaft laser alignment for 5 days.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'static/rotating',
    activity_description: 'Install internal distillation trays in Fractionation Column',
    planned_duration_days: 14,
    actual_duration_days: 14,
    delay_cause: null,
    notes: 'Clean room protocol observed; all 36 bubble cap trays levelled within 1mm tolerance with full QA signoff.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'static/rotating',
    activity_description: 'Hydrotest and box-up of shell-and-tube heat exchanger E-104',
    planned_duration_days: 7,
    actual_duration_days: 8,
    delay_cause: 'permit/inspection hold',
    notes: 'Channel cover gasket seating inspection required re-torquing and 24-hour hold verification.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'static/rotating',
    activity_description: 'Perform laser optical shaft alignment on gas compressor skid K-301',
    planned_duration_days: 5,
    actual_duration_days: 5,
    delay_cause: null,
    notes: 'Cold and hot alignment offsets achieved within 0.03mm radial and axial runout specification.',
  },

  // ==========================================
  // HSE DISCIPLINE RECORDS
  // ==========================================
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'hse',
    activity_description: 'Commission plant optical flame and toxic gas detection system',
    planned_duration_days: 6,
    actual_duration_days: 6,
    delay_cause: null,
    notes: 'All 32 infrared flame detectors and hydrogen sulfide sensors bump-tested; executive shutdown voting logic verified.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'hse',
    activity_description: 'Full-flow discharge test of deluge foam suppression system on Tank 01',
    planned_duration_days: 4,
    actual_duration_days: 5,
    delay_cause: 'minor equipment adjustment',
    notes: 'Proportioner foam ratio calibrated on second run to achieve exact 3% aqueous film-forming foam (AFFF) mixture.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'hse',
    activity_description: 'Install safety shower and eye wash emergency stations along units',
    planned_duration_days: 5,
    actual_duration_days: 5,
    delay_cause: null,
    notes: 'Potable water pressure and tepid temperature blending valves commissioned across all 8 field safety stations.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'hse',
    activity_description: 'Pre-startup safety review (PSSR) walkthrough and punch list closure',
    planned_duration_days: 7,
    actual_duration_days: 8,
    delay_cause: 'inspection punch closure',
    notes: 'Cat B safety signboards and valve tagging completed prior to hydrocarbon introduction.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'hse',
    activity_description: 'Erect blast wall safety barriers adjacent to control building',
    planned_duration_days: 10,
    actual_duration_days: 10,
    delay_cause: null,
    notes: 'Pre-stressed reinforced blast panels anchored and certified for 0.5 bar overpressure resistance.',
  },
];

async function seedHistoricalRecords() {
  console.log('================================================================');
  console.log('       BridgeIQ — Seeding Synthetic Historical Records for RAG   ');
  console.log('================================================================\n');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const embedder = new BedrockTitanEmbeddingProvider();

  try {
    // 1. Clear existing historical records
    await client.query('DELETE FROM historical_records');
    console.log(`Cleared previous records. Generating Titan V2 embeddings for ${HISTORICAL_DATASET.length} past project records...\n`);

    let count = 0;
    for (const record of HISTORICAL_DATASET) {
      count++;
      const textToEmbed = `${record.activity_description}. Discipline: ${record.discipline}. Delay cause: ${
        record.delay_cause || 'none'
      }. Notes: ${record.notes}`;

      process.stdout.write(`[${count}/${HISTORICAL_DATASET.length}] Embedding: "${record.activity_description.slice(0, 45)}..." `);
      const start = Date.now();
      const embedding = await embedder.embed(textToEmbed);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`(${elapsed}s, 1024d)`);

      const formattedVector = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO historical_records (
          project_name, discipline, activity_description,
          planned_duration_days, actual_duration_days, delay_cause, notes, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
        [
          record.project_name,
          record.discipline,
          record.activity_description,
          record.planned_duration_days,
          record.actual_duration_days,
          record.delay_cause,
          record.notes,
          formattedVector,
        ]
      );
    }

    console.log('\n================================================================');
    console.log(`✓ Successfully seeded and embedded ${count} historical project records!`);
    console.log('================================================================\n');
  } finally {
    await client.end();
  }
}

seedHistoricalRecords().catch((err) => {
  console.error('Failed to seed historical records:', err);
  process.exit(1);
});
