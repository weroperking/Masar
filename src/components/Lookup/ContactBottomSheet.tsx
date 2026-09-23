import { PhoneCall, MessageCircle, Copy, Check, User, Users } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { getWhatsAppUrl } from '../../utils/phone';

export interface ContactTarget {
  type: 'student' | 'parent';
  title: string;
  name?: string;
  phone: string;
}

interface ContactBottomSheetProps {
  contact: ContactTarget | null;
  onClose: () => void;
  studentName?: string;
}

export function ContactBottomSheet({ contact, onClose, studentName }: ContactBottomSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!contact) return null;

  const cleanPhone = contact.phone.replace(/\D/g, '');
  const isStudent = contact.type === 'student';

  const handleCopy = () => {
    navigator.clipboard?.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultMsg = isStudent
    ? `السلام عليكم، لقد عثرت على كارت الطالب (${studentName || contact.name || ''}) التابع لمنصة مسار.`
    : `السلام عليكم، لقد عثرت على كارت نجلكم الطالب (${studentName || ''}).`;

  return (
    <BottomSheet
      isOpen={!!contact}
      onClose={onClose}
      title={isStudent ? 'التواصل مع الطالب' : 'التواصل مع ولي الأمر'}
      subtitle={contact.name ? `${contact.name}` : undefined}
      maxHeight="max-h-[70vh] sm:max-h-[60vh]"
    >
      <div className="space-y-4 py-1 text-right" dir="rtl">
        {/* Contact Info Header Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {isStudent ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                {isStudent ? 'رقم هاتف الطالب' : 'رقم هاتف ولي الأمر'}
              </span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 block" dir="ltr">
                {contact.phone}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs shrink-0 cursor-pointer"
            title="نسخ الرقم"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 text-[11px] font-bold">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span className="text-[11px]">نسخ</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Actions in BottomSheet */}
        <div className="space-y-2.5 pt-1">
          <a
            href={`tel:${cleanPhone}`}
            className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>اتصال هاتفي مباشر ({contact.phone})</span>
          </a>

          <a
            href={getWhatsAppUrl(cleanPhone, defaultMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>مراسلة فورية عبر واتساب</span>
          </a>
        </div>

        <p className="text-[11px] text-slate-400 text-center pt-1">
          جزاكم الله خيراً على مسعاكم لإعادة هذه البطاقة لصاحبها
        </p>
      </div>
    </BottomSheet>
  );
}
