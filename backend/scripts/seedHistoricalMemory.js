const { pool } = require('../dist/db');
const { getBedrockRuntimeClient } = require('../dist/bedrockClient');
const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const HISTORICAL_DATASET = [
  // PIPING - CLUSTER 1: MATERIAL SHORTAGES (~30%)
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

  // PIPING & MECHANICAL - CLUSTER 2: PRECEDING CIVIL DELAYS (~20%)
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
    notes: 'Access road excavation by the civil team blocked crane access needed to lift heavy piping spools into the compressor shelter.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'piping',
    activity_description: 'Position and align pump suction/discharge piping at P-102',
    planned_duration_days: 6,
    actual_duration_days: 12,
    delay_cause: 'preceding civil delay',
    notes: 'Civil equipment foundation foundation curing failed 7-day cube strength testing, requiring structural epoxy remediation before pump baseplate and piping could be set.',
  },
  {
    project_name: 'Bongaigaon Petrochem Terminal',
    discipline: 'piping',
    activity_description: 'Install flare line headers on elevated gantry structure',
    planned_duration_days: 18,
    actual_duration_days: 27,
    delay_cause: 'preceding civil delay',
    notes: 'Deep piling works for gantry column footings encountered underground boulder obstructions, delaying structural handover to the mechanical piping contractor by 9 days.',
  },

  // PIPING - CLUSTER 3: NDT & WELD REJECTIONS (~15%)
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'piping',
    activity_description: 'Radiographic testing and weld repair on 16-inch high-pressure gas headers',
    planned_duration_days: 8,
    actual_duration_days: 15,
    delay_cause: 'quality / NDT failure',
    notes: '18% radiographic rejection rate on heavy-wall butt welds due to root pass porosity caused by windy field conditions during stick welding. Grinding out and re-welding took 7 days.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'piping',
    activity_description: 'Hydrotest and nitrogen purging of crude export transfer line',
    planned_duration_days: 5,
    actual_duration_days: 11,
    delay_cause: 'quality / NDT failure',
    notes: 'Flange joint gasket blown during 1.5x design pressure hydrostatic test due to uneven bolt torque. Required depressurizing, drying line, replacing spiral-wound gaskets, and re-testing.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'piping',
    activity_description: 'Ultrasonic testing on duplex stainless steel separator piping',
    planned_duration_days: 6,
    actual_duration_days: 12,
    delay_cause: 'quality / NDT failure',
    notes: 'Phased array ultrasonic testing revealed lack of side-wall fusion in 4 out of 12 critical joints. Metallurgical investigation and qualified welder requalification caused a 6-day delay.',
  },

  // CIVIL - CLUSTER 1: MONSOON & WEATHER IMPACTS (~35%)
  {
    project_name: 'Baghjan Early Production System',
    discipline: 'civil',
    activity_description: 'Excavate and cast RCC foundations for separator vessel Skid-01',
    planned_duration_days: 14,
    actual_duration_days: 28,
    delay_cause: 'monsoon / rain flooding',
    notes: 'Continuous torrential pre-monsoon rain inundated open foundation trenches with 1.8m of water. Submersible dewatering pumps operated for 9 days, and soil mud slab required stabilization.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'civil',
    activity_description: 'Pour mass concrete raft for Main Gas Compressor Foundation',
    planned_duration_days: 10,
    actual_duration_days: 19,
    delay_cause: 'monsoon / rain flooding',
    notes: 'Flash flooding flooded the batching plant aggregate bins, altering moisture ratios. Concrete pours had to be suspended until dry aggregates were delivered.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'civil',
    activity_description: 'Construct perimeter security wall and drainage culverts',
    planned_duration_days: 21,
    actual_duration_days: 34,
    delay_cause: 'monsoon / rain flooding',
    notes: 'Severe monsoon waterlogging collapsed 120m of unreinforced trench embankment. Required sheet piling shoring and gravel backfilling before brick masonry could resume.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'civil',
    activity_description: 'Grade and compact heavy equipment haul road across Sector 4',
    planned_duration_days: 12,
    actual_duration_days: 21,
    delay_cause: 'monsoon / rain flooding',
    notes: 'Clay-rich subgrade turned into unworkable slush after 4 consecutive days of heavy precipitation. Soil stabilization with quicklime and geo-textile membrane added 9 days.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'civil',
    activity_description: 'Cast concrete sleeper foundations along Corridor North',
    planned_duration_days: 15,
    actual_duration_days: 24,
    delay_cause: 'monsoon / rain flooding',
    notes: 'High water table in monsoon prevented dry concrete placement. Required continuous well-point dewatering system installation before sleeper casting could finish.',
  },

  // CIVIL - CLUSTER 2: REBAR & CONCRETE SUPPLY ISSUES (~25%)
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'civil',
    activity_description: 'Rebar fixing and shuttering for Substation Building columns',
    planned_duration_days: 12,
    actual_duration_days: 20,
    delay_cause: 'material shortage',
    notes: 'Shortage of 25mm Fe500D TMT steel bars from approved primary steel mills (SAIL/Tata). Site was forced to wait for structural consultant clearance before substitute heat numbers could be used.',
  },
  {
    project_name: 'Bongaigaon Petrochem Terminal',
    discipline: 'civil',
    activity_description: 'Pave heavy-duty concrete flooring in Chemical Storage Yard',
    planned_duration_days: 16,
    actual_duration_days: 25,
    delay_cause: 'material shortage',
    notes: 'Local ready-mix concrete batching plant suffered mechanical silo breakdown and shortage of micro-silica additives, delaying continuous flooring pour by 9 days.',
  },
  {
    project_name: 'Baghjan Early Production System',
    discipline: 'civil',
    activity_description: 'Install pre-cast RCC cable trenches across Switchyard',
    planned_duration_days: 10,
    actual_duration_days: 16,
    delay_cause: 'material shortage',
    notes: 'Pre-cast vendor delivery schedule slipped by 2 weeks due to transport logistics strikes in the interstate highway corridor.',
  },

  // ELECTRICAL - CLUSTER 1: CABLE DELIVERIES & PULLING (~30%)
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'electrical',
    activity_description: 'Pull 11kV armored HV power cables from Substation to Compressor Skid',
    planned_duration_days: 12,
    actual_duration_days: 22,
    delay_cause: 'material shortage',
    notes: 'Factory acceptance testing (FAT) failure on 11kV cross-linked polyethylene (XLPE) insulated cables required factory re-sheathing and delayed site delivery by 10 days.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'electrical',
    activity_description: 'Lay and terminate 415V motor feeder cables at Motor Control Center (MCC)',
    planned_duration_days: 8,
    actual_duration_days: 15,
    delay_cause: 'material shortage',
    notes: 'Cable drums received had incorrect core cross-sectional area (185 sq mm instead of specified 240 sq mm). Cable pulling was suspended pending replacement drum arrival.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'electrical',
    activity_description: 'Install cable trays and route grounding conductor along Pipe Rack B',
    planned_duration_days: 14,
    actual_duration_days: 21,
    delay_cause: 'preceding mechanical delay',
    notes: 'Electricians could not access tier 2 of the pipe rack because mechanical contractor scaffolding had not been dismantled following hydrotesting.',
  },

  // ELECTRICAL - CLUSTER 2: TRANSFORMER & SWITCHGEAR TESTING (~20%)
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'electrical',
    activity_description: 'Commission 33kV/11kV 5MVA Oil-Immersed Power Transformer',
    planned_duration_days: 10,
    actual_duration_days: 18,
    delay_cause: 'equipment testing failure',
    notes: 'Dielectric breakdown voltage (BDV) test of insulating oil failed due to moisture ingress during transport. On-site oil filtration and vacuum degassing required 8 additional days.',
  },
  {
    project_name: 'Bongaigaon Petrochem Terminal',
    discipline: 'electrical',
    activity_description: 'Perform relay coordination and trip testing on HT Switchgear panel',
    planned_duration_days: 7,
    actual_duration_days: 13,
    delay_cause: 'engineering change',
    notes: 'Consultant revised fault-level calculation parameters after utility grid upgrade, requiring reconfiguration and testing of numerical protection relays.',
  },

  // INSTRUMENTATION & CONTROL (~15%)
  {
    project_name: 'Baghjan Early Production System',
    discipline: 'instrumentation',
    activity_description: 'Calibrate and loop-check Emergency Shutdown (ESD) valves on Test Separator',
    planned_duration_days: 9,
    actual_duration_days: 17,
    delay_cause: 'vendor specialist unavailability',
    notes: 'OEM vendor commissioning engineer for SIL-3 rated pneumatic actuator positioners was delayed on overseas visa clearance, pushing loop checking out by 8 days.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'instrumentation',
    activity_description: 'Install Coriolis mass flowmeters on custody transfer gas metering skid',
    planned_duration_days: 6,
    actual_duration_days: 13,
    delay_cause: 'material shortage',
    notes: 'Flowmeter sensors were held up at international customs clearance due to dual-use certification documentation requirements.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'instrumentation',
    activity_description: 'Terminate field instrument multicore cables at DCS Marshalling Cabinet',
    planned_duration_days: 11,
    actual_duration_days: 18,
    delay_cause: 'engineering change',
    notes: 'Late revisions to Cause & Effect matrix diagram from the process licensor required rewiring 48 terminal blocks in the marshalling cabinets.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'instrumentation',
    activity_description: 'Mount and calibrate pressure transmitters on crude oil surge vessel',
    planned_duration_days: 5,
    actual_duration_days: 10,
    delay_cause: 'quality / calibration failure',
    notes: 'Diaphragm seal capillary tubes on high-temperature pressure transmitters showed zero-shift drift during 5-point calibration, requiring factory recalibration.',
  },

  // HSE & PERMITTING (~10%)
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'HSE',
    activity_description: 'Erect scaffolding and establish safety barriers for confined space entry',
    planned_duration_days: 4,
    actual_duration_days: 8,
    delay_cause: 'regulatory / safety hold',
    notes: 'Safety inspection identified non-compliant green tagging on scaffolding platforms and inadequate LEL gas detectors. Safety stop-work notice delayed work by 4 days.',
  },
  {
    project_name: 'Bongaigaon Petrochem Terminal',
    discipline: 'HSE',
    activity_description: 'Hydrocarbon gas freeing and hot work permitting for tank tie-in',
    planned_duration_days: 5,
    actual_duration_days: 11,
    delay_cause: 'regulatory / safety hold',
    notes: 'Trace toxic VOC readings detected in flare header line required extended nitrogen purging and third-party laboratory gas chromatograph certification.',
  },

  // ON-SCHEDULE EXAMPLES (CONTROL GROUP ~15%)
  {
    project_name: 'Baghjan Early Production System',
    discipline: 'piping',
    activity_description: 'Bolt-up spool connections on instrument air distribution manifold',
    planned_duration_days: 6,
    actual_duration_days: 6,
    delay_cause: null,
    notes: 'Completed on schedule without any technical or material deviations. Pre-assembled skids fit exactly to connection coordinates.',
  },
  {
    project_name: 'Duliajan Phase 2 Expansion',
    discipline: 'civil',
    activity_description: 'Construct concrete bund wall around Diesel Fuel Storage Tank',
    planned_duration_days: 14,
    actual_duration_days: 14,
    delay_cause: null,
    notes: 'Executed on schedule. Shuttering and ready-mix concrete pours proceeded continuously with zero safety or quality incidents.',
  },
  {
    project_name: 'Numaligarh Offsite Piping Project',
    discipline: 'electrical',
    activity_description: 'Install earthing grid and copper bonding strips in Transformer Yard',
    planned_duration_days: 8,
    actual_duration_days: 8,
    delay_cause: null,
    notes: 'Completed strictly within 8 planned days. Soil resistivity measurements met specification on initial measurement.',
  },
  {
    project_name: 'Moran Gas Gathering Station Upgrade',
    discipline: 'instrumentation',
    activity_description: 'Install local pressure gauges and thermowells on flare knock-out drum',
    planned_duration_days: 4,
    actual_duration_days: 4,
    delay_cause: null,
    notes: 'All 14 gauges and thermowell assemblies installed and leak tested on time.',
  },
  {
    project_name: 'Jorhat Pipeline Expansion',
    discipline: 'piping',
    activity_description: 'Fit-up and weld standard 8-inch utility water line across Area 1',
    planned_duration_days: 10,
    actual_duration_days: 10,
    delay_cause: null,
    notes: 'All 32 butt welds passed visual and 100% dye-penetrant inspection on initial test.',
  },
  {
    project_name: 'Digboi Refinery Modernization',
    discipline: 'civil',
    activity_description: 'Install precast concrete drainage covers in Tank Farm corridor',
    planned_duration_days: 5,
    actual_duration_days: 5,
    delay_cause: null,
    notes: 'Delivered and positioned according to daily work plan with 100% dimensional adherence.',
  },
  {
    project_name: 'Bongaigaon Petrochem Terminal',
    discipline: 'electrical',
    activity_description: 'Install perimeter floodlighting poles and LED luminaires',
    planned_duration_days: 7,
    actual_duration_days: 7,
    delay_cause: null,
    notes: 'All 8 mast lightings assembled, erected, and illuminated within the 7-day schedule window.',
  },
  {
    project_name: 'Baghjan Early Production System',
    discipline: 'instrumentation',
    activity_description: 'Route fiber-optic communication cable from Control Room to Fire Station',
    planned_duration_days: 8,
    actual_duration_days: 8,
    delay_cause: null,
    notes: 'OTDR attenuation test showed optimal signal transmission below 0.2 dB/km across all 12 cores.',
  },
];

async function seed() {
  console.log('[Seed Historical] Seeding 40 historical memory records...');
  const client = getBedrockRuntimeClient();
  const embeddingModelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS historical_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_name VARCHAR(255) NOT NULL,
      discipline VARCHAR(50) NOT NULL,
      activity_description TEXT NOT NULL,
      planned_duration_days INT NOT NULL,
      actual_duration_days INT NOT NULL,
      delay_days INT GENERATED ALWAYS AS (actual_duration_days - planned_duration_days) STORED,
      delay_cause TEXT,
      notes TEXT,
      embedding TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Clear existing
  await pool.query('DELETE FROM historical_records');

  let count = 0;
  for (const record of HISTORICAL_DATASET) {
    const textToEmbed = `${record.activity_description}. Discipline: ${record.discipline}. Delay cause: ${
      record.delay_cause || 'none'
    }. Notes: ${record.notes}`;

    let vector = null;
    try {
      const titanCommand = new InvokeModelCommand({
        modelId: embeddingModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: textToEmbed,
          dimensions: 1024,
          normalize: true,
        }),
      });
      const titanRes = await client.send(titanCommand);
      const titanJson = JSON.parse(new TextDecoder().decode(titanRes.body));
      vector = titanJson.embedding;
    } catch (e) {
      console.warn(`[Bedrock Warning] Failed to embed: "${record.activity_description}". Error:`, e.message);
    }

    const vectorStr = vector ? JSON.stringify(vector) : null;

    await pool.query(
      `INSERT INTO historical_records (
        project_name, discipline, activity_description,
        planned_duration_days, actual_duration_days, delay_cause, notes, embedding
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.project_name,
        record.discipline,
        record.activity_description,
        record.planned_duration_days,
        record.actual_duration_days,
        record.delay_cause,
        record.notes,
        vectorStr,
      ]
    );

    count++;
    if (count % 5 === 0 || count === HISTORICAL_DATASET.length) {
      console.log(`[Seed Historical] ✓ Seeded ${count}/${HISTORICAL_DATASET.length} records`);
    }
  }

  console.log(`[Seed Historical] ✓ Completed seeding all ${count} historical memory records with Titan V2 embeddings!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed Historical Error]:', err);
  process.exit(1);
});
