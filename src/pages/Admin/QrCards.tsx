import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  QrCode, Plus, Printer, CheckCircle2, User as UserIcon, 
  Search, Eye, ShieldAlert, Filter, Trash2, 
  UserPlus, Check, Layers, Sliders, Palette, Paintbrush, 
  Type, Image as ImageIcon, CheckCircle, Save, Phone, Mail, 
  FileSpreadsheet, Sparkles, HelpCircle, Download, CreditCard,
  Upload, Barcode as BarcodeIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useApiQuery, useApiMutation } from '../../config/queryHooks';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { QrCard, Student, Settings, CardCustomDesign } from '../../types';
import { QrCardModal } from '../../components/Qr/QrCardModal';
import { QrCardViewModal } from '../../components/Qr/QrCardViewModal';
import { QrPrintSheetModal } from '../../components/Qr/QrPrintSheetModal';
import { QrCardBadge } from '../../components/Qr/QrCardBadge';
import { SimplifiedCardDesigner } from '../../components/Qr/SimplifiedCardDesigner';
import { requestStudentLookupToken } from '../../services/lookupSyncService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type FilterTab = 'all' | 'linked' | 'available' | 'queued' | 'revoked';
type PageTab = 'cards_list' | 'card_designer';

export function QrCards() {
  const toast = useToast();
  const { confirm } = useConfirm();

  // Primary Queries & Mutations
  const { data: allCards = [] } = useApiQuery<QrCard>('qrCards', 60 * 1000);
  const cards = [...allCards].filter(c => !c.deleted_at).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  const { data: allStudents = [] } = useApiQuery<Student>('students', 60 * 1000);
  const students = allStudents.filter(s => !s.deleted_at);
  const { data: settings = [] } = useApiQuery<Settings>('settings', 60 * 1000);

  const { create: createCard, update: updateCard, remove: removeCard } = useApiMutation<QrCard>('qrCards');
  const { update: updateStudent } = useApiMutation<Student>('students');
  const { create: createSettings, update: updateSettings } = useApiMutation<Settings>('settings');

  // Page level tabs: list vs designer
  const [pageTab, setPageTab] = useState<PageTab>('cards_list');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedCardForView, setSelectedCardForView] = useState<QrCard | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // Search & Filter (List view)
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get('studentId');
  const querySearch = searchParams.get('q');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const academyName = settings?.[0]?.academyName || settings?.[0]?.teacherName || 'المركز التعليمي';

  const studentMap = useMemo(() => {
    return new Map((students || []).map(s => [s.id, s]));
  }, [students]);

  // Handle URL query filters (e.g. from student profile)
  useEffect(() => {
    if (queryStudentId && students.length > 0) {
      const targetStudent = students.find(s => s.id === queryStudentId);
      if (targetStudent) {
        setSearchTerm(targetStudent.name);
        setActiveTab('all');
      }
    } else if (querySearch) {
      setSearchTerm(querySearch);
    }
  }, [queryStudentId, querySearch, students]);

  // Handle Save from Generator Modal
  const handleSaveCards = async (newCards: Partial<QrCard>[], shouldPrintImmediately: boolean = false) => {
    try {
      const chunkSize = 5;
      for (let i = 0; i < newCards.length; i += chunkSize) {
        const chunk = newCards.slice(i, i + chunkSize);
        await Promise.all(chunk.map(c => createCard.mutateAsync(c as QrCard)));
      }
      
      toast.success(`تم إنشاء وتخصيص ${newCards.length} بطاقة QR بنجاح`);

      if (shouldPrintImmediately && newCards.length > 0) {
        if (newCards.length === 1) {
          setSelectedCardForView(newCards[0] as QrCard);
        } else {
          setIsPrintSheetOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to save cards', err);
      toast.error('حدث خطأ أثناء حفظ البطاقات، يرجى المحاولة مرة أخرى.');
    }
  };

  // Mark single card as printed
  const handleMarkPrinted = async (cardId: string) => {
    updateCard.mutate({
      id: cardId,
      data: { printStatus: 'available' }
    });
    toast.success('تم تحديث حالة البطاقة إلى "متاحة وجاهزة"');
  };

  // Mark all queued cards as printed
  const handleMarkAllQueuedPrinted = async () => {
    const queuedCards = cards?.filter(c => c.printStatus === 'queued') || [];
    if (queuedCards.length === 0) return;

    await Promise.all(queuedCards.map(card => 
      updateCard.mutateAsync({
        id: card.id,
        data: { printStatus: 'available' }
      })
    ));
    toast.success(`تم تحديث حالة ${queuedCards.length} بطاقة إلى مطبوعة`);
  };

  // Toggle card active / revoked status
  const handleToggleStatus = async (cardId: string, newStatus: 'active' | 'revoked') => {
    updateCard.mutate({
      id: cardId,
      data: { status: newStatus }
    });

    if (selectedCardForView?.id === cardId) {
      setSelectedCardForView(prev => prev ? { ...prev, status: newStatus } : null);
    }

    toast.success(newStatus === 'active' ? 'تم تنشيط البطاقة بنجاح' : 'تم إيقاف البطاقة');
  };

  // Link card to a student
  const handleLinkStudent = async (cardId: string, studentId: string) => {
    const student = studentMap.get(studentId);
    const card = cards?.find(c => c.id === cardId);
    const now = Date.now();

    let finalCode = (card?.cardNumber || '').replace(/\D/g, '');
    if (student?.studentCode && /^\d+$/.test(student.studentCode)) {
      finalCode = student.studentCode;
    } else if (finalCode) {
      updateStudent.mutate({
        id: studentId,
        data: { studentCode: finalCode }
      });
    }

    updateCard.mutate({
      id: cardId,
      data: {
        cardNumber: finalCode,
        qrCodeData: finalCode,
        studentId,
        linkedAt: now,
        printStatus: 'available'
      }
    });

    requestStudentLookupToken(studentId, { student: { id: studentId, studentCode: finalCode, name: student?.name } }).catch(() => {});

    if (selectedCardForView?.id === cardId) {
      setSelectedCardForView(prev => prev ? { ...prev, cardNumber: finalCode, qrCodeData: finalCode, studentId, linkedAt: now } : null);
    }

    toast.success(`تم ربط البطاقة بنجاح بالطالب (${student?.name || 'المحدد'}) برقم (${finalCode})`);
  };

  // Delete card
  const handleDeleteCard = async (card: QrCard) => {
    const studentName = card.studentId ? studentMap.get(card.studentId)?.name : null;
    const isConfirmed = await confirm({
      title: 'حذف بطاقة QR',
      message: `هل أنت متأكد من حذف البطاقة رقم (${card.cardNumber})؟`,
      description: studentName 
        ? `هذه البطاقة مرتبطة بالطالب (${studentName}). لن يتمكن من استخدامها لتسجيل الحضور بعد الحذف.` 
        : 'سيتم أرشفة هذه البطاقة وإزالتها من النظام نهائياً.',
      confirmText: 'نعم، احذف البطاقة',
      cancelText: 'تراجع',
      variant: 'danger',
    });

    if (isConfirmed) {
      removeCard.mutate(card.id, {
        onSuccess: () => {
          if (selectedCardForView?.id === card.id) {
            setSelectedCardForView(null);
          }
          toast.success('تم حذف بطاقة QR بنجاح');
        }
      });
    }
  };

  // Stats calculation
  const queued = cards?.filter(c => c.printStatus === 'queued').length || 0;
  const available = cards?.filter(c => c.printStatus === 'available' && !c.studentId).length || 0;
  const linked = cards?.filter(c => c.studentId).length || 0;
  const revoked = cards?.filter(c => c.status === 'revoked').length || 0;
  const total = cards?.length || 0;

  // Filtered Cards List
  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter(card => {
      if (activeTab === 'linked' && !card.studentId) return false;
      if (activeTab === 'available' && (card.studentId || card.printStatus !== 'available')) return false;
      if (activeTab === 'queued' && card.printStatus !== 'queued') return false;
      if (activeTab === 'revoked' && card.status !== 'revoked') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const student = card.studentId ? studentMap.get(card.studentId) : null;
        const matchesSerial = (card.cardNumber || '').toLowerCase().includes(term);
        const matchesStudentName = (student?.name || '').toLowerCase().includes(term);
        const matchesPhone = (student?.phone || '').includes(term);
        if (!matchesSerial && !matchesStudentName && !matchesPhone) return false;
      }

      return true;
    });
  }, [cards, activeTab, searchTerm, studentMap]);

  const queuedCardsList = useMemo(() => {
    return cards?.filter(c => c.printStatus === 'queued') || [];
  }, [cards]);

  // ==========================================
  // CARD DESIGNER STATE & LOGIC (TAB 2)
  // ==========================================
  const [selectedElementId, setSelectedElementId] = useState<'studentName' | 'centerName' | 'phone' | 'grade' | 'school' | 'barcode' | 'frontImage' | 'backImage' | null>(null);
  const [activePreviewFace, setActivePreviewFace] = useState<'front' | 'back'>('front');

  const defaultOverlayElements = {
    studentNameElement: { visible: true, x: 25, y: 65, fontSize: 13, color: '#000000', align: 'right' as const, showBackground: true, backgroundColor: '#ffffff', backgroundOpacity: 1, backgroundPadding: 6, backgroundRadius: 6 },
    centerNameElement: { visible: false, x: 50, y: 12, fontSize: 11, color: '#ffffff', align: 'center' as const },
    phoneElement: { visible: true, x: 25, y: 75, fontSize: 10, color: '#475569', align: 'right' as const },
    gradeElement: { visible: true, x: 25, y: 85, fontSize: 10, color: '#475569', align: 'right' as const },
    schoolElement: { visible: false, x: 25, y: 92, fontSize: 9, color: '#64748b', align: 'right' as const },
    codeX: 50,
    codeY: 55,
    codeWidth: 140,
    codeHeight: 45,
    showCodeDigits: true,
    codeColor: '#000000',
    frontOpacity: 1,
    frontScale: 1,
    frontOffsetX: 0,
    frontOffsetY: 0,
    frontFit: 'cover' as const,
    backOpacity: 1,
    backScale: 1,
    backOffsetX: 0,
    backOffsetY: 0,
    backFit: 'cover' as const,
  };

  const [design, setDesign] = useState<CardCustomDesign>({
    themeColor: 'blue',
    centerName: '',
    subtitleLabel: '',
    showPhone: true,
    showGrade: true,
    showSchool: true,
    showCenterName: true,
    showCardNumber: true,
    cardFormat: 'barcode',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontFamily: 'Cairo, sans-serif',
    gradientBg: false,
    gradientFrom: '#eff6ff',
    gradientTo: '#dbeafe',
    gradientAngle: 135,
    showLogo: true,
    logoPosition: 'right',
    ...defaultOverlayElements
  });

  const [designerSection, setDesignerSection] = useState<'templates' | 'elements' | 'barcode' | 'colors' | 'identity' | 'pvc'>('templates');
  const [previewStudentMode, setPreviewStudentMode] = useState<'student' | 'blank'>('student');
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  // Physical PVC Printing states
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const [orderResult, setOrderResult] = useState<{
    success: boolean;
    orderId: string;
    excelDownloadUrl: string;
    imageDownloadUrl: string;
    message: string;
  } | null>(null);

  // Sync saved design from system settings
  useEffect(() => {
    if (settings?.[0]?.cardDesign) {
      setDesign(prev => ({
        ...defaultOverlayElements,
        ...prev,
        ...settings[0].cardDesign,
        studentNameElement: { ...defaultOverlayElements.studentNameElement, ...settings[0].cardDesign.studentNameElement },
        centerNameElement: { ...defaultOverlayElements.centerNameElement, ...settings[0].cardDesign.centerNameElement },
        phoneElement: { ...defaultOverlayElements.phoneElement, ...settings[0].cardDesign.phoneElement },
        gradeElement: { ...defaultOverlayElements.gradeElement, ...settings[0].cardDesign.gradeElement },
        schoolElement: { ...defaultOverlayElements.schoolElement, ...settings[0].cardDesign.schoolElement },
      }));
    } else if (settings?.[0]?.academyName) {
      setDesign(prev => ({
        ...defaultOverlayElements,
        ...prev,
        centerName: settings[0].academyName
      }));
    }
  }, [settings]);

  // Luxury Card presets
  const presets = [
    {
      name: 'أزرق كلاسيكي',
      design: {
        themeColor: 'blue' as const,
        gradientBg: false,
        cardFormat: 'barcode' as const,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        showLogo: true,
        logoPosition: 'right' as const,
        fontFamily: 'Cairo, sans-serif'
      }
    },
    {
      name: 'زمردي ذكي',
      design: {
        themeColor: 'emerald' as const,
        gradientBg: true,
        gradientFrom: '#f0fdf4',
        gradientTo: '#d1fae5',
        cardFormat: 'qrcode' as const,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#10b981',
        showLogo: true,
        logoPosition: 'right' as const,
        fontFamily: 'Readex Pro, sans-serif'
      }
    },
    {
      name: 'ذهبي دافئ',
      design: {
        themeColor: 'amber' as const,
        gradientBg: true,
        gradientFrom: '#fef3c7',
        gradientTo: '#fde68a',
        cardFormat: 'qrcode' as const,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f59e0b',
        showLogo: true,
        logoPosition: 'left' as const,
        fontFamily: 'Tajawal, sans-serif'
      }
    },
    {
      name: 'وردي أنيق',
      design: {
        themeColor: 'rose' as const,
        gradientBg: true,
        gradientFrom: '#fff1f2',
        gradientTo: '#ffe4e6',
        cardFormat: 'barcode' as const,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#f43f5e',
        showLogo: true,
        logoPosition: 'right' as const,
        fontFamily: 'Cairo, sans-serif'
      }
    },
    {
      name: 'أسود السيبراني',
      design: {
        themeColor: 'custom' as const,
        customColor: '#0a0f1d',
        textColor: '#f1f5f9',
        gradientBg: true,
        gradientFrom: '#0a0f1d',
        gradientTo: '#1e293b',
        headerBgColor: '#030712',
        headerTextColor: '#38bdf8',
        cardFormat: 'qrcode' as const,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#38bdf8',
        subtitleLabel: 'بوابة حضور مسار الذكية',
        showLogo: true,
        logoPosition: 'right' as const,
        fontFamily: 'Readex Pro, sans-serif'
      }
    }
  ];

  // Base64 file handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDesign(prev => ({ ...prev, logoImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDesign(prev => ({ ...prev, backgroundImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDesign(prev => ({ ...prev, frontImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDesign(prev => ({ ...prev, backImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save customized design to database settings
  const handleSaveDesign = async () => {
    try {
      setIsSavingDesign(true);
      if (settings && settings.length > 0) {
        await updateSettings.mutateAsync({
          id: settings[0].id,
          data: {
            ...settings[0],
            cardDesign: design
          }
        });
      } else {
        await createSettings.mutateAsync({
          cardDesign: design
        } as Settings);
      }
      toast.success('تم حفظ إعدادات تصميم الكروت بنجاح!');
    } catch (err: any) {
      console.error('Failed to save design template', err);
      toast.error('حدث خطأ أثناء حفظ التصميم: ' + (err?.message || err?.toString()));
    } finally {
      setIsSavingDesign(false);
    }
  };

  // Capture preview badge image as high-res Base64 via html2canvas
  const captureCardImage = async (): Promise<string | null> => {
    const cardEl = document.getElementById('preview-card-element');
    if (!cardEl) return null;
    try {
      // Temporarily expand scaling for high resolution printing
      const canvas = await html2canvas(cardEl, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: null
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('[Capture] Error generating card thumbnail:', err);
      return null;
    }
  };

  // Submit actual physical card print order
  const handleOrderPhysicalCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactPhone) {
      toast.error('يرجى كتابة البريد الإلكتروني ورقم الهاتف/الواتساب للمتابعة.');
      return;
    }

    setIsOrdering(true);
    setOrderStatus('📸 جاري التقاط التصميم المميز بدقة عالية...');
    setOrderResult(null);

    try {
      // 1. Render card preview to image
      const cardImg = await captureCardImage();
      if (!cardImg) {
        throw new Error('تعذر التقاط صورة المعاينة للكارت، يرجى المحاولة لاحقاً.');
      }

      setOrderStatus('📊 جاري تجهيز بيانات الطلاب وتصديرها لملف إكسيل...');

      // 2. Dispatch to backend API
      const payload = {
        cardImage: cardImg,
        students: students,
        academyName: design.centerName || academyName,
        contactEmail,
        contactPhone,
        notes: specialNotes
      };

      setOrderStatus('🚀 جاري رفع الطلب آلياً إلى مطبعة مسار لتجهيز الكروت الفيزيائية...');

      const response = await fetch('/api/cards/order-physical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setOrderResult({
          success: true,
          orderId: data.orderId,
          excelDownloadUrl: data.excelDownloadUrl,
          imageDownloadUrl: data.imageDownloadUrl,
          message: data.message
        });
        toast.success('تم إرسال تصميم الكارت وكشف الطلاب للمطبعة بنجاح!');
      } else {
        throw new Error(data.error || 'تعذر إتمام الطلب، يرجى المحاولة لاحقاً');
      }
    } catch (err: any) {
      console.error('[Order PVC] Physical cards dispatch failed:', err);
      toast.error(`فشل الطلب: ${err.message || err.toString()}`);
    } finally {
      setIsOrdering(false);
      setOrderStatus('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>بطاقات الحضور الذكية (QR)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إصدار كروت الحضور ومسح الباركود، تصميم هويتك الأكاديمية وطلب الكروت البلاستيكية المطبوعة
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {pageTab === 'cards_list' && (
            <>
              {queued > 0 && (
                <button
                  onClick={() => setIsPrintSheetOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>طباعة الانتظار ({queued})</span>
                </button>
              )}
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>توليد كروت جديدة</span>
              </button>
            </>
          )}

          {pageTab === 'card_designer' && (
            <button
              onClick={handleSaveDesign}
              disabled={isSavingDesign}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer w-full sm:w-auto disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingDesign ? 'جاري الحفظ...' : 'حفظ التصميم كافتراضي'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1 shadow-2xs">
        <button
          onClick={() => setPageTab('cards_list')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            pageTab === 'cards_list'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold shadow-3xs'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>الكروت المصدرة والمربوطة ({total})</span>
        </button>
        <button
          onClick={() => setPageTab('card_designer')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            pageTab === 'card_designer'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold shadow-3xs'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>محرر ومصمم الكروت الذكية</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: ORIGINAL EXPORTED CARDS LIST
          ========================================== */}
      {pageTab === 'cards_list' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] block font-bold">إجمالي الكروت</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 block mt-1">{total}</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] block font-bold text-blue-600">كروت مربوطة بطلاب</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 block mt-1">{linked}</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] block font-bold text-amber-500">انتظار الطباعة الورقية</span>
              <span className="text-xl font-black text-amber-500 block mt-1">{queued}</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] block font-bold text-emerald-600">كروت عامة حرة مسبقة</span>
              <span className="text-xl font-black text-emerald-600 block mt-1">{available}</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-1">
              <span className="text-slate-400 text-[10px] block font-bold text-red-500">موقوفة</span>
              <span className="text-xl font-black text-red-500 block mt-1">{revoked}</span>
            </div>
          </div>

          {/* Filters & Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs overflow-hidden">
            {/* Header bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Tab buttons */}
              <div className="flex overflow-x-auto gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-lg">
                {(['all', 'linked', 'available', 'queued', 'revoked'] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'all' && 'الكل'}
                    {tab === 'linked' && 'المربوطة'}
                    {tab === 'available' && 'جاهزة للتوزيع'}
                    {tab === 'queued' && 'في الانتظار'}
                    {tab === 'revoked' && 'موقوفة'}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث برقم الكرنيه أو اسم الطالب..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Empty view */}
            {filteredCards.length === 0 ? (
              <div className="py-16 text-center">
                <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">لا توجد بطاقات مطابقة</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                  جرب تغيير خيار التصفية أو قم بإنشاء دفعة كروت جديدة لتوزيعها.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">كود الكارت</th>
                      <th className="px-4 py-3">الطالب المرتبط</th>
                      <th className="px-4 py-3">الهاتف</th>
                      <th className="px-4 py-3">الحالة الأمنية</th>
                      <th className="px-4 py-3">حالة الطباعة</th>
                      <th className="px-4 py-3">تاريخ التوليد</th>
                      <th className="px-4 py-3 text-left">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCards.map(card => {
                      const student = card.studentId ? studentMap.get(card.studentId) : null;
                      return (
                        <tr key={card.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                          {/* Code */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {card.cardNumber}
                          </td>

                          {/* Student Name */}
                          <td className="px-4 py-3">
                            {student ? (
                              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                {student.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800">
                                <UserPlus className="w-3 h-3 text-slate-400" />
                                كارت عام جاهز
                              </span>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                            {student?.phone || '-'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              card.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            }`}>
                              {card.status === 'active' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  نشطة ومصرحة
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="w-3 h-3" />
                                  موقوفة
                                </>
                              )}
                            </span>
                          </td>

                          {/* Print Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              card.printStatus === 'queued'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : card.printStatus === 'available'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {card.printStatus === 'queued' ? (
                                <>
                                  <Printer className="w-3 h-3" />
                                  قيد الانتظار
                                </>
                              ) : card.printStatus === 'available' ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  مطبوعة ومتاحة
                                </>
                              ) : (
                                'تم التسليم'
                              )}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {card.created_at ? format(new Date(card.created_at), 'yyyy-MM-dd') : '-'}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-left">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedCardForView(card)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="معاينة وطباعة الكرنيه"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {card.printStatus === 'queued' && (
                                <button
                                  onClick={() => handleMarkPrinted(card.id)}
                                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                  title="تعليم كمطبوعة"
                                >
                                  تم الطباعة
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteCard(card)}
                                className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer rounded-md hover:bg-red-500/10 transition-colors"
                                title="حذف البطاقة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: SIMPLIFIED SMART CARD DESIGNER
          ========================================== */}
      {pageTab === 'card_designer' && (
        <SimplifiedCardDesigner
          design={design}
          setDesign={setDesign}
          onSaveDesign={handleSaveDesign}
          isSavingDesign={isSavingDesign}
          academyName={academyName}
          totalStudents={students?.length || 0}
        />
      )}

      {/* Pop-up Modal 1: Generate & Customize QR Cards */}
      <QrCardModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        students={students || []}
        existingCards={cards || []}
        defaultCenterName={academyName}
        onSaveCards={handleSaveCards}
        customDesign={settings?.[0]?.cardDesign}
      />

      {/* Pop-up Modal 2: View Single Card Badge & Print */}
      <QrCardViewModal
        isOpen={!!selectedCardForView}
        onClose={() => setSelectedCardForView(null)}
        card={selectedCardForView}
        student={selectedCardForView?.studentId ? studentMap.get(selectedCardForView.studentId) : null}
        allStudents={students || []}
        onLinkStudent={handleLinkStudent}
        onToggleStatus={handleToggleStatus}
        onMarkPrinted={handleMarkPrinted}
        customDesign={settings?.[0]?.cardDesign}
      />

      {/* Pop-up Modal 3: Batch Print Sheet Modal */}
      <QrPrintSheetModal
        isOpen={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        cards={queuedCardsList.length > 0 ? queuedCardsList : (cards || []).slice(0, 16)}
        students={students || []}
        title={queuedCardsList.length > 0 ? `طباعة كروت الانتظار (${queuedCardsList.length})` : 'طباعة مجموعة كروت QR'}
        onConfirmPrinted={handleMarkAllQueuedPrinted}
        customDesign={settings?.[0]?.cardDesign}
      />
    </div>
  );
}
