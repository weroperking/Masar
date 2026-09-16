const fs = require('fs');
let code = fs.readFileSync('src/pages/Students/StudentDetails.tsx', 'utf-8');

// Import it
code = code.replace(
  /import { Enrollment, MonthlySubscription } from '\.\.\/\.\.\/types';/,
  `import { Enrollment, MonthlySubscription } from '../../types';\nimport { StudentFormModal } from './Students';`
);

// Add state for modal
code = code.replace(
  /const \[isEditPricingModalOpen, setIsEditPricingModalOpen\] = useState\(false\);/,
  `const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);\n  const [isEditPricingModalOpen, setIsEditPricingModalOpen]`
);

// Update handler
code = code.replace(
  /const handleEditStudent = \(\) => \{\s*toast\.info\('تعديل الطالب سيفتح نافذة التعديل الشاملة \(انظر قسم إدارة الطلاب\)'\);\s*\};/,
  `const handleEditStudent = () => {
    setIsEditStudentModalOpen(true);
  };`
);

// Add the modal component at the end of the return statement
code = code.replace(
  /\{\/\* Payment Modal \*\/\}/,
  `{/* Edit Student Modal */}
      {isEditStudentModalOpen && (
        <StudentFormModal
          existingStudent={student as any}
          onClose={() => setIsEditStudentModalOpen(false)}
        />
      )}

      {/* Payment Modal */}`
);

fs.writeFileSync('src/pages/Students/StudentDetails.tsx', code);
