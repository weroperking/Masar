import React, { useState } from 'react';
import { 
  X, Download, Send, Copy, Check, CreditCard, 
  Hash, Layers, Phone, FileText, Sparkles,
  Loader2, Image as ImageIcon, Share2, ShieldCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CardCustomDesign } from '../../types';
import { downloadCardImage, generateCardDataUrl } from '../../utils/cardRenderer';

interface ExportCardOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: CardCustomDesign;
  academyName?: string;
  totalStudents?: number;
}

const TARGET_PHONE_NUMBER = '01277707096';
const TARGET_WHATSAPP_PHONE = '201277707096';

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
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Real entity name: never fallback to generic template names
  const realEntityName = (() => {
    const raw = (design.centerName || academyName || '').trim();
    if (!raw || raw.toLowerCase().includes('مسار') || raw.toLowerCase().includes('massr')) {
      return academyName && !academyName.toLowerCase().includes('مسار') ? academyName : 'المركز التعليمي / الأستاذ';
    }
    return raw;
  })();

  // Calculate count from IDs if numeric
  const numFrom = parseInt(fromId, 10);
  const numTo = parseInt(toId, 10);
  const calculatedRangeCount = (!isNaN(numFrom) && !isNaN(numTo) && numTo >= numFrom) 
    ? (numTo - numFrom + 1) 
    : null;

  // Build clean text message WITHOUT links
  const generateCleanOrderMessage = () => {
    const codeType = design.cardFormat === 'qrcode' ? 'رمز QR ذكي (QR Code)' : 'باركود كلاسيكي (Barcode Code 128)';

    return `*طلب طباعة وتجهيز كروت طلاب PVC*
━━━━━━━━━━━━━━━━━━━━
🏛️ *الجهة / المعلم:* ${realEntityName}
🔢 *الكمية المطلوبة:* ${copiesCount} كارت
🆔 *نطاق الأكواد:* من [${fromId}] إلى [${toId}]${calculatedRangeCount ? ` (إجمالي: ${calculatedRangeCount} كود)` : ''}
🏷️ *نوع الرمز:* ${codeType}
📐 *المواصفات:* كارت بلاستيك صلب PVC مقاس قياسي (CR80)
📝 *ملاحظات:* ${notes || 'لا توجد ملاحظات إضافية'}
━━━━━━━━━━━━━━━━━━━━
🖼️ *مرفق مع هذه الرسالة صورتي الوجه والظهر بجودة الطباعة الأصلية (HD).*`;
  };

  const handleCopyPrompt = async () => {
    try {
      const promptText = generateCleanOrderMessage();
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast.success('تم نسخ نص الطلب إلى الحافظة بنجاح!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذر النسخ التلقائي، يرجى نسخ النص يدوياً.');
    }
  };

  // Download Front Only (High-res in-memory 300 DPI)
  const handleDownloadFrontOnly = async () => {
    try {
      setIsProcessing(true);
      await downloadCardImage(
        {
          design,
          face: 'front',
          cardNumber: fromId,
          width: 1050,
          height: 660
        },
        `تصميم_الوجه_الامامي_${Date.now()}.png`
      );
      toast.success('تم تنزيل صورة الوجه الأمامي بجودة طباعة HD فائقة النقاء!');
    } catch (err: any) {
      toast.error('فشل تنزيل الصورة: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Back Only (High-res in-memory 300 DPI)
  const handleDownloadBackOnly = async () => {
    try {
      setIsProcessing(true);
      await downloadCardImage(
        {
          design,
          face: 'back',
          cardNumber: fromId,
          width: 1050,
          height: 660
        },
        `تصميم_الوجه_الخلفي_${Date.now()}.png`
      );
      toast.success('تم تنزيل صورة الوجه الخلفي مع الباركود بجودة HD فائقة النقاء!');
    } catch (err: any) {
      toast.error('فشل تنزيل الصورة: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Complete Process: Auto-download both HD images + Open WhatsApp with clean text prompt
  const handleProcessAndSend = async () => {
    setIsProcessing(true);
    toast.info('جاري معالجة التصاميم في الخلفية وتنزيل الصورتين بدقة HD فائقة...');

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
      await new Promise(r => setTimeout(r, 400));

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

      // 3. Prepare clean message text and copy to clipboard
      const messageText = generateCleanOrderMessage();
      try {
        await navigator.clipboard.writeText(messageText);
      } catch (e) {
        console.warn('Clipboard write warning:', e);
      }

      // 4. Open WhatsApp directly to target number 01277707096 with clean text
      const encodedPrompt = encodeURIComponent(messageText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${TARGET_WHATSAPP_PHONE}&text=${encodedPrompt}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);

      toast.success('تم تنزيل الصورتين على جهازك بنجاح وفتح الواتساب مع 01277707096!');
    } catch (err: any) {
      console.error('[Process Error]', err);
      toast.error('حدث خطأ أثناء معالجة التصاميم: ' + (err.message || err.toString()));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
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
                تنزيل صور التصميم وإرسال الطلب عبر الواتساب إلى <span className="font-mono font-bold text-blue-600 dark:text-blue-400">01277707096</span>
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
          
          {/* Target Recipient Banner */}
          <div className="p-3 sm:p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">الرقم المستلم للطلب: </span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">01277707096</span>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <span>الجهة: </span>
              <strong className="text-blue-600 dark:text-blue-400">{realEntityName}</strong>
            </div>
          </div>

          {/* Quick Image Download Badges */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>تنزيل ملفات الصور فوراً (دقة طباعة HD 300 DPI):</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بدون تشويش أو تشويه</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadFrontOnly}
                disabled={isProcessing}
                className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>تنزيل الوجه الأمامي (HD)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadBackOnly}
                disabled={isProcessing}
                className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>تنزيل الوجه الخلفي مع الكود (HD)</span>
              </button>
            </div>
          </div>

          {/* Order Configuration Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Copies Count */}
            <div className="space-y-1.5">
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

            {/* Target Phone Fixed */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>رقم الواتساب المستهدف:</span>
              </label>
              <div className="w-full text-xs font-mono font-bold p-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>01277707096</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">تلقائي</span>
              </div>
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

          {/* Injected Prompt Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>نص الطلب الذي سيتم إرساله للواتساب:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line select-all">
              {generateCleanOrderMessage()}
            </div>
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
            onClick={handleProcessAndSend}
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
                <Send className="w-4 h-4" />
                <span>تنزيل الصورتين HD وفتح الواتساب (01277707096)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
