const fs = require('fs');
let content = fs.readFileSync('src/components/Qr/QrCardModal.tsx', 'utf8');

// Add Image icon import
content = content.replace('SlidersHorizontal\n}', 'SlidersHorizontal,\n  Image\n}');

// Add backgroundImage state
content = content.replace(/const \[cardSize, setCardSize\] = useState<'normal' \| 'compact'>\('normal'\);/, `const [cardSize, setCardSize] = useState<'normal' | 'compact'>('normal');
  const [backgroundImage, setBackgroundImage] = useState<string>('');`);

// Add sequential generation logic inside handleSubmit
content = content.replace(/const handleSubmit = async \(printImmediately: boolean = false\) => \{[\s\S]*?generatedCards\.push\(\{/, `const getNextSequenceStart = () => {
    let max = 0;
    existingCards.forEach(card => {
      const numMatch = card.cardNumber?.match(/\\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num > max) max = num;
      }
    });
    return max + 1;
  };

  const generateSequentialSerial = (currentNum: number) => {
    return String(currentNum).padStart(4, '0');
  };

  const handleSubmit = async (printImmediately: boolean = false) => {
    setIsSubmitting(true);
    try {
      const now = Date.now();
      const generatedCards: Partial<QrCard>[] = [];
      let nextSeq = getNextSequenceStart();

      if (mode === 'single_student') {
        const serial = generateSequentialSerial(nextSeq++);
        const id = uuidv4();
        generatedCards.push({`);

content = content.replace(/const serial = \`MSR-\$\{uuidv4\(\)\.slice\(0, 6\)\.toUpperCase\(\)\}\`;/g, `const serial = generateSequentialSerial(nextSeq++);`);
content = content.replace(/const serial = \`\$\{batchPrefix\}\$\{uuidv4\(\)\.slice\(0, 6\)\.toUpperCase\(\)\}\`;/g, `const serial = generateSequentialSerial(nextSeq++);`);

// Also push backgroundImage
content = content.replace(/themeColor,\n\s*centerName,\n\s*created_at:/g, `themeColor,\n          centerName,\n          backgroundImage,\n          created_at:`);

// Add Image Upload UI right under themeColor selection
const uploadUI = `
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <Image className="w-4 h-4 text-slate-400" />
                صورة خلفية مخصصة (اختياري)
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setBackgroundImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setBackgroundImage('');
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {backgroundImage && (
                <button 
                  type="button" 
                  onClick={() => setBackgroundImage('')}
                  className="text-xs text-red-500 hover:text-red-700 mt-2 block"
                >
                  إزالة الخلفية
                </button>
              )}
            </div>

            {/* Practical Summary Box */}`;

content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Practical Summary Box \*\/\}/, uploadUI);

// Update QrCardBadge props in preview
content = content.replace(/size=\{cardSize\}\n\s*\/>/g, `size={cardSize}\n                backgroundImage={backgroundImage}\n              />`);

// Remove batchPrefix inputs or references
content = content.replace(/<div className="space-y-1">\s*<label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">البادئة \(Prefix\)<\/label>[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/components/Qr/QrCardModal.tsx', content);
