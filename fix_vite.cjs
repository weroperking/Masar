const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

content = content.replace(/manifest: \{/g, `workbox: {
          maximumFileSizeToCacheInBytes: 5000000
        },
        manifest: {`);
        
fs.writeFileSync('vite.config.ts', content);
