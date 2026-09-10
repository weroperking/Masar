const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Attendance.tsx', 'utf8');

const scanLogic = `
      if (!code) return;
      
      // First try to find a student directly by studentCode (this handles physical barcodes they typed/scanned)
      let foundStudentId = null;
      let matchedStudent = rosterStudents.find(s => s.studentCode === code);
      
      if (matchedStudent) {
        foundStudentId = matchedStudent.id;
      } else {
        // Fallback to searching the qrCards table if using printed cards
        const card = qrCards?.find(c => c.cardNumber === code || c.qrCodeData === code);
        if (card && card.status === 'active' && card.studentId) {
          foundStudentId = card.studentId;
        } else if (card && card.status !== 'active') {
          toast.error('هذه البطاقة موقوفة');
          return;
        }
      }

      if (!foundStudentId) {
        toast.error('لم يتم العثور على طالب بهذا الكود في النظام');
        return;
      }
      
      const studentInRoster = rosterStudents.find(s => s.id === foundStudentId);
      if (!studentInRoster) {
        toast.error('الطالب غير مقيد في هذه المجموعة');
        return;
      }

      // Check trials
`;
content = content.replace(/if \(\!code\) return;[\s\S]*?if \(!studentInRoster\) \{[\s\S]*?toast\.error\('الطالب غير مقيد في هذه المجموعة'\);\s*return;\s*\}/, scanLogic);

fs.writeFileSync('src/pages/Academic/Attendance.tsx', content);
