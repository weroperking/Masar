const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace("centerName?: string;", "centerName?: string;\n  backgroundImage?: string;");

fs.writeFileSync('src/types.ts', content);
