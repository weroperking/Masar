const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Attendance.tsx', 'utf8');

// Replace state and refs related to QR scanning
content = content.replace(/const \[isQrMode, setIsQrMode\] = useState\(false\);/, '');

// Replace useEffect for focus
content = content.replace(/useEffect\(\(\) => \{\s*if \(isQrMode && qrInputRef\.current\) \{\s*qrInputRef\.current\.focus\(\);\s*\}\s*\}, \[isQrMode\]\);/, `useEffect(() => {
    // Always focus barcode input on mount and when modal opens
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.focus();
      }
    }, 100);
    
    // Global keyboard listener to capture barcode even if input loses focus
    let buffer = '';
    let lastKeyTime = 0;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if already in an input/textarea (like the barcode input itself)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
         return;
      }

      const currentTime = performance.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (/^[0-9a-zA-Z\\-]$/.test(e.key)) {
        buffer += e.key;
      } else if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        const code = buffer.trim();
        buffer = '';
        
        if (!code) return;
        
        // We simulate setting the input and firing handleQrScan
        setQrInput(code);
        setTimeout(() => {
          const fakeEvent = { key: 'Enter', preventDefault: () => {} };
          handleQrScan(fakeEvent, code);
        }, 10);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);`);

// Update handleQrScan signature to accept code directly
content = content.replace(/const handleQrScan = \(e: any\) => \{[\s\S]*?if \(!code\) return;/, `const handleQrScan = (e: any, overrideCode?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = overrideCode || qrInput.trim();
      setQrInput('');
      
      if (!code) return;`);


// Replace UI toggle button and input with just an always-visible input
const searchReplacement = `<div className="flex items-center gap-2 w-full sm:w-auto relative group">
            <QrCode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              ref={qrInputRef}
              type="text"
              placeholder="انتظار قارئ الباركود..."
              className="pl-3 pr-9 py-1.5 border-2 border-blue-200 dark:border-blue-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none w-full sm:w-56 text-left font-mono font-bold tracking-widest transition-all shadow-sm"
              dir="ltr"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={handleQrScan}
              onBlur={() => {
                // Try to keep focus on scanner input if clicked outside within the modal
                setTimeout(() => {
                  if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    qrInputRef.current?.focus();
                  }
                }, 100);
              }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
              جاهز
            </span>
          </div>`;

content = content.replace(/<div className="flex items-center gap-2 w-full sm:w-auto">[\s\S]*?<\/div>/, searchReplacement);

// Fix textual translations from QR to Barcode
content = content.replace(/'مسح بطاقة QR'/g, "'مسح الباركود'");

fs.writeFileSync('src/pages/Academic/Attendance.tsx', content);
