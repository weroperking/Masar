const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

content = content.replace("import { syncService, TABLES } from '../services/syncService';", "import { syncService, TABLES } from '../services/syncService';\nimport { autoScheduleService } from '../services/autoScheduleService';");

content = content.replace(/const interval = setInterval\(\(\) => \{\n      performSync\(\);\n    \}, 30 \* 1000\);/g, `const interval = setInterval(() => {
      performSync();
      autoScheduleService.checkAndRunSchedules();
    }, 30 * 1000);`);

content = content.replace(/performSync\(\);/g, `performSync();
    autoScheduleService.checkAndRunSchedules();`);

// The above replace might run into an issue with the definition of performSync having `performSync();` inside it? No, wait. 
// "performSync();" is called twice, once on load, once in interval.

fs.writeFileSync('src/components/Layout.tsx', content);
