const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Schedule.tsx', 'utf8');

// Change the week view grid to a vertical stack
content = content.replace(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">/g, `<div className="flex flex-col gap-6">`);

// Adjust the day container
content = content.replace(/className=\{\`rounded-xl p-3 border flex flex-col min-h-\[300px\] \$\{/g, `className={\`rounded-xl p-5 border flex flex-col sm:flex-row gap-5 \${`);

content = content.replace(/<div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">/g, `<div className="flex flex-col sm:w-48 shrink-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-4 justify-center items-start sm:items-center">`);

content = content.replace(/<div className="space-y-3 flex-1">/g, `<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`);

fs.writeFileSync('src/pages/Academic/Schedule.tsx', content);
