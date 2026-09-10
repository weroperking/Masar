const fs = require('fs');
const content = fs.readFileSync('src/services/syncService.ts', 'utf8');
const fixedContent = content
  .replace(/const pushRes = \{ ok: true, status: 200 \};\s*\/\/\s*await fetch\('https:\/\/masar-api\.weroperking\.workers\.dev\/api\/sync\/push', \{\s*method: 'POST',\s*headers,\s*body: JSON\.stringify\(pendingData\)\s*\}\);/g, `const pushRes = { ok: true, status: 200 };
          /* await fetch('https://masar-api.weroperking.workers.dev/api/sync/push', {
            method: 'POST',
            headers,
            body: JSON.stringify(pendingData)
          }); */`)
  .replace(/const pullRes = \{ ok: true, status: 200, json: async \(\) => \(\{\}\) \};\s*\/\/\s*await fetch\(`https:\/\/masar-api\.weroperking\.workers\.dev\/api\/sync\/pull\?since=\$\{encodeURIComponent\(sinceIso\)\}`, \{\s*headers\s*\}\);/g, `const pullRes = { ok: true, status: 200, json: async () => ({}) };
        /* await fetch(\`https://masar-api.weroperking.workers.dev/api/sync/pull?since=\${encodeURIComponent(sinceIso)}\`, {
          headers
        }); */`);
fs.writeFileSync('src/services/syncService.ts', fixedContent);
