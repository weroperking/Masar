import React, { useState, useMemo } from 'react';
import { 
  QrCode, Plus, Printer, CheckCircle2, User as UserIcon, 
  Search, Eye, ShieldAlert, Filter, Trash2, 
  UserPlus, Check, Layers
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { QrCard, Student } from '../../types';
import { QrCardModal } from '../../components/Qr/QrCardModal';
import { QrCardViewModal } from '../../components/Qr/QrCardViewModal';
import { QrPrintSheetModal } from '../../components/Qr/QrPrintSheetModal';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type FilterTab = 'all' | 'linked' | 'available' | 'queued' | 'revoked';

export function QrCards() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const cards = useLiveQuery(() => db.qrCards.filter(c => !c.deleted_at).reverse().sortBy('created_at'), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const settings = useLiveQuery(() => db.settings.toArray(), []);

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedCardForView, setSelectedCardForView] = useState<QrCard | null>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const academyName = settings?.[0]?.academyName || 'سنتر مسار التعليمي';

  const studentMap = useMemo(() => {
    return new Map((students || []).map(s => [s.id, s]));
  }, [students]);

  // Handle Save from Generator Modal
  const handleSaveCards = async (newCards: Partial<QrCard>[], shouldPrintImmediately: boolean = false) => {
    try {
      await db.qrCards.bulkAdd(newCards as QrCard[]);
      toast.success(`تم إنشاء وتخصيص ${newCards.length} بطاقة QR بنجاح`);

      if (shouldPrintImmediately && newCards.length > 0) {
        if (newCards.length === 1) {
          setSelectedCardForView(newCards[0] as QrCard);
        } else {
          setIsPrintSheetOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to save cards', err);
      toast.error('حدث خطأ أثناء حفظ البطاقات');
    }
  };

  // Mark single card as printed
  const handleMarkPrinted = async (cardId: string) => {
    await db.qrCards.update(cardId, {
      printStatus: 'available',
      updated_at: Date.now(),
      sync_status: 'pending'
    });
    toast.success('تم تحديث حالة البطاقة إلى "متاحة وجاهزة"');
  };

  // Mark all queued cards as printed
  const handleMarkAllQueuedPrinted = async () => {
    const queuedCards = cards?.filter(c => c.printStatus === 'queued') || [];
    if (queuedCards.length === 0) return;

    const now = Date.now();
    for (const card of queuedCards) {
      await db.qrCards.update(card.id, {
        printStatus: 'available',
        updated_at: now,
        sync_status: 'pending'
      });
    }
    toast.success(`تم تحديث حالة ${queuedCards.length} بطاقة إلى مطبوعة`);
  };

  // Toggle card active / revoked status
  const handleToggleStatus = async (cardId: string, newStatus: 'active' | 'revoked') => {
    await db.qrCards.update(cardId, {
      status: newStatus,
      updated_at: Date.now(),
      sync_status: 'pending'
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

    // Ensure both card and student share the exact same numeric code
    let finalCode = (card?.cardNumber || '').replace(/\D/g, '');
    if (student?.studentCode && /^\d+$/.test(student.studentCode)) {
      finalCode = student.studentCode;
    } else if (finalCode) {
      await db.students.update(studentId, {
        studentCode: finalCode,
        updated_at: now,
        sync_status: 'pending'
      });
    }

    await db.qrCards.update(cardId, {
      cardNumber: finalCode,
      qrCodeData: finalCode,
      studentId,
      linkedAt: now,
      printStatus: 'available',
      updated_at: now,
      sync_status: 'pending'
    });

    if (selectedCardForView?.id === cardId) {
      setSelectedCardForView(prev => prev ? { ...prev, cardNumber: finalCode, qrCodeData: finalCode, studentId, linkedAt: now } : null);
    }

    toast.success(`تم ربط البطاقة بنجاح بالطالب (${student?.name || 'المحدد'}) برقم (${finalCode})`);
  };

  // Delete card with confirmation dialog
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
      await db.qrCards.update(card.id, {
        deleted_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      if (selectedCardForView?.id === card.id) {
        setSelectedCardForView(null);
      }
      toast.success('تم حذف بطاقة QR بنجاح');
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
      // Tab filter
      if (activeTab === 'linked' && !card.studentId) return false;
      if (activeTab === 'available' && (card.studentId || card.printStatus !== 'available')) return false;
      if (activeTab === 'queued' && card.printStatus !== 'queued') return false;
      if (activeTab === 'revoked' && card.status !== 'revoked') return false;

      // Search filter
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>بطاقات QR للطلاب</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة وتخصيص كروت الهوية الذكية للحضور ومسح الباركود مع دعم التخصيص والطباعة
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {queued > 0 && (
            <button
              onClick={() => setIsPrintSheetOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>طباعة الانتظار ({queued})</span>
            </button>
          )}

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>توليد وتخصيص بطاقات</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview - Human-made clean card style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`text-right bg-white dark:bg-slate-900 rounded-lg p-4 border transition-colors ${
            activeTab === 'all'
              ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">إجمالي البطاقات</span>
            <QrCode className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{total}</p>
        </button>

        <button
          onClick={() => setActiveTab('linked')}
          className={`text-right bg-white dark:bg-slate-900 rounded-lg p-4 border transition-colors ${
            activeTab === 'linked'
              ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">مرتبطة بطلاب</span>
            <UserIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{linked}</p>
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`text-right bg-white dark:bg-slate-900 rounded-lg p-4 border transition-colors ${
            activeTab === 'available'
              ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">متاحة للتوزيع</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{available}</p>
        </button>

        <button
          onClick={() => setActiveTab('queued')}
          className={`text-right bg-white dark:bg-slate-900 rounded-lg p-4 border transition-colors ${
            activeTab === 'queued'
              ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">في انتظار الطباعة</span>
            <Printer className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{queued}</p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            الكل ({total})
          </button>
          <button
            onClick={() => setActiveTab('linked')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'linked'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            مرتبطة ({linked})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'available'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            متاحة ({available})
          </button>
          <button
            onClick={() => setActiveTab('queued')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'queued'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            قيد الطباعة ({queued})
          </button>
          <button
            onClick={() => setActiveTab('revoked')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'revoked'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            موقوفة ({revoked})
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم البطاقة، اسم الطالب، أو الهاتف..."
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredCards.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <QrCode className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchTerm ? 'لا توجد بطاقات مطابقة لنتائج البحث' : 'لا توجد بطاقات في هذا التبويب'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              اضغط على زر "توليد وتخصيص بطاقات" لإنشاء كرنيه مخصص لطالب أو دفعة بطاقات جديدة.
            </p>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              توليد بطاقة الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">كود البطاقة والسمة</th>
                  <th className="px-4 py-3 font-semibold">الطالب المرتبط</th>
                  <th className="px-4 py-3 font-semibold">حالة الكود</th>
                  <th className="px-4 py-3 font-semibold">حالة الطباعة</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 font-semibold text-left">إجراءات ومعاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCards.map((card) => {
                  const student = card.studentId ? studentMap.get(card.studentId) : null;
                  const isRevoked = card.status === 'revoked';

                  return (
                    <tr 
                      key={card.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Card Number & Theme badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCardForView(card)}
                            className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                            title="اضغط لعرض ومعاينة الكرنيه"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            <span>{card.cardNumber}</span>
                          </button>
                          {card.themeColor && (
                            <span 
                              className={`w-2 h-2 rounded-full ${
                                card.themeColor === 'emerald' ? 'bg-emerald-500' :
                                card.themeColor === 'indigo' ? 'bg-indigo-500' :
                                card.themeColor === 'amber' ? 'bg-amber-500' :
                                card.themeColor === 'rose' ? 'bg-rose-500' :
                                card.themeColor === 'slate' ? 'bg-slate-700' :
                                'bg-blue-500'
                              }`}
                              title={`سمة الكرنيه: ${card.themeColor}`}
                            />
                          )}
                        </div>
                      </td>

                      {/* Associated Student */}
                      <td className="px-4 py-3">
                        {student ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                              {student.name[0]}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                {student.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {student.phone}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedCardForView(card)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>غير مرتبط (ربط بطالب)</span>
                          </button>
                        )}
                      </td>

                      {/* Card Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          !isRevoked 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {!isRevoked ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              نشطة
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
                              قيد الطباعة
                            </>
                          ) : card.printStatus === 'available' ? (
                            <>
                              <Check className="w-3 h-3" />
                              جاهزة ومتاحة
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
                          {/* View Badge Modal Trigger */}
                          <button
                            onClick={() => setSelectedCardForView(card)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="معاينة وطباعة الكرنيه"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Mark Printed */}
                          {card.printStatus === 'queued' && (
                            <button
                              onClick={() => handleMarkPrinted(card.id)}
                              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                              title="تعليم كمطبوعة"
                            >
                              تم الطباعة
                            </button>
                          )}

                          {/* Delete Card */}
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

      {/* Pop-up Modal 1: Generate & Customize QR Cards */}
      <QrCardModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        students={students || []}
        existingCards={cards || []}
        defaultCenterName={academyName}
        onSaveCards={handleSaveCards}
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
      />

      {/* Pop-up Modal 3: Batch Print Sheet Modal */}
      <QrPrintSheetModal
        isOpen={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        cards={queuedCardsList.length > 0 ? queuedCardsList : (cards || []).slice(0, 16)}
        students={students || []}
        title={queuedCardsList.length > 0 ? `طباعة كروت الانتظار (${queuedCardsList.length})` : 'طباعة مجموعة كروت QR'}
        onConfirmPrinted={handleMarkAllQueuedPrinted}
      />
    </div>
  );
}
