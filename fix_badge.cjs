const fs = require('fs');
let content = fs.readFileSync('src/components/Qr/QrCardBadge.tsx', 'utf8');

// Replace qrcode import with react-barcode
content = content.replace("import QRCode from 'qrcode';", "import Barcode from 'react-barcode';");

// Remove QR generation logic
content = content.replace(/const \[qrUrl, setQrUrl\] = useState<string>\(''\);[\s\S]*?\}, \[qrCodeData, cardNumber\]\);/m, "");

// Replace the QR Code Container with Barcode
content = content.replace(/<div className="shrink-0 flex flex-col items-center justify-center">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m, `<div className="shrink-0 flex flex-col items-center justify-center">
          <div className="bg-white p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col items-center justify-center overflow-hidden w-28 sm:w-32 h-20 sm:h-24">
            <Barcode 
              value={cardNumber || qrCodeData || 'MASAR'} 
              format="CODE128" 
              width={1.5} 
              height={40} 
              displayValue={false} 
              margin={0}
              background="#ffffff"
              lineColor="#0f172a"
            />
          </div>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium text-center">
            امسح الباركود
          </span>
        </div>
      </div>
    </div>`);

content = content.replace(/<QrIcon className="w-3\.5 h-3\.5 text-slate-400" \/>/g, `<QrIcon className="w-3.5 h-3.5 text-slate-400" />`); // Keep icon? We'll leave it as QrIcon for now, just change text.

fs.writeFileSync('src/components/Qr/QrCardBadge.tsx', content);
