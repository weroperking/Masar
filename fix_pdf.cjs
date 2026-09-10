const fs = require('fs');
let content = fs.readFileSync('src/components/Qr/QrPrintSheetModal.tsx', 'utf8');

// Import html2canvas and jsPDF
content = content.replace("import { QrCard, Student }", "import html2canvas from 'html2canvas';\nimport { jsPDF } from 'jspdf';\nimport { Download } from 'lucide-react';\nimport { QrCard, Student }");

// Replace handlePrint with both handlePrint and handleDownloadPdf
content = content.replace(/const handlePrint = \(\) => \{\n    window\.print\(\);\n  \};/, `const handlePrint = () => {
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
      
      pdf.save(\`Masar_Cards_\${new Date().getTime()}.pdf\`);
      
      if (onConfirmPrinted) {
        await onConfirmPrinted();
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };`);

// Update Header Actions
content = content.replace(/<button\s*onClick=\{handlePrint\}\s*className="flex items-center gap-2 px-5 py-2 bg-slate-900.*?>[\s\S]*?<\/button>/, `<button 
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'جاري التحضير...' : 'تحميل PDF'}
            </button>
            <button 
              onClick={handlePrint}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              طباعة عادية
            </button>`);

// Add 'id="qr-cards-print-container"' and '.qr-print-card' to the container and items
content = content.replace(/<div className="flex-1 overflow-y-auto p-4 sm:p-6 sm:bg-slate-100 dark:sm:bg-slate-950\/50 print:p-0 print:bg-white print:overflow-visible">/, `<div id="qr-cards-print-container" className="flex-1 overflow-y-auto p-4 sm:p-6 sm:bg-slate-100 dark:sm:bg-slate-950/50 print:p-0 print:bg-white print:overflow-visible">`);

content = content.replace(/<div\s*key=\{card\.id\}\s*className="break-inside-avoid shadow-xs print:shadow-none bg-white rounded-xl"/g, `<div key={card.id} className="qr-print-card break-inside-avoid shadow-xs print:shadow-none bg-white rounded-xl"`);

content = content.replace(/themeColor=\{card\.themeColor\}\s*\/>/g, `themeColor={card.themeColor} backgroundImage={card.backgroundImage} />`);

fs.writeFileSync('src/components/Qr/QrPrintSheetModal.tsx', content);
