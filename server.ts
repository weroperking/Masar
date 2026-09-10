import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// Server-side storage for public lookup tokens and live summary records
interface LookupData {
  student: {
    id: string;
    name: string;
    studentCode?: string;
    gradeLevel?: string;
    school?: string;
  };
  attendance: {
    attended: number;
    missed: number;
    total: number;
    rate?: number;
  };
  exams: Array<{
    id: string;
    name: string;
    grade: number | string;
    maxGrade?: number;
    date?: string;
  }>;
  subscription: {
    status: 'paid' | 'partial' | 'overdue' | 'no_record';
    month?: number;
    year?: number;
    amountTotal?: number;
    amountPaid?: number;
  };
}

const lookupTokensMap = new Map<string, LookupData>();
const studentToTokenMap = new Map<string, string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Public Student Lookup endpoint (accessible with zero authentication)
  const handlePublicLookup = (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    if (!token) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const data = lookupTokensMap.get(token);
    if (!data) {
      return res.status(404).json({ error: 'This link is invalid or has expired' });
    }

    return res.status(200).json(data);
  };

  app.get('/api/public/lookup/:token', handlePublicLookup);
  app.get('/public/lookup/:token', handlePublicLookup);

  // Student Details lookup token retrieval
  const handleGetStudent = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const token = studentToTokenMap.get(id) || null;
    const lookupData = token ? lookupTokensMap.get(token) : null;
    
    res.status(200).json({
      id,
      public_lookup_token: token,
      lookup_data: lookupData
    });
  };

  app.get('/api/students/:id', handleGetStudent);
  app.get('/students/:id', handleGetStudent);

  // Generate / Regenerate Lookup Token for a Student
  const handleGenerateLookupToken = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const body = req.body || {};

    // Invalidate and remove old token if it exists
    const existingToken = studentToTokenMap.get(id);
    if (existingToken) {
      lookupTokensMap.delete(existingToken);
      studentToTokenMap.delete(id);
    }

    // Generate fresh cryptographic UUID token
    const newToken = crypto.randomUUID();

    const studentInfo = body.student || {
      id,
      name: body.name || 'طالب مسار',
      studentCode: body.studentCode || '',
      gradeLevel: body.gradeLevel || '',
      school: body.school || ''
    };

    const attendanceInfo = body.attendance || {
      attended: 0,
      missed: 0,
      total: 0,
      rate: 100
    };

    const examsInfo = Array.isArray(body.exams) ? body.exams : [];
    const subscriptionInfo = body.subscription || {
      status: 'no_record',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amountTotal: 0,
      amountPaid: 0
    };

    const record: LookupData = {
      student: {
        id,
        name: studentInfo.name,
        studentCode: studentInfo.studentCode,
        gradeLevel: studentInfo.gradeLevel,
        school: studentInfo.school
      },
      attendance: attendanceInfo,
      exams: examsInfo,
      subscription: subscriptionInfo
    };

    // Store new mapping
    lookupTokensMap.set(newToken, record);
    studentToTokenMap.set(id, newToken);

    console.log(`[API] Generated new public lookup token for student ${id} (${studentInfo.name}): ${newToken}`);

    res.status(200).json({
      success: true,
      token: newToken,
      public_lookup_token: newToken,
      url: `/s/${newToken}`
    });
  };

  app.post('/api/students/:id/lookup-token', handleGenerateLookupToken);
  app.post('/students/:id/lookup-token', handleGenerateLookupToken);

  // Sync / Update Live Data for Student Lookup Token
  const handleUpdateLookupData = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const token = studentToTokenMap.get(id);
    if (!token) {
      return res.status(404).json({ error: 'No active token for student' });
    }

    const existing = lookupTokensMap.get(token);
    if (existing) {
      if (req.body.student) existing.student = { ...existing.student, ...req.body.student };
      if (req.body.attendance) existing.attendance = { ...existing.attendance, ...req.body.attendance };
      if (req.body.exams) existing.exams = req.body.exams;
      if (req.body.subscription) existing.subscription = { ...existing.subscription, ...req.body.subscription };
      lookupTokensMap.set(token, existing);
    }

    res.status(200).json({ success: true, token });
  };

  app.put('/api/students/:id/lookup-data', handleUpdateLookupData);
  app.put('/students/:id/lookup-data', handleUpdateLookupData);

  // Mock Push endpoint for syncService
  app.post('/api/sync/push', (req, res) => {
    // In a real app, this would save to a database.
    // For now, we accept the push and return OK.
    const pendingData = req.body;
    console.log(`[API] Received push sync with ${pendingData.length} table groups.`);
    res.status(200).json({ success: true });
  });

  // Mock Pull endpoint for syncService
  app.get('/api/sync/pull', (req, res) => {
    // In a real app, this would fetch changes from a database since the provided timestamp.
    // For now, we return empty changes.
    const since = req.query.since;
    console.log(`[API] Received pull sync request since: ${since}`);
    res.status(200).json({});
  });

  // --- Vite Middleware (Development) or Static Serving (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
