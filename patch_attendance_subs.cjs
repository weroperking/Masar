const fs = require('fs');
let content = fs.readFileSync('src/pages/Academic/Attendance.tsx', 'utf8');

// Add subscriptions query
const subQuery = `
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentSubscriptions = useLiveQuery(() => 
    db.monthlySubscriptions
      .where('courseId').equals(session.courseId)
      .and(sub => sub.month === currentMonth && sub.year === currentYear)
      .toArray(), 
  [session.courseId, currentMonth, currentYear]);
`;

content = content.replace(/const existingRecords = useLiveQuery\(/, subQuery + '\n  const existingRecords = useLiveQuery(');

// Add visual indicator to the list mapping
const studentRender = `
              const currentStatus = recordMap[student.id];
              
              // Subscription check
              const studentSub = currentSubscriptions?.find(s => s.studentId === student.id);
              const hasUnpaidSub = studentSub && studentSub.status !== 'paid';
              const noSubRecord = !studentSub;
`;

content = content.replace(/const currentStatus = recordMap\[student\.id\];/, studentRender);

// Render the pill
const uiReplacement = `
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {student.studentCode ? <span className="text-xs text-blue-600 dark:text-blue-400 font-mono ml-1">#{student.studentCode}</span> : null}
                          {student.name}
                          {(hasUnpaidSub || noSubRecord) && !session.isTrial && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded">
                              لم يسدد اشتراك الشهر
                            </span>
                          )}
                        </span>
                        {wasAbsentPreviously && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            غائب الحصة الماضية
                          </span>
                        )}
                        {trialLimitExceeded && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            استنفد حصص التجربة (حضر {pastTrialsCount} من أصل {freeSessionLimit})
                          </span>
                        )}
                      </div>
`;

content = content.replace(/<div className="flex flex-col">\s*<span className="font-bold text-sm text-slate-900 dark:text-slate-100">\s*\{student\.studentCode \? <span className="text-xs text-blue-600 dark:text-blue-400 font-mono ml-1">#\{student\.studentCode\}<\/span> : null\}\s*\{student\.name\}\s*<\/span>\s*\{wasAbsentPreviously && \([\s\S]*?<\/span>\s*\)\}\s*\{trialLimitExceeded && \([\s\S]*?<\/span>\s*\)\}\s*<\/div>/, uiReplacement);

// Optional: show toast warning when scanning
const scanLogicReplacement = `
      setRecordMap(prev => ({ ...prev, [foundStudentId]: 'present' }));
      
      const sub = currentSubscriptions?.find(s => s.studentId === foundStudentId);
      if (!session.isTrial && (!sub || sub.status !== 'paid')) {
        toast.success(\`تم التحضير: \${studentInRoster.name} (تنبيه: لم يسدد اشتراك الشهر)\`);
      } else {
        toast.success(\`تم تحضير الطالب: \${studentInRoster.name}\`);
      }
`;

content = content.replace(/setRecordMap\(prev => \(\{ \.\.\.prev, \[foundStudentId\]: 'present' \}\)\);\s*toast\.success\(`تم تحضير الطالب: \$\{studentInRoster\.name\}`\);/, scanLogicReplacement);

fs.writeFileSync('src/pages/Academic/Attendance.tsx', content);
