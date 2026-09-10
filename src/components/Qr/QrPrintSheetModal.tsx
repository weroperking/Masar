import React from 'react';
import { X, Printer, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { QrCard, Student } from '../../types';
import { QrCardBadge, CardThemeColor } from './QrCardBadge';

interface QrPrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: QrCard[];
  students: Student[];
  title?: string;
  onConfirmPrinted?: () => Promise<void>;
}

export function QrPrintSheetModal({
  isOpen,
  onClose,
  cards,
  students,
  title = 'طباعة بطاقات QR للطلاب',
  onConfirmPrinted
}: QrPrintSheetModalProps) {
  if (!isOpen || cards.length === 0) return null;

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const handlePrint = () => {
    window.print();
  };

  const [isExporting, setIsExporting] = React.useState(false);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4' // or 'id-1' for single cards
      });

      const cardsContainer = document.getElementById('qr-cards-print-container');
      if (!cardsContainer) return;

      const cardElements = cardsContainer.querySelectorAll('.qr-print-card');
      
      for (let i = 0; i < cardElements.length; i++) {
        const el = cardElements[i] as HTMLElement;
        const canvas = await html2canvas(el, { scale: 3, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        // A standard CR80 card is 85.6mm x 53.98mm
        const cardWidth = 85.6;
        const cardHeight = 54.0;
        
        // Add a new page for each card after the first
        if (i > 0) {
          pdf.addPage([cardWidth, cardHeight], 'landscape');
        } else {
          // Resize the first page to card dimensions
          pdf.deletePage(1);
          pdf.addPage([cardWidth, cardHeight], 'landscape');
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, cardWidth, cardHeight);
      }
      
      pdf.save(`Masar_Cards_${new Date().getTime()}.pdf`);
      
      if (onConfirmPrinted) {
        await onConfirmPrinted();
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto">
      <div 
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:p-0 print:m-0 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header - Hidden in physical print */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إجمالي {cards.length} بطاقة بتنسيق شبكي منظم للطباعة وقص الحواف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>إرسال للطابعة الآن</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0 print:overflow-visible">
          {/* Guide banner - Hidden on print */}
          <div className="mb-6 p-3.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between print:hidden">
            <span>
              💡 نصيحة الطباعة: تم تجهيز المقاسات لتناسب ورق A4 العادي أو ورق الكروت المقوى مع هوامش قص دقيقة. اختر "حجم الورق: A4" و"الهوامش: الحد الأدنى / None" في إعدادات الطابعة للحصول على أفضل نتيجة.
            </span>
            {onConfirmPrinted && (
              <button
                onClick={onConfirmPrinted}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shrink-0 mr-3 transition-colors"
              >
                تحديث حالة الجميع إلى "مطبوعة"
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:p-4 justify-items-center">
            {cards.map((card) => {
              const student = card.studentId ? studentMap.get(card.studentId) : null;
              return (
                <div
                  key={card.id}
                  className="relative p-2 rounded-lg bg-white border border-dashed border-slate-300 dark:border-slate-700 shadow-xs print:shadow-none print:border-slate-300 print:break-inside-avoid print:p-1"
                >
                  <QrCardBadge
                    cardNumber={card.cardNumber || '0001'}
                    qrCodeData={card.qrCodeData || card.cardNumber || '0001'}
                    studentName={student?.name}
                    studentPhone={student?.phone}
                    studentGrade={student?.gradeLevel}
                    studentSchool={student?.school}
                    centerName={card.centerName || 'سنتر مسار التعليمي'}
                    themeColor={(card.themeColor as CardThemeColor) || 'blue'}
                    status={card.status}
                    size="print"
                  />
                  {/* Subtle cut indicators */}
                  <div className="text-[9px] text-slate-400 font-mono text-center mt-1 print:block hidden">
                    ✂ خط القص
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Hidden on print */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <span className="text-xs text-slate-500">
            جاهز للطباعة على طابعات الليزر أو طابعات الكروت البلاستيكية (PVC)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكل ({cards.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
