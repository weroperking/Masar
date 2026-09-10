const fs = require('fs');
let content = fs.readFileSync('src/components/Qr/QrCardBadge.tsx', 'utf8');

content = content.replace(/\{theme\.headerBg\}/g, '{themeStyles[themeColor].headerBg}');
content = content.replace(/\{theme\.headerText\}/g, '{themeStyles[themeColor].headerText}');
content = content.replace(/\{theme\.brandMark\}/g, '{themeStyles[themeColor].brandMark}');
content = content.replace(/\{theme\.tagBg\}/g, '{themeStyles[themeColor].tagBg}');
content = content.replace(/\{theme\.tagText\}/g, '{themeStyles[themeColor].tagText}');
content = content.replace(/\{theme\.accentBorder\.replace\('border-', 'bg-'\)\}/g, "{themeStyles[themeColor].accentBorder.replace('border-', 'bg-')}");

content = content.replace(/isRevoked/g, "(status === 'revoked')");

fs.writeFileSync('src/components/Qr/QrCardBadge.tsx', content);
