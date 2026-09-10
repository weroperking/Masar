const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace("export interface Student extends BaseRecord {\n  name: string;", "export interface Student extends BaseRecord {\n  studentCode?: string;\n  name: string;");
fs.writeFileSync('src/types.ts', content);
