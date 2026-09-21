import { useState } from 'react';
import { ShieldAlert, User, Users, ChevronLeft } from 'lucide-react';
import { ContactBottomSheet, ContactTarget } from './ContactBottomSheet';

interface LostCardNoticeProps {
  studentName?: string;
  studentPhone?: string;
  parentPhone?: string;
  parentName?: string;
}

export function LostCardNotice({
  studentName,
  studentPhone,
  parentPhone,
  parentName,
}: LostCardNoticeProps) {
  const [activeContact, setActiveContact] = useState<ContactTarget | null>(null);

  const cleanStudentPhone = studentPhone ? studentPhone.replace(/\D/g, '') : '';
  const cleanParentPhone = parentPhone ? parentPhone.replace(/\D/g, '') : '';

  const hasAnyContact = !!(cleanStudentPhone || cleanParentPhone);

  return (
    <>
      <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-right transition-all shadow-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100/90 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                في حال العثور على هذا الكارت
              </h3>
              <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                نداء أمانة
              </span>
            </div>

            <p className="text-[10px] text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
              يُرجى التكرم بالتواصل لإعادة هذه البطاقة لصاحبها عبر الأرقام المسجلة:
            </p>

            {hasAnyContact ? (
              <div className="space-y-1.5 mt-2.5">
                {cleanStudentPhone && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveContact({
                        type: 'student',
                        title: 'هاتف الطالب',
                        name: studentName,
                        phone: studentPhone || cleanStudentPhone,
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between gap-2 text-right transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block truncate">
                          الطالب {studentName ? `(${studentName.split(' ')[0]})` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">
                          {studentPhone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                      <span>عرض خيارات التواصل</span>
                      <ChevronLeft className="w-3 h-3" />
                    </div>
                  </button>
                )}

                {cleanParentPhone && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveContact({
                        type: 'parent',
                        title: 'هاتف ولي الأمر',
                        name: parentName,
                        phone: parentPhone || cleanParentPhone,
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between gap-2 text-right transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block truncate">
                          ولي الأمر {parentName ? `(${parentName})` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block" dir="ltr">
                          {parentPhone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                      <span>عرض خيارات التواصل</span>
                      <ChevronLeft className="w-3 h-3" />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5 bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                يُرجى تسليم البطاقة إلى مقر السنتر التعليمي أو إدارته لإيصالها لصاحبها.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Contact Bottom Sheet */}
      <ContactBottomSheet
        contact={activeContact}
        onClose={() => setActiveContact(null)}
        studentName={studentName}
      />
    </>
  );
}
