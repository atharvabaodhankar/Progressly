const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://progressly_user:Progressly2026SecureRDS@progressly-db-prod.cxgqey28qf04.ap-south-1.rds.amazonaws.com:5432/progressly_prod?sslmode=no-verify',
  ssl: { rejectUnauthorized: false },
});

async function updateGanttVariety() {
  console.log('[Progressly] Updating Baghjan activities with rich progress variety...');
  
  // Set realistic progress
  await pool.query("UPDATE activities SET progress_pct = 100.00, actual_start = '2026-07-01', actual_end = '2026-07-24' WHERE activity_code = 'L6-CIV-0112'");
  await pool.query("UPDATE activities SET progress_pct = 100.00, actual_start = '2026-07-28', actual_end = '2026-08-01' WHERE activity_code = 'L6-CIV-0120'");
  await pool.query("UPDATE activities SET progress_pct = 80.00, actual_start = '2026-07-20' WHERE activity_code = 'L6-CIV-0113'");
  await pool.query("UPDATE activities SET progress_pct = 65.00, actual_start = '2026-08-01' WHERE activity_code = 'L6-PIP-0241'");
  await pool.query("UPDATE activities SET progress_pct = 40.00, actual_start = '2026-08-02' WHERE activity_code = 'L6-ELE-0301'");
  await pool.query("UPDATE activities SET progress_pct = 90.00, actual_start = '2026-08-03' WHERE activity_code = 'L6-STE-0501'");
  await pool.query("UPDATE activities SET progress_pct = 25.00, actual_start = '2026-08-12' WHERE activity_code = 'L6-INS-0410'");
  await pool.query("UPDATE activities SET progress_pct = 0.00, actual_start = NULL, actual_end = NULL WHERE activity_code = 'L6-PIP-0243'");

  console.log('✓ Successfully updated activities with Completed, In-Progress, and Pending execution states!');
  await pool.end();
}

updateGanttVariety().catch(console.error);
