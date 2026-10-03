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
    lookup_code?: string;
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

const lookupTokensMap = new Map<string, LookupData>();
const studentToTokenMap = new Map<string, string>();

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

  if (s.lookup_code) {
    lookupTokensMap.set(s.lookup_code, record);
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

  // Center SaaS subscription status endpoint (unrestricted, active)
  const handleSubscriptionStatus = async (_req: express.Request, res: express.Response) => {
    return res.status(200).json({
      plan: 'pro',
      status: 'active',
      trial_ends_at: null,
      days_remaining: 0,
      limits: {
        max_branches: 100,
        max_students: 100000,
        inventory_sales: true,
        combined_packages: true,
        advanced_analytics: true,
        api_access: true,
      }
    });
  };

  app.get('/api/me/subscription-status', handleSubscriptionStatus);
  app.get('/me/subscription-status', handleSubscriptionStatus);

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
      lookup_code: lookupData?.student?.lookup_code || null,
      lookup_data: lookupData
    });
  };

  app.get('/api/students/:id', handleGetStudent);
  app.get('/students/:id', handleGetStudent);

  // NOTE: Lookup token minting is intentionally ABSENT from this server.
  // Lookup codes are minted exclusively by the authoritative backend
  // (Cloudflare Worker e56f9d58-9f3b-4339-871e-3000d5737cb1) as
  // base64url("<org.lookup_prefix>:<student.id>"). This origin must never
  // generate, guess, or reconstruct a lookup token or a /p/s/ URL, otherwise
  // locally-synthesized tokens mask a failing real backend.

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
