const fs = require('fs');
let code = fs.readFileSync('src/pages/Students/Students.tsx', 'utf8');

// import useSubscription
code = code.replace(
  "import { useToast } from '../../context/ToastContext';",
  "import { useToast } from '../../context/ToastContext';\nimport { useSubscription } from '../../context/SubscriptionContext';"
);

// get subscription
code = code.replace(
  "export function Students() {",
  "export function Students() {\n  const { subscription } = useSubscription();"
);

// update button
const btnRegex = /<button\s+onClick=\{\(\) => \{ setEditingStudent\(null\); setIsModalOpen\(true\); \}\}\s+className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"\s*>\s*<Plus className="w-3\.5 h-3\.5 ml-1\.5" \/>\s*إضافة طالب جديد\s*<\/button>/;

const newBtn = `
        {subscription?.limits?.max_students !== undefined && (students?.length || 0) >= subscription.limits.max_students ? (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            <span>تجاوزت الحد الأقصى للطلاب. يرجى الترقية للإضافة.</span>
            <a href="https://masar.top/pricing" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-700 dark:text-amber-400">ترقية</a>
          </div>
        ) : (
          <button 
            onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 ml-1.5" />
            إضافة طالب جديد
          </button>
        )}
`;

code = code.replace(btnRegex, newBtn);
fs.writeFileSync('src/pages/Students/Students.tsx', code);
