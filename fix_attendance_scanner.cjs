const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Attendance.tsx', 'utf8');

// I need to carefully replace the whole useEffect and handleQrScan block
const newBlock = `
  useEffect(() => {
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
  }, []);

  const handleQrScan = (e: any, overrideCode?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = overrideCode || qrInput.trim();
      setQrInput('');
      
      if (!code) return;
      
      let foundStudentId = null;
      let matchedStudent = rosterStudents.find(s => s.studentCode === code);
      
      if (matchedStudent) {
        foundStudentId = matchedStudent.id;
      } else {
        const card = qrCards?.find(c => c.cardNumber === code || c.qrCodeData === code);
        if (card && card.status === 'active' && card.studentId) {
          foundStudentId = card.studentId;
        } else if (card && card.status !== 'active') {
          toast.error('هذه البطاقة موقوفة');
          return;
        }
      }

      if (!foundStudentId) {
        toast.error('لم يتم العثور على طالب بهذا الكود في النظام');
        return;
      }
      
      const studentInRoster = rosterStudents.find(s => s.id === foundStudentId);
      if (!studentInRoster) {
        toast.error('الطالب غير مقيد في هذه المجموعة');
        return;
      }

      if (session.isTrial) {
        const pastTrialsCount = allTrialRecords?.filter(r => 
          r.studentId === foundStudentId && 
          r.status === 'present' && 
          trialSessionIds.includes(r.sessionId) &&
          r.sessionId !== session.id
        ).length || 0;
        
        if (pastTrialsCount >= freeSessionLimit) {
          toast.error('استنفد الطالب الحد الأقصى لحصص التجربة');
          return;
        }
      }

      setRecordMap(prev => ({ ...prev, [foundStudentId]: 'present' }));
      toast.success(\`تم تحضير الطالب: \${studentInRoster.name}\`);
    }
  };
`;

content = content.replace(/useEffect\(\(\) => \{[\s\S]*?toast\.success\(`تم تحضير الطالب: \$\{studentInRoster\.name\}`\);\s*\}\s*\};\s*useEffect\(\(\) => \{/m, newBlock + "\n  useEffect(() => {\n");

fs.writeFileSync('src/pages/Academic/Attendance.tsx', content);
