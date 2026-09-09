import React, { useState } from 'react';
import { X, Printer, User, ShieldAlert, CheckCircle2, UserPlus, Phone, Calendar } from 'lucide-react';
import { QrCard, Student } from '../../types';
import { QrCardBadge, CardThemeColor } from './QrCardBadge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface QrCardViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: QrCard | null;
  student?: Student | null;
  allStudents: Student[];
  onLinkStudent: (cardId: string, studentId: string) => Promise<void>;
  onToggleStatus: (cardId: string, newStatus: 'active' | 'revoked') => Promise<void>;
  onMarkPrinted: (cardId: string) => Promise<void>;
}

export function QrCardViewModal({
  isOpen,
  onClose,
  card,
  student,
  allStudents,
  onLinkStudent,
  onToggleStatus,
  onMarkPrinted
}: QrCardViewModalProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !card) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveLink = async () => {
    if (!selectedStudentId) return;
    await onLinkStudent(card.id, selectedStudentId);
    setIsLinking(false);
    setSelectedStudentId('');
  };

  const filteredStudents = allStudents.filter(
    (s) => !s.deleted_at && (s.name.includes(searchTerm) || s.phone.includes(searchTerm))
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto">
      {/* Container with print styles */}
      <div 
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:w-auto print:max-w-none print:p-0 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header - Hidden on physical print */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 print:hidden bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تفاصيل كرنيه QR الخاص بالطالب
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {card.cardNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Card Badge Display Area */}
          <div className="flex justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 print:p-0 print:bg-transparent print:border-none">
            <QrCardBadge
              cardNumber={card.cardNumber || 'MSR-SAMPLE'}
              qrCodeData={card.qrCodeData || card.cardNumber}
              studentName={student?.name}
              studentPhone={student?.phone}
              studentGrade={student?.gradeLevel}
              studentSchool={student?.school}
              centerName={card.centerName || 'سنتر مسار التعليمي'}
              themeColor={(card.themeColor as CardThemeColor) || 'blue'}
              status={card.status}
              size="large"
            />
          </div>

          {/* Practical Card Metadata - Hidden on print */}
          <div className="space-y-4 print:hidden">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block mb-1">حالة البطاقة</span>
                <div className="flex items-center gap-1.5">
                  {card.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      نشطة وجاهزة للمسح
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      موقوفة
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block mb-1">حالة الطباعة</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {card.printStatus === 'queued'
                    ? 'في قائمة الانتظار للطباعة'
                    : card.printStatus === 'available'
                    ? 'مطبوعة وجاهزة للتسليم'
                    : 'تم التسليم والربط'}
                </span>
              </div>
            </div>

            {/* Student Association Details */}
            {student ? (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                    {student.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{student.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{student.phone}</p>
                  </div>
                </div>

                <div className="text-left text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {card.linkedAt
                        ? format(new Date(card.linkedAt), 'dd MMMM yyyy', { locale: ar })
                        : 'تم الربط'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    هذه البطاقة عامة ولم يتم ربطها بأي طالب بعد.
                  </div>
                  {!isLinking && (
                    <button
                      onClick={() => setIsLinking(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      ربط بطالب الآن
                    </button>
                  )}
                </div>

                {isLinking && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        اختر الطالب المراد ربط البطاقة به:
                      </span>
                      <button
                        onClick={() => setIsLinking(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        إلغاء
                      </button>
                    </div>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStudentId(s.id)}
                          className={`w-full text-right px-3 py-2 text-xs flex justify-between items-center transition-colors ${
                            selectedStudentId === s.id
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-slate-400 font-mono">{s.phone}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveLink}
                      disabled={!selectedStudentId}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      تأكيد ربط البطاقة بالطالب
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions - Hidden on print */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onToggleStatus(card.id, card.status === 'active' ? 'revoked' : 'active')
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                card.status === 'active'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              {card.status === 'active' ? 'إيقاف البطاقة' : 'إعادة تفعيل البطاقة'}
            </button>

            {card.printStatus === 'queued' && (
              <button
                onClick={() => onMarkPrinted(card.id)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                تعليم كمطبوعة
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكرنيه</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
