const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Attendance.tsx', 'utf8');

// We need to use a ref to hold the latest handleQrScan
const refInject = `
  const qrInputRef = useRef<HTMLInputElement>(null);
  const handleQrScanRef = useRef<any>(null);
`;
content = content.replace(/const qrInputRef = useRef<HTMLInputElement>\(null\);/, refInject);

const effectInject = `
  useEffect(() => {
    handleQrScanRef.current = handleQrScan;
  });

  useEffect(() => {
`;
content = content.replace(/useEffect\(\(\) => \{\s*\/\/ Always focus barcode input/, effectInject + `\n    // Always focus barcode input`);

// In the timeout, call handleQrScanRef.current
content = content.replace(/handleQrScan\(fakeEvent, code\);/g, 'handleQrScanRef.current(fakeEvent, code);');

fs.writeFileSync('src/pages/Academic/Attendance.tsx', content);
