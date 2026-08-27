import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// Helper to determine file_type from extension
function inferFileType(fileName: string): 'free-text' | 'csv' | 'pdf' | 'excel' | 'image' {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.xlsx' || ext === '.xls') return 'excel';
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image';
  return 'free-text';
}

// POST /reports - Upload file and save report record
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploaded_by = 'Site Supervisor', file_type } = req.body;
    let { project_id } = req.body;

    // If no project_id passed, grab the default project
    if (!project_id) {
      const defaultProject = await pool.query('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1');
      if (defaultProject.rows.length === 0) {
        res.status(400).json({ error: 'No project found. Please provide a valid project_id or run seed.' });
        return;
      }
      project_id = defaultProject.rows[0].id;
    }

    let filePath: string | null = null;
    let detectedFileType: 'free-text' | 'csv' | 'pdf' | 'excel' | 'image' = 'free-text';

    if (req.file) {
      filePath = req.file.path;
      detectedFileType = file_type || inferFileType(req.file.originalname);
    } else if (req.body.text_content) {
      // Allow raw free-text payload directly
      const textFileName = `report-${Date.now()}.txt`;
      filePath = path.join(uploadDir, textFileName);
      fs.writeFileSync(filePath, req.body.text_content, 'utf-8');
      detectedFileType = 'free-text';
    } else {
      res.status(400).json({ error: 'Either a multipart file or text_content must be provided.' });
      return;
    }

    const insertQuery = `
      INSERT INTO reports (project_id, uploaded_by, file_path, file_type, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      project_id,
      uploaded_by,
      filePath,
      detectedFileType,
    ]);

    res.status(201).json({
      message: 'Report uploaded successfully',
      report: result.rows[0],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload report';
    console.error('[BridgeIQ Backend] Error creating report:', error);
    res.status(500).json({ error: message });
  }
});

// GET /reports - List reports with optional ?status= filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, project_id } = req.query;
    const conditions: string[] = [];
    const params: string[] = [];

    if (status && typeof status === 'string') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (project_id && typeof project_id === 'string') {
      params.push(project_id);
      conditions.push(`project_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT r.*, p.name AS project_name
      FROM reports r
      JOIN projects p ON r.project_id = p.id
      ${whereClause}
      ORDER BY r.created_at DESC;
    `;

    const result = await pool.query(query, params);
    res.status(200).json({
      count: result.rows.length,
      reports: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    console.error('[BridgeIQ Backend] Error fetching reports:', error);
    res.status(500).json({ error: message });
  }
});

// GET /reports/:id - Fetch single report details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT r.*, p.name AS project_name
      FROM reports r
      JOIN projects p ON r.project_id = p.id
      WHERE r.id = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.status(200).json({ report: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report';
    console.error('[BridgeIQ Backend] Error fetching report:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
