import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
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
              <div className="grid grid-cols-2 gap-2 mt-2.5 w-full">
                {cleanStudentPhone && (
                  <button
                    type="button"
                    title="اضغط للتواصل مع الطالب"
                    onClick={() =>
                      setActiveContact({
                        type: 'student',
                        title: 'هاتف الطالب',
                        name: studentName,
                        phone: studentPhone || cleanStudentPhone,
                      })
                    }
                    className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-amber-200/80 dark:border-amber-900/50 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm text-center transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  >
                    الطالب
                  </button>
                )}

                {cleanParentPhone && (
                  <button
                    type="button"
                    title="اضغط للتواصل مع ولي الأمر"
                    onClick={() =>
                      setActiveContact({
                        type: 'parent',
                        title: 'هاتف ولي الأمر',
                        name: parentName,
                        phone: parentPhone || cleanParentPhone,
                      })
                    }
                    className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-amber-200/80 dark:border-amber-900/50 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm text-center transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  >
                    ولي الأمر
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
