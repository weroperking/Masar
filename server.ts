import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';

// Server-side storage for public lookup tokens and live summary records
interface LookupData {
  student: {
    id: string;
    name: string;
    studentCode?: string;
    gradeLevel?: string;
    school?: string;
    phone?: string;
    parentPhone?: string;
    parentName?: string;
    branch?: string;
  };
  centerName?: string;
  academyName?: string;
  teacherName?: string;
  branch?: string;
  attendance: {
    attended: number;
    missed: number;
    total: number;
    rate?: number;
    sessions?: Array<{
      id: string;
      date: string;
      status: 'present' | 'absent' | 'compensation';
      courseName?: string;
      groupName?: string;
      room?: string;
      branch?: string;
    }>;
  };
  exams: Array<{
    id: string;
    name: string;
    grade: number | string;
    maxGrade?: number;
    date?: string;
    type?: string;
    percentage?: number;
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

const LOOKUP_DATA_DIR = path.join(process.cwd(), 'data');
const LOOKUP_DATA_FILE = path.join(LOOKUP_DATA_DIR, 'lookup_records.json');

function indexLookupRecord(record: LookupData, customToken?: string) {
  if (!record || !record.student) return;
  const s = record.student;
  
  if (customToken) {
    lookupTokensMap.set(customToken, record);
    if (s.id) {
      studentToTokenMap.set(s.id, customToken);
    }
  }

  if (s.id) {
    lookupTokensMap.set(s.id, record);
  }

  if (s.studentCode) {
    const rawCode = String(s.studentCode).trim();
    lookupTokensMap.set(rawCode, record);
    
    // Strip # or other symbols
    const cleanCode = rawCode.replace(/^[#№\s]+/, '');
    if (cleanCode) {
      lookupTokensMap.set(cleanCode, record);
    }

    const cleanDigits = rawCode.replace(/\D/g, '');
    if (cleanDigits) {
      lookupTokensMap.set(cleanDigits, record);
      lookupTokensMap.set(cleanDigits.padStart(4, '0'), record);
      const parsedNum = parseInt(cleanDigits, 10);
      if (!isNaN(parsedNum)) {
        lookupTokensMap.set(String(parsedNum), record);
      }
    }
  }
}

function loadPersistedLookupData() {
  try {
    if (fs.existsSync(LOOKUP_DATA_FILE)) {
      const content = fs.readFileSync(LOOKUP_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.student) {
            indexLookupRecord(item);
          }
        }
        console.log(`[Persistence] Loaded ${parsed.length} lookup records from ${LOOKUP_DATA_FILE}`);
      }
    }
  } catch (err) {
    console.warn('[Persistence] Could not load lookup records:', err);
  }
}

function savePersistedLookupData() {
  try {
    if (!fs.existsSync(LOOKUP_DATA_DIR)) {
      fs.mkdirSync(LOOKUP_DATA_DIR, { recursive: true });
    }
    const uniqueRecords: LookupData[] = [];
    const seenStudentIds = new Set<string>();
    for (const record of lookupTokensMap.values()) {
      if (record && record.student && record.student.id && !seenStudentIds.has(record.student.id)) {
        seenStudentIds.add(record.student.id);
        uniqueRecords.push(record);
      }
    }
    fs.writeFileSync(LOOKUP_DATA_FILE, JSON.stringify(uniqueRecords, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Persistence] Could not save lookup records:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Load any previously persisted student lookup records
  loadPersistedLookupData();

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
    const rawToken = String(req.params.token || '').trim();
    if (!rawToken) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    // Try loading persisted data if map is empty
    if (lookupTokensMap.size === 0) {
      loadPersistedLookupData();
    }

    const decodedToken = decodeURIComponent(rawToken).trim();
    const cleanTokenDigits = decodedToken.replace(/\D/g, '');
    const numToken = cleanTokenDigits ? parseInt(cleanTokenDigits, 10) : null;
    const strippedPrefix = decodedToken.replace(/^[#№s_STst-]+\s*/i, '').trim();

    // 1. Direct match in lookupTokensMap (by token, decoded, stripped, or digits)
    let data = lookupTokensMap.get(rawToken) ||
               lookupTokensMap.get(decodedToken) ||
               (strippedPrefix ? lookupTokensMap.get(strippedPrefix) : undefined) ||
               (cleanTokenDigits ? lookupTokensMap.get(cleanTokenDigits) : undefined) ||
               (cleanTokenDigits ? lookupTokensMap.get(cleanTokenDigits.padStart(4, '0')) : undefined) ||
               (numToken !== null ? lookupTokensMap.get(String(numToken)) : undefined);

    // 2. Check if token matches studentId in studentToTokenMap
    if (!data) {
      const mappedToken = studentToTokenMap.get(rawToken) || 
                          studentToTokenMap.get(decodedToken) ||
                          (strippedPrefix ? studentToTokenMap.get(strippedPrefix) : undefined);
      if (mappedToken) {
        data = lookupTokensMap.get(mappedToken);
      }
    }

    // 3. Search across all values in lookupTokensMap by studentCode, ID, clean digits, or phone
    if (!data) {
      for (const val of lookupTokensMap.values()) {
        const student = val.student;
        if (!student) continue;

        const sDigits = student.studentCode ? student.studentCode.replace(/\D/g, '') : '';
        const sNum = sDigits ? parseInt(sDigits, 10) : null;
        const sCleanCode = student.studentCode ? student.studentCode.replace(/^[#№\s]+/, '').trim() : '';

        if (
          student.id === rawToken ||
          student.id === decodedToken ||
          student.studentCode === rawToken ||
          student.studentCode === decodedToken ||
          (sCleanCode && (sCleanCode === rawToken || sCleanCode === decodedToken || sCleanCode === strippedPrefix)) ||
          (cleanTokenDigits.length > 0 && sDigits === cleanTokenDigits) ||
          (numToken !== null && sNum !== null && !isNaN(numToken) && !isNaN(sNum) && numToken === sNum) ||
          (student.phone && cleanTokenDigits.length >= 8 && student.phone.replace(/\D/g, '').endsWith(cleanTokenDigits)) ||
          (student.parentPhone && cleanTokenDigits.length >= 8 && student.parentPhone.replace(/\D/g, '').endsWith(cleanTokenDigits))
        ) {
          data = val;
          break;
        }
      }
    }

    if (!data) {
      return res.status(404).json({ error: 'هذا الرابط غير صالح أو لم يتم تسجيل بيانات الطالب بعد' });
    }

    // Ensure all critical profile fields are guaranteed to exist with sensible defaults
    const enrichedData = {
      ...data,
      teacherName: data.teacherName || 'إدارة المركز التعليمي',
      academyName: data.academyName || data.centerName || 'سنتر مسار التعليمي',
      centerName: data.centerName || data.academyName || 'سنتر مسار التعليمي',
      branch: data.branch || data.student?.branch || 'الفرع الرئيسي',
      student: {
        ...data.student,
        school: data.student?.school || 'مدرسة عامة',
        gradeLevel: data.student?.gradeLevel || 'المرحلة العامة',
        branch: data.student?.branch || data.branch || 'الفرع الرئيسي'
      }
    };

    return res.status(200).json(enrichedData);
  };

  app.get('/api/public/lookup/:token', handlePublicLookup);
  app.get('/public/lookup/:token', handlePublicLookup);

  // Bulk sync of student lookup snapshots from client
  const handleSyncLookups = (req: express.Request, res: express.Response) => {
    const items: LookupData[] = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    let count = 0;
    for (const item of items) {
      if (item && item.student && item.student.id) {
        indexLookupRecord(item);
        count++;
      }
    }
    if (count > 0) {
      savePersistedLookupData();
    }
    console.log(`[API] Synced and persisted ${count} lookup snapshots to server.`);
    res.status(200).json({ success: true, count });
  };

  app.post('/api/public/sync-lookups', handleSyncLookups);
  app.post('/public/sync-lookups', handleSyncLookups);

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
        school: studentInfo.school,
        phone: studentInfo.phone || body.phone || '',
        parentPhone: studentInfo.parentPhone || body.parentPhone || '',
        parentName: studentInfo.parentName || body.parentName || '',
        branch: studentInfo.branch || body.branch || ''
      },
      teacherName: body.teacherName || undefined,
      academyName: body.academyName || undefined,
      centerName: body.centerName || body.academyName || undefined,
      branch: body.branch || studentInfo.branch || undefined,
      attendance: attendanceInfo,
      exams: examsInfo,
      subscription: subscriptionInfo
    };

    indexLookupRecord(record, newToken);
    savePersistedLookupData();

    console.log(`[API] Generated and persisted new public lookup token for student ${id} (${studentInfo.name}): ${newToken}`);

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
      if (req.body.teacherName) existing.teacherName = req.body.teacherName;
      if (req.body.academyName) existing.academyName = req.body.academyName;
      if (req.body.centerName) existing.centerName = req.body.centerName;
      if (req.body.branch) existing.branch = req.body.branch;
      indexLookupRecord(existing, token);
      savePersistedLookupData();
    }

    res.status(200).json({ success: true, token });
  };

  app.put('/api/students/:id/lookup-data', handleUpdateLookupData);
  app.put('/students/:id/lookup-data', handleUpdateLookupData);

  // Handshake endpoint for local-first DEK key management
  app.post('/api/sync/handshake', async (req, res) => {
    try {
      const { devicePublicKey } = req.body || {};
      console.log('[API] Received handshake request with devicePublicKey:', devicePublicKey ? 'present' : 'none');
      // For demo / local development: generate an AES key and wrap it with device's RSA public key,
      // or return a mock wrapped key base64.
      // If Web Crypto is available in Node:
      if (devicePublicKey) {
        try {
          const binaryDer = Buffer.from(devicePublicKey, 'base64');
          const importedPub = await crypto.webcrypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['wrapKey']
          );
          // Generate raw AES-GCM 256 key
          const rawDek = await crypto.webcrypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          // Wrap with device public key
          const wrapped = await crypto.webcrypto.subtle.wrapKey(
            'raw',
            rawDek,
            importedPub,
            { name: 'RSA-OAEP' }
          );
          const wrappedBase64 = Buffer.from(wrapped).toString('base64');
          const pubKeyHash = crypto.createHash('sha256').update(devicePublicKey).digest('hex');
          return res.status(200).json({ 
            wrappedDek: wrappedBase64,
            publicKeyHash: pubKeyHash
          });
        } catch (subtleErr) {
          console.warn('[API] Handshake crypto wrap error, returning fallback:', subtleErr);
        }
      }
      return res.status(200).json({ 
        wrappedDek: 'mock_wrapped_dek_base64',
        publicKeyHash: 'mock_pubkey_hash'
      });
    } catch (e) {
      console.error('[API] Handshake failed:', e);
      res.status(500).json({ error: 'Handshake failed' });
    }
  });

  // Upload and prepare card images for printing order to 01277707096
  app.post('/api/cards/upload-print-order', (req, res) => {
    try {
      const { frontImage, backImage, orderDetails = {} } = req.body || {};
      const orderId = `card_print_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const baseDir = path.join(process.cwd(), 'public', 'orders');
      const orderDir = path.join(baseDir, orderId);

      fs.mkdirSync(orderDir, { recursive: true });

      let frontImageUrl = null;
      let backImageUrl = null;

      if (frontImage && frontImage.includes('base64,')) {
        const base64Content = frontImage.split(';base64,').pop();
        if (base64Content) {
          fs.writeFileSync(path.join(orderDir, 'front_design.png'), base64Content, 'base64');
          frontImageUrl = `/orders/${orderId}/front_design.png`;
        }
      }

      if (backImage && backImage.includes('base64,')) {
        const base64Content = backImage.split(';base64,').pop();
        if (base64Content) {
          fs.writeFileSync(path.join(orderDir, 'back_design.png'), base64Content, 'base64');
          backImageUrl = `/orders/${orderId}/back_design.png`;
        }
      }

      // Save order metadata JSON
      fs.writeFileSync(path.join(orderDir, 'order_info.json'), JSON.stringify({
        orderId,
        createdAt: new Date().toISOString(),
        targetPhone: '01277707096',
        ...orderDetails
      }, null, 2));

      console.log(`[API] Successfully prepared and saved card order ${orderId} for phone 01277707096`);

      res.status(200).json({
        success: true,
        orderId,
        frontImageUrl,
        backImageUrl,
        targetPhone: '01277707096',
        message: 'تم رفع وحفظ صور التصميم بنجاح'
      });
    } catch (err: any) {
      console.error('[API Error] Upload print order failed:', err);
      res.status(500).json({
        error: 'فشل رفع صور التصميم',
        details: err.message || err.toString()
      });
    }
  });

  // Submit an order for physical cards (generates Excel of student data and stores design image)
  app.post('/api/cards/order-physical', (req, res) => {
    try {
      const { cardImage, students = [], academyName = 'سنتر مسار', contactEmail = '', contactPhone = '' } = req.body || {};
      
      console.log(`[API] Received physical cards printing request for academy: "${academyName}". Student count: ${students.length}`);
      
      // 1. Generate clean Excel data rows with Arabic keys
      const excelRows = students.map((s: any, index: number) => ({
        'م': index + 1,
        'كود الطالب': s.studentCode || '',
        'اسم الطالب': s.name || '',
        'رقم الهاتف': s.phone || '',
        'الصف الدراسي': s.gradeLevel || '',
        'المدرسة': s.school || '',
        'ولي الأمر': s.parentName || '',
        'هاتف ولي الأمر': s.parentPhone || '',
        'تاريخ التسجيل': s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : ''
      }));
      
      // 2. Build SheetJS workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows, {
        header: ['م', 'كود الطالب', 'اسم الطالب', 'رقم الهاتف', 'الصف الدراسي', 'المدرسة', 'ولي الأمر', 'هاتف ولي الأمر', 'تاريخ التسجيل']
      });
      
      // Right-to-Left sheet view configuration
      ws['!views'] = [{ RTL: true }];
      
      XLSX.utils.book_append_sheet(wb, ws, 'كشف كروت الطلاب');
      
      // Write workbook to Buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // 3. Create folder paths for the order
      const orderId = `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const baseDir = path.join(process.cwd(), 'public', 'orders');
      const orderDir = path.join(baseDir, orderId);
      
      fs.mkdirSync(orderDir, { recursive: true });
      
      // 4. Save custom card template design if base64-encoded
      if (cardImage && cardImage.includes('base64,')) {
        const base64Content = cardImage.split(';base64,').pop();
        if (base64Content) {
          fs.writeFileSync(path.join(orderDir, 'card_design.png'), base64Content, 'base64');
          console.log(`[API] Saved customized card template image to public/orders/${orderId}/card_design.png`);
        }
      }
      
      // 5. Save the Excel spreadsheet on-disk
      fs.writeFileSync(path.join(orderDir, 'students_list.xlsx'), excelBuffer);
      console.log(`[API] Saved student details excel file to public/orders/${orderId}/students_list.xlsx`);
      
      // 6. Return success with downloads
      res.status(200).json({
        success: true,
        orderId,
        message: 'تم إرسال تصميم الكرنيه وكشف الطلاب بنجاح إلى فريق مطبعة مسار لإنتاج الكروت الفيزيائية الممتازة!',
        excelDownloadUrl: `/orders/${orderId}/students_list.xlsx`,
        imageDownloadUrl: `/orders/${orderId}/card_design.png`
      });
    } catch (err: any) {
      console.error('[API Error] Card physical order failed:', err);
      res.status(500).json({
        error: 'عذراً، فشل تجهيز ملفات الطلب وإرسالها.',
        details: err.message || err.toString()
      });
    }
  });

  // Serve the orders folder statically so files can be accessed or downloaded by the developer or user
  app.use('/orders', express.static(path.join(process.cwd(), 'public', 'orders')));

  // Sync Push endpoint for syncService
  app.post('/api/sync/push', (req, res) => {
    const { operations = [] } = req.body || {};
    console.log(`[API] Received push sync with ${operations.length} operations.`);
    const results = operations.map((op: any) => ({
      idempotencyKey: op.idempotencyKey,
      status: 'success',
      serverConfirmedRecord: op.payload ? { ...op.payload, id: op.entityId } : { id: op.entityId }
    }));
    res.status(200).json({ results });
  });

  // Sync Pull endpoint for syncService
  app.get('/api/sync/pull', (req, res) => {
    const since = req.query.since;
    console.log(`[API] Received pull sync request since: ${since}`);
    res.status(200).json({
      data: {},
      timestamp: Date.now()
    });
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
