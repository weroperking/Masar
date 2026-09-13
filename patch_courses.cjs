const fs = require('fs');
let code = fs.readFileSync('src/pages/Courses/Courses.tsx', 'utf8');

// import useSubscription
code = code.replace(
  "import { useToast } from '../../context/ToastContext';",
  "import { useToast } from '../../context/ToastContext';\nimport { useSubscription } from '../../context/SubscriptionContext';"
);

// get subscription
code = code.replace(
  "export function Courses() {",
  "export function Courses() {\n  const { subscription } = useSubscription();"
);

// update select
code = code.replace(
  "<option value=\"package\">باقة كاملة (ترم أو كورس كامل)</option>",
  "{subscription?.limits?.combined_packages !== false && <option value=\"package\">باقة كاملة (ترم أو كورس كامل)</option>}"
);

fs.writeFileSync('src/pages/Courses/Courses.tsx', code);
