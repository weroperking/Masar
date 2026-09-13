const fs = require('fs');
let code = fs.readFileSync('src/pages/Courses/Courses.tsx', 'utf8');

code = code.replace(
  "function CourseFormModal({ onClose, initialData }: { onClose: () => void, initialData?: Course | null }) {",
  "function CourseFormModal({ onClose, initialData }: { onClose: () => void, initialData?: Course | null }) {\n  const { subscription } = useSubscription();"
);

fs.writeFileSync('src/pages/Courses/Courses.tsx', code);
