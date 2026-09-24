import React, { useState } from 'react';
import { 
  X, Download, CreditCard, Hash, Layers, FileText, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../context/ToastContext';
import { CardCustomDesign } from '../../types';
import { downloadCardImage } from '../../utils/cardRenderer';

interface ExportCardOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: CardCustomDesign;
  academyName?: string;
  totalStudents?: number;
}

export function ExportCardOrderModal({
  isOpen,
  onClose,
  design,
  academyName = 'المركز التعليمي',
  totalStudents = 0
}: ExportCardOrderModalProps) {
  const toast = useToast();

  const [copiesCount, setCopiesCount] = useState<number>(totalStudents > 0 ? totalStudents : 100);
  const [fromId, setFromId] = useState<string>('1001');
  const [toId, setToId] = useState<string>(
    totalStudents > 0 ? String(1000 + totalStudents) : '1100'
  );
  const [notes, setNotes] = useState<string>('طباعة كروت بلاستيكية PVC صلبة عالية الجودة مع تغليف لامع مقاوم للماء والتلف.');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Process: Download both HD images and automatically trigger WhatsApp in the background
  const handleDownloadAndTriggerWhatsApp = async () => {
    setIsProcessing(true);
    toast.info('جاري معالجة التصاميم وتنزيل الصورتين بدقة HD...');

    try {
      // 1. Download Front Image
      await downloadCardImage(
        {
          design,
          face: 'front',
          cardNumber: fromId,
          width: 1050,
          height: 660
        },
        `تصميم_كارت_الوجه_الامامي_${Date.now()}.png`
      );

      // Brief pause between browser downloads
      await new Promise(r => setTimeout(r, 450));

      // 2. Download Back Image
      await downloadCardImage(
        {
          design,
          face: 'back',
          cardNumber: fromId,
          width: 1050,
          height: 660
        },
        `تصميم_كارت_الوجه_الخلفي_${Date.now()}.png`
      );

      toast.success('تم تنزيل صوري وجه وظهر الكارت بدقة HD بنجاح!');

      // 3. Open WhatsApp in the background with the order details
      const targetPhone = '201277707096'; // Egypt code + phone number
      const messageText = `السلام عليكم ورحمة الله وبركاته،\nأود طلب طباعة كروت لـ: *${academyName}*\n\n` +
        `• *عدد الكروت المطلوبة:* ${copiesCount} كارت\n` +
        `• *نطاق الأكواد:* من ${fromId} إلى ${toId}\n` +
        `• *ملاحظات الطباعة:* ${notes}`;

      const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
      
      // Delay slightly so the local file downloads finish before navigating
      setTimeout(() => {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }, 800);

    } catch (err: any) {
      console.error('[Process Error]', err);
      toast.error('حدث خطأ أثناء معالجة التصاميم: ' + (err.message || err.toString()));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
          dir="rtl"
        >
          {/* Backdrop overlay with fade animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          />

          {/* Bottom Sheet on Mobile, Centered Modal on Desktop */}
          <motion.div 
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col h-full sm:h-auto max-h-[100dvh] sm:max-h-[96vh] z-10"
          >
            {/* Grab Handle for mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 bg-white dark:bg-slate-900">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    طلب طباعة وتصدير الكروت
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    تنزيل صور التصميم بدقة عالية (HD) جاهزة للطباعة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              
              {/* Order Configuration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Copies Count */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>عدد النسخ المطلوبة:</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={copiesCount}
                    onChange={e => setCopiesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* From ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <span>من كود الطالب (From ID):</span>
                  </label>
                  <input
                    type="text"
                    value={fromId}
                    onChange={e => setFromId(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* To ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <span>إلى كود الطالب (To ID):</span>
                  </label>
                  <input
                    type="text"
                    value={toId}
                    onChange={e => setToId(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>ملاحظات إضافية للطباعة:</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالخامة أو التغليف..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
              >
                إغلاق
              </button>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleDownloadAndTriggerWhatsApp}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري معالجة وتنزيل الصور بدقة HD...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تنزيل الصورتين بدقة HD</span>
                  </>
                )}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
