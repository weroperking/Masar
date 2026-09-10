const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Remove import
content = content.replace(/import \{ autoScheduleService \} from '\.\.\/services\/autoScheduleService';\n/, '');

// Remove all calls
content = content.replace(/autoScheduleService\.checkAndRunSchedules\(\);\s*/g, '');

fs.writeFileSync('src/components/Layout.tsx', content);
