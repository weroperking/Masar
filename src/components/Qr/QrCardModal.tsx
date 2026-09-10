import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  X, User, Layers, Users, RefreshCw, Check, 
  Printer, Save, Search, CheckCircle2, AlertCircle, Palette, QrCode, Sparkles, SlidersHorizontal,
  Image
} from 'lucide-react';
import { Student, QrCard } from '../../types';
import { db } from '../../db/db';
import { QrCardBadge, CardThemeColor } from './QrCardBadge';

interface QrCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  existingCards: QrCard[];
  defaultCenterName?: string;
  onSaveCards: (cards: Partial<QrCard>[], shouldPrintImmediately?: boolean) => Promise<void>;
}

type Mode = 'single_student' | 'single_unassigned' | 'batch_unassigned_students' | 'batch_blank';

export function QrCardModal({
  isOpen,
  onClose,
  students,
  existingCards,
  defaultCenterName = 'أكاديمية مسار التعليمية',
  onSaveCards
}: QrCardModalProps) {
  const [mode, setMode] = useState<Mode>('single_student');
  
  // Customization state
  const [centerName, setCenterName] = useState(defaultCenterName);
  const [themeColor, setThemeColor] = useState<CardThemeColor>('blue');
  const [cardSize, setCardSize] = useState<'normal' | 'compact'>('normal');
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  // Single student mode state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Calculate next sequential numeric code
  const getNextSequenceStart = () => {
    let max = 0;
    existingCards.forEach(card => {
      const numMatch = card.cardNumber?.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num > max) max = num;
      }
    });
    students.forEach(s => {
      if (s.studentCode && /^\d+$/.test(s.studentCode)) {
        const num = parseInt(s.studentCode, 10);
        if (num > max) max = num;
      }
    });
    return max + 1;
  };

  const generateSequentialSerial = (currentNum: number) => {
    return String(currentNum).padStart(4, '0');
  };

  const [cardNumber, setCardNumber] = useState<string>(() => generateSequentialSerial(getNextSequenceStart()));
  
  // Batch blank mode state
  const [batchCount, setBatchCount] = useState<number>(10);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map of student card associations
  const studentToCardMap = useMemo(() => {
    const map = new Map<string, QrCard>();
    existingCards.forEach(c => {
      if (c.studentId && c.status === 'active' && !c.deleted_at) {
        map.set(c.studentId, c);
      }
    });
    return map;
  }, [existingCards]);

  // Students who don't have an active card
  const unassignedStudents = useMemo(() => {
    return students.filter(s => !s.deleted_at && !studentToCardMap.has(s.id));
  }, [students, studentToCardMap]);

  // Filtered students for single mode selector
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.filter(s => !s.deleted_at).slice(0, 6);
    const term = studentSearch.toLowerCase();
    return students
      .filter(s => !s.deleted_at && (s.name.toLowerCase().includes(term) || (s.phone && s.phone.includes(term))))
      .slice(0, 6);
  }, [students, studentSearch]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const existingStudentCard = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentToCardMap.get(selectedStudentId) || null;
  }, [selectedStudentId, studentToCardMap]);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    setCardNumber(generateSequentialSerial(getNextSequenceStart()));
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentSearch('');
    if (student.studentCode) {
      setCardNumber(student.studentCode.replace(/\D/g, ''));
    } else {
      setCardNumber(generateSequentialSerial(getNextSequenceStart()));
    }
  };

  const calculatedTotalCards = () => {
    if (mode === 'single_student') return 1;
    if (mode === 'single_unassigned') return 1;
    if (mode === 'batch_unassigned_students') return unassignedStudents.length;
    if (mode === 'batch_blank') return batchCount;
    return 1;
  };

  const handleSubmit = async (printImmediately: boolean = false) => {
    setIsSubmitting(true);
    try {
      const now = Date.now();
      const generatedCards: Partial<QrCard>[] = [];
      let nextSeq = getNextSequenceStart();

      if (mode === 'single_student') {
        let serial = (cardNumber || '').replace(/\D/g, '');
        if (selectedStudent && selectedStudent.studentCode) {
          serial = selectedStudent.studentCode.replace(/\D/g, '') || serial;
        }
        if (!serial) {
          serial = generateSequentialSerial(nextSeq++);
        }

        // Keep studentCode in students table 100% matched with the barcode number
        if (selectedStudent && (!selectedStudent.studentCode || selectedStudent.studentCode !== serial)) {
          await db.students.update(selectedStudent.id, {
            studentCode: serial,
            updated_at: now,
            sync_status: 'pending'
          });
        }

        const id = uuidv4();
        generatedCards.push({
          id,
          cardNumber: serial,
          qrCodeData: serial,
          studentId: selectedStudentId || undefined,
          linkedAt: selectedStudentId ? now : undefined,
          printStatus: printImmediately ? 'available' : 'queued',
          status: 'active',
          themeColor,
          centerName,
          backgroundImage,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      } else if (mode === 'single_unassigned') {
        const serial = generateSequentialSerial(nextSeq++);
        const id = uuidv4();
        generatedCards.push({
          id,
          cardNumber: serial,
          qrCodeData: serial,
          printStatus: printImmediately ? 'available' : 'queued',
          status: 'active',
          themeColor,
          centerName,
          backgroundImage,
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        });
      } else if (mode === 'batch_blank') {
        const count = Math.min(Math.max(1, batchCount), 200);
        for (let i = 0; i < count; i++) {
          const id = uuidv4();
          const serial = generateSequentialSerial(nextSeq++);
          generatedCards.push({
            id,
            cardNumber: serial,
            qrCodeData: serial,
            printStatus: 'queued',
            status: 'active',
            themeColor,
            centerName,
            backgroundImage,
            created_at: now,
            updated_at: now,
            sync_status: 'pending'
          });
        }
      } else if (mode === 'batch_unassigned_students') {
        for (const stu of unassignedStudents) {
          const id = uuidv4();
          let serial = stu.studentCode ? stu.studentCode.replace(/\D/g, '') : '';
          if (!serial) {
            serial = generateSequentialSerial(nextSeq++);
            await db.students.update(stu.id, {
              studentCode: serial,
              updated_at: now,
              sync_status: 'pending'
            });
          }
          generatedCards.push({
            id,
            cardNumber: serial,
            qrCodeData: serial,
            studentId: stu.id,
            linkedAt: now,
            printStatus: 'queued',
            status: 'active',
            themeColor,
            centerName,
            backgroundImage,
            created_at: now,
            updated_at: now,
            sync_status: 'pending'
          });
        }
      }

      await onSaveCards(generatedCards, printImmediately);
      onClose();
    } catch (err) {
      console.error('Error generating cards', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors: { id: CardThemeColor; name: string; bg: string }[] = [
    { id: 'blue', name: 'أزرق مسار', bg: 'bg-blue-600' },
    { id: 'emerald', name: 'أخضر زمردي', bg: 'bg-emerald-600' },
    { id: 'indigo', name: 'كحلي داكن', bg: 'bg-indigo-600' },
    { id: 'amber', name: 'ذهبي كهرماني', bg: 'bg-amber-600' },
    { id: 'rose', name: 'عنابي وردي', bg: 'bg-rose-600' },
    { id: 'slate', name: 'رمادي ليلي', bg: 'bg-slate-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 overflow-y-auto">
      <div 
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                إصدار وتخصيص بطاقات QR الذكية
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                توليد فوري وبسيط لبطاقات الحضور ومسح الباركود دون الحاجة لبيانات معقدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Mode Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                اختر نوع العملية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single_student')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                    mode === 'single_student'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <User className="w-4 h-4 mb-1" />
                  <span className="text-xs">طالب محدد</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">كرنيه مخصص بالاسم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('single_unassigned')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                    mode === 'single_unassigned'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-1" />
                  <span className="text-xs">كارت عام فوري</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">بطاقة واحدة للتوزيع</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('batch_unassigned_students')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all relative ${
                    mode === 'batch_unassigned_students'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {unassignedStudents.length > 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                      {unassignedStudents.length}
                    </span>
                  )}
                  <Users className="w-4 h-4 mb-1" />
                  <span className="text-xs">طلاب بلا كروت</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">إصدار آلي للكل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('batch_blank')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                    mode === 'batch_blank'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4 mb-1" />
                  <span className="text-xs">دفعة كروت عامة</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">جاهزة للطباعة</span>
                </button>
              </div>
            </div>

            {/* Mode-Specific Settings */}
            {mode === 'single_student' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  اختر الطالب لإصدار الكرنيه له:
                </label>

                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-900/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {selectedStudent.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {selectedStudent.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {selectedStudent.phone || 'بدون هاتف'} • {selectedStudent.gradeLevel || selectedStudent.school || 'المرحلة الدراسية'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId('')}
                      className="text-xs text-slate-400 hover:text-red-600 px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      تغيير
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      {filteredStudents.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          لا يوجد طلاب مطابقين للبحث
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const hasCard = studentToCardMap.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectStudent(s)}
                              className="w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 ml-2">
                                  {s.name}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">{s.phone}</span>
                              </div>
                              {hasCard ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                                  لديه بطاقة
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                                  متاح للإصدار
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {existingStudentCard && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      هذا الطالب لديه بالفعل بطاقة مفعلة برقم{' '}
                      <strong className="font-mono font-bold">{existingStudentCard.cardNumber}</strong>.
                      توليد بطاقة جديدة سيصدر كرنيه إضافي / بديل له.
                    </div>
                  </div>
                )}

                {/* Auto-generated Serial preview with refresh button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">رقم الطالب / كود الباركود (أرقام فقط):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                      className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 w-24 text-center text-xs"
                      placeholder="0001"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title="توليد رقم تسلسلي جديد"
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'single_unassigned' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>توليد كارت عام مفرد جاهز للاستخدام الفوري</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  سيتم إنشاء بطاقة واحدة مع باركود فريد غير مقيد بطالب، لتسليمها عند شباك الاستقبال أو ربطها لاحقاً بالطالب عبر المسح.
                </p>
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-500">الرمز التسلسلي:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {cardNumber}
                  </span>
                </div>
              </div>
            )}

            {mode === 'batch_unassigned_students' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    إصدار مخصص للطلاب غير الحاصلين على كروت:
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-bold">
                    {unassignedStudents.length} طالب
                  </span>
                </div>
                {unassignedStudents.length === 0 ? (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 font-semibold text-center border border-emerald-200 dark:border-emerald-800">
                    جميع الطلاب المسجلين لديهم كروت نشطة بالفعل.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    {unassignedStudents.slice(0, 8).map((stu) => (
                      <div key={stu.id} className="flex justify-between py-1.5 px-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{stu.name}</span>
                        <span className="font-mono text-slate-400">{stu.phone || 'بدون هاتف'}</span>
                      </div>
                    ))}
                    {unassignedStudents.length > 8 && (
                      <div className="text-center text-slate-400 text-[11px] pt-1.5">
                        + {unassignedStudents.length - 8} طلاب آخرين
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'batch_blank' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  حدد عدد البطاقات المطلوبة:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBatchCount(num)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors border ${
                        batchCount === num
                          ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {num} بطاقة
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  سيتم توليد وتجهيز {batchCount} بطاقة متسلسلة وجاهزة للطباعة الجماعية فوراً.
                </p>
              </div>
            )}

            {/* Customization Options */}
            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                تخصيص المظهر والهوية
              </h3>

              {/* Theme Colors */}
              <div>
                <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  لون السمة:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setThemeColor(c.id)}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs font-medium transition-all ${
                        themeColor === c.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg} shrink-0`} />
                      <span className="truncate text-[11px]">{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Center Name */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  اسم السنتر / الأكاديمية على الكرنيه:
                </label>
                <input
                  type="text"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Format / Sizing */}
              <div>
                <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  حجم البطاقة:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCardSize('normal')}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      cardSize === 'normal'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    كرنيه قياسي كامل (ID Badge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardSize('compact')}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      cardSize === 'compact'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    ملصق باركود مدمج (Sticker)
                  </button>
                </div>
              
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <Image className="w-4 h-4 text-slate-400" />
                صورة خلفية مخصصة (اختياري)
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setBackgroundImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setBackgroundImage('');
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {backgroundImage && (
                <button 
                  type="button" 
                  onClick={() => setBackgroundImage('')}
                  className="text-xs text-red-500 hover:text-red-700 mt-2 block"
                >
                  إزالة الخلفية
                </button>
              )}
            </div>

            {/* Practical Summary Box */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>ملخص عملية التوليد المباشرة:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <div>
                  • عدد البطاقات: <strong className="text-slate-900 dark:text-slate-100">{calculatedTotalCards()} بطاقة</strong>
                </div>
                <div>
                  • نوع الإصدار:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {mode === 'single_student'
                      ? selectedStudent ? `مخصصة لـ ${selectedStudent.name}` : 'طالب محدد'
                      : mode === 'single_unassigned'
                      ? 'كارت عام حر'
                      : mode === 'batch_unassigned_students'
                      ? 'مجموعة طلاب'
                      : 'دفعة عامة'}
                  </strong>
                </div>
                <div>
                  • السمة اللونية: <strong className="text-slate-900 dark:text-slate-100">{colors.find(c => c.id === themeColor)?.name}</strong>
                </div>
                <div>
                  • التجهيز: <strong className="text-slate-900 dark:text-slate-100">جاهز للحفظ أو الطباعة</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                معاينة مباشرة للبطاقة
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {cardSize === 'compact' ? '280x178px' : '350x225px'}
              </span>
            </div>

            {/* Preview Card */}
            <div className="w-full flex items-center justify-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <QrCardBadge
                cardNumber={mode === 'single_student' ? (cardNumber.replace(/\D/g, '') || '0001') : generateSequentialSerial(getNextSequenceStart())}
                qrCodeData={mode === 'single_student' ? (cardNumber.replace(/\D/g, '') || '0001') : generateSequentialSerial(getNextSequenceStart())}
                studentName={
                  mode === 'single_student'
                    ? selectedStudent?.name || 'اسم الطالب'
                    : mode === 'batch_unassigned_students'
                    ? unassignedStudents[0]?.name || 'محمد أحمد علي'
                    : null
                }
                studentPhone={
                  mode === 'single_student'
                    ? selectedStudent?.phone || '01012345678'
                    : mode === 'batch_unassigned_students'
                    ? unassignedStudents[0]?.phone || '01012345678'
                    : null
                }
                studentGrade={
                  mode === 'single_student'
                    ? selectedStudent?.gradeLevel || 'الصف الثالث الثانوي'
                    : mode === 'batch_unassigned_students'
                    ? unassignedStudents[0]?.gradeLevel || 'الصف الثالث الثانوي'
                    : null
                }
                studentSchool={
                  mode === 'single_student'
                    ? selectedStudent?.school || 'مدرسة المتفوقين'
                    : mode === 'batch_unassigned_students'
                    ? unassignedStudents[0]?.school || 'مدرسة المتفوقين'
                    : null
                }
                centerName={centerName}
                themeColor={themeColor}
                showPhone={true}
                showGrade={true}
                showCenterName={true}
                showCardNumber={true}
                size={cardSize}
                backgroundImage={backgroundImage}
              />
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
              المقاسات متوافقة مع بطاقات PVC القياسية (ISO ID-1) وأوراق الطباعة اللاصقة A4
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'single_student' && (selectedStudent ? `إصدار وتخصيص كرنيه للطالب (${selectedStudent.name})` : 'حدد طالباً أو اضغط حفظ لتوليد كارت عام')}
            {mode === 'single_unassigned' && 'إصدار بطاقة واحدة عامة غير مقيدة.'}
            {mode === 'batch_unassigned_students' && `إصدار ${unassignedStudents.length} بطاقة للطلاب.`}
            {mode === 'batch_blank' && `إصدار ${batchCount} بطاقة عامة متسلسلة.`}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={isSubmitting || (mode === 'batch_unassigned_students' && unassignedStudents.length === 0)}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'توليد وحفظ البطاقات'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || (mode === 'batch_unassigned_students' && unassignedStudents.length === 0)}
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>توليد وطباعة فورية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
