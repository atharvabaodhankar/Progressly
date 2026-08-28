import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp'];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  },
});

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
    let s3Key: string | null = null;

    if (req.file) {
      filePath = req.file.path;
      detectedFileType = file_type || inferFileType(req.file.originalname);
    } else if (req.body.text_content && typeof req.body.text_content === 'string' && req.body.text_content.trim().length > 0) {
      // Allow raw free-text payload directly
      const textFileName = `report-${Date.now()}.txt`;
      filePath = path.join(uploadDir, textFileName);
      fs.writeFileSync(filePath, req.body.text_content.trim(), 'utf-8');
      detectedFileType = 'free-text';
    } else {
      res.status(400).json({ error: 'Either a valid multipart file or non-empty text_content must be provided.' });
      return;
    }

    // Upload to S3 if configured
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const awsRegion = process.env.AWS_REGION || 'ap-south-1';

    if (s3Bucket && filePath && fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        s3Key = `reports/${Date.now()}-${fileName}`;
        const s3Client = new S3Client({ region: awsRegion });
        await s3Client.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: fileContent,
            ContentType: req.file?.mimetype || 'text/plain',
          })
        );
        console.log(`[BridgeIQ Backend] Successfully uploaded report to s3://${s3Bucket}/${s3Key}`);
      } catch (s3Err) {
        console.error('[BridgeIQ Backend] S3 upload error:', s3Err);
      }
    }

    const insertQuery = `
      INSERT INTO reports (project_id, uploaded_by, file_path, file_type, s3_key, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      project_id,
      uploaded_by,
      filePath,
      detectedFileType,
      s3Key,
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

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({ error: 'Invalid report ID format. Must be a valid UUID.' });
      return;
    }

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
