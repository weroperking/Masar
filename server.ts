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

// Server-side storage for upgrade proposals
interface UpgradeProposalRecord {
  orgId: string;
  requestedPlan: string;
  status: 'pending' | 'approved' | 'rejected' | 'none';
  createdAt: string;
}

const lookupTokensMap = new Map<string, LookupData>();
const studentToTokenMap = new Map<string, string>();
const upgradeProposalsMap = new Map<string, UpgradeProposalRecord>();

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

  // Center SaaS subscription status endpoint (Proxy)
  const handleSubscriptionStatus = async (req: express.Request, res: express.Response) => {
    const authHeader = req.headers.authorization;
    const orgId = req.query.orgId as string;
    
    // First, check local memory for approved upgrade proposals
    if (orgId) {
      const localProposal = upgradeProposalsMap.get(orgId);
      if (localProposal && localProposal.status === 'approved') {
        return res.status(200).json({
          plan: localProposal.requestedPlan,
          status: 'active',
          trial_ends_at: null,
          days_remaining: 0,
          limits: {
            max_branches: 10,
            max_students: 5000,
            inventory_sales: true,
            combined_packages: true,
            advanced_analytics: true,
            api_access: true,
          }
        });
      }
    }

    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/me/subscription-status${orgId ? `?orgId=${orgId}` : ''}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': authHeader || ''
        }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Subscription Proxy] Upstream OK for org ${orgId}:`, JSON.stringify(data));
        return res.status(200).json(data);
      } else if (response.status === 402) {
        const errData = await response.json().catch(() => ({}));
        console.log(`[Subscription Proxy] Upstream 402 for org ${orgId}:`, JSON.stringify(errData));
        return res.status(402).json(errData);
      }
      
      console.warn(`[Subscription Proxy] Upstream returned status ${response.status} for org ${orgId}`);
      // If the upstream doesn't exist or returns 404, return 404 to let frontend fallback smoothly
      return res.status(404).json({ error: 'Not found' });
    } catch (error) {
      console.warn('[Proxy Warning] Fetch subscription status timed out or failed:', error);
      return res.status(404).json({ error: 'Upstream unavailable' });
    }
  };

  app.get('/api/me/subscription-status', handleSubscriptionStatus);
  app.get('/me/subscription-status', handleSubscriptionStatus);

  // Server-side Proxy for Upgrade Proposals (bypasses browser CORS issues)
  const handleProposalStatus = async (req: express.Request, res: express.Response) => {
    const orgId = req.params.id;
    const authHeader = req.headers.authorization;
    
    // Check local store first if proposal is pending
    const localProposal = upgradeProposalsMap.get(orgId);
    if (localProposal && localProposal.status === 'pending') {
      return res.status(200).json({
        status: localProposal.status,
        requested_plan: localProposal.requestedPlan,
        requestedPlan: localProposal.requestedPlan,
        created_at: localProposal.createdAt
      });
    }

    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/orgs/${orgId}/upgrade-proposal/status`;
      console.log(`[Proxy] GET status from upstream: ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': authHeader || ''
        }
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log(`[Proxy] Upstream status response (${response.status}):`, responseText);

      // If upstream returns 402 NO_SUBSCRIPTION or status: none, it's a valid initial state (not an error)
      if (response.status === 402 || !response.ok) {
        return res.status(200).json({ status: localProposal?.status || 'none', plan: 'none' });
      }
      
      try {
        const data = JSON.parse(responseText);
        if (data.status === 'pending' || data.status === 'approved') {
          upgradeProposalsMap.set(orgId, {
            orgId,
            requestedPlan: data.requested_plan || data.requestedPlan || 'pro',
            status: data.status,
            createdAt: data.created_at || new Date().toISOString()
          });
        }
        return res.status(200).json(data);
      } catch {
        return res.status(200).json({ status: localProposal?.status || 'none' });
      }
    } catch (error: any) {
      console.warn('[Proxy Warning] Fetch proposal status timed out or failed:', error);
      return res.status(200).json({ status: localProposal?.status || 'none', plan: 'none' });
    }
  };

  app.get('/api/orgs/:id/upgrade-proposal/status', handleProposalStatus);
  app.get('/orgs/:id/upgrade-proposal/status', handleProposalStatus);

  const handleProposalSubmit = async (req: express.Request, res: express.Response) => {
    const orgId = req.params.id;
    const authHeader = req.headers.authorization;
    const requestedPlan = req.body.requested_plan || req.body.requestedPlan || 'pro';

    // Store in memory so it persists across refreshes
    const proposalRecord: UpgradeProposalRecord = {
      orgId,
      requestedPlan,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    upgradeProposalsMap.set(orgId, proposalRecord);
    console.log(`[Proxy] Recorded upgrade proposal in memory for org ${orgId} to plan ${requestedPlan}`);

    try {
      const targetUrl = `https://masar-api.weroperking.workers.dev/api/orgs/${orgId}/upgrade-proposal`;
      console.log(`[Proxy] POST proposal to upstream: ${targetUrl}`);
      
      const payload = {
        ...req.body,
        requestedPlan,
        requested_plan: requestedPlan
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || ''
        },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log(`[Proxy] Upstream submit response (${response.status}):`, responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          return res.status(200).json(data);
        } catch {
          return res.status(200).json({
            success: true,
            status: 'pending',
            requested_plan: requestedPlan,
            requestedPlan
          });
        }
      }

      return res.status(200).json({
        success: true,
        status: 'pending',
        requested_plan: requestedPlan,
        requestedPlan,
        message: 'تم استلام وتسجيل طلب الترقية بنجاح'
      });
    } catch (error: any) {
      console.warn('[Proxy Warning] Upstream submit timed out or failed, but proposal is saved locally:', error);
      return res.status(200).json({
        success: true,
        status: 'pending',
        requested_plan: requestedPlan,
        requestedPlan,
        message: 'تم استلام وتسجيل طلب الترقية بنجاح'
      });
    }
  };

  app.post('/api/orgs/:id/upgrade-proposal', handleProposalSubmit);
  app.post('/orgs/:id/upgrade-proposal', handleProposalSubmit);

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
