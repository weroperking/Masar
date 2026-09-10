const fs = require('fs');
let content = fs.readFileSync('src/pages/Students/Students.tsx', 'utf8');

// Add studentCode to state
content = content.replace(/name: existingStudent\?\.name \|\| '',/, "studentCode: existingStudent?.studentCode || '',\n    name: existingStudent?.name || '',");

// Inject sequential generation logic inside handleSubmit
const submitLogic = `
        let finalStudentCode = formData.studentCode.trim();
        if (!existingStudent && !finalStudentCode) {
          const allStudents = await db.students.toArray();
          let maxSeq = 0;
          allStudents.forEach(s => {
            if (s.studentCode && /^\\d+$/.test(s.studentCode)) {
              const num = parseInt(s.studentCode, 10);
              if (num > maxSeq) maxSeq = num;
            }
          });
          finalStudentCode = String(maxSeq + 1).padStart(4, '0');
        }

        if (existingStudent) {
          await db.students.update(existingStudent.id, {
            ...formData,
            studentCode: finalStudentCode,
            updated_at: now,
            sync_status: 'pending'
          });
`;
content = content.replace(/if \(existingStudent\) \{\s*await db\.students\.update\(existingStudent\.id, \{\s*\.\.\.formData,\s*updated_at: now,\s*sync_status: 'pending'\s*\}\);/, submitLogic);

content = content.replace(/const newStudent: Student = \{\s*id: uuidv4\(\),\s*\.\.\.formData,/, `const newStudent: Student = {
          id: uuidv4(),
          ...formData,
          studentCode: finalStudentCode,`);


// Add studentCode input to the form UI
const codeInput = `
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">كود الطالب (رقم الباركود)</label>
              <input 
                type="text" 
                placeholder="تلقائي إذا تُرك فارغاً"
                dir="ltr"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono text-left"
                value={formData.studentCode} 
                onChange={e => setFormData({...formData, studentCode: e.target.value.replace(/\\D/g, '')})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الطالب *</label>
              <input 
                required 
                type="text" 
                placeholder="الاسم ثلاثي أو رباعي"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </div>
`;

content = content.replace(/<div>\s*<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الطالب \*<\/label>\s*<input\s*required\s*type="text"\s*placeholder="الاسم ثلاثي أو رباعي"\s*className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"\s*value=\{formData.name\}\s*onChange=\{e => setFormData\(\{\.\.\.formData, name: e\.target\.value\}\)\}\s*\/>\s*<\/div>/, codeInput);


// Display studentCode in the table
content = content.replace(/<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الطالب<\/th>/, `<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">كود / الطالب</th>`);

const tableRow = `<td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {student.studentCode ? <span className="text-xs text-blue-600 dark:text-blue-400 font-mono ml-1">#{student.studentCode}</span> : null}
                            {student.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" dir="ltr" /> {student.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>`;

content = content.replace(/<td className="px-4 py-3">\s*<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">\s*\{student\.name\.charAt\(0\)\}\s*<\/div>\s*<div className="flex flex-col">\s*<span className="font-bold text-sm text-slate-900 dark:text-slate-100">\{student\.name\}<\/span>\s*<div className="flex items-center gap-2 mt-0\.5 text-xs text-slate-500">\s*<span className="flex items-center gap-1"><Phone className="w-3 h-3" dir="ltr" \/> \{student\.phone\}<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/td>/, tableRow);

fs.writeFileSync('src/pages/Students/Students.tsx', content);
