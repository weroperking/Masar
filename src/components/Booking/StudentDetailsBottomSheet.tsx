import React, { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { User, Phone, Check, ShieldCheck, X } from 'lucide-react';

interface StudentDetailsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  onSave: (data: { name: string; phone: string }) => void;
}

export function StudentDetailsBottomSheet({
  isOpen,
  onClose,
  name,
  phone,
  onSave,
}: StudentDetailsBottomSheetProps) {
  const [localName, setLocalName] = useState(name);
  const [localPhone, setLocalPhone] = useState(phone);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalName(name);
      setLocalPhone(phone);
      setError('');
    }
  }, [isOpen, name, phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) {
      setError('يرجى إدخال اسم الطالب ثلاثي');
      return;
    }
    if (!localPhone.trim() || localPhone.trim().length < 9) {
      setError('يرجى إدخال رقم هاتف صحيح (واتساب)');
      return;
    }

    onSave({
      name: localName.trim(),
      phone: localPhone.trim(),
    });
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="بيانات الطالب للتسجيل"
      subtitle="أدخل بياناتك للتواصل معك وتأكيد حجز المقعد"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            اسم الطالب ثلاثي *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="مثال: أحمد محمد علي"
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                if (error) setError('');
              }}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            رقم الهاتف (واتساب لتأكيد الحجز) *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              required
              dir="ltr"
              placeholder="010XXXXXXXX"
              value={localPhone}
              onChange={(e) => {
                setLocalPhone(e.target.value);
                if (error) setError('');
              }}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right font-mono"
            />
          </div>
        </div>

        {/* Buttons: Save & Cancel */}
        <div className="pt-2 grid grid-cols-2 gap-2.5">
          <button
            type="submit"
            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>حفظ ومتابعة</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <X className="w-4 h-4" />
            <span>إلغاء</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>بياناتك سرية وآمنة وتستخدم فقط للتواصل الأكاديمي</span>
        </div>
      </form>
    </BottomSheet>
  );
}
