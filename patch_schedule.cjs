const fs = require('fs');
let code = fs.readFileSync('src/pages/Academic/Schedule.tsx', 'utf8');

// Add roomFilter state
code = code.replace(
  "const [courseFilter, setCourseFilter] = useState<string>('all');",
  "const [courseFilter, setCourseFilter] = useState<string>('all');\n  const [roomFilter, setRoomFilter] = useState<string>('all');"
);

// Add unique rooms derived from groups
code = code.replace(
  "const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];",
  "const arabicDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];\n  const uniqueRooms = Array.from(new Set(groups?.map(g => g.room).filter(Boolean))) as string[];"
);

// Apply roomFilter to filteredGroups
code = code.replace(
  "if (courseFilter !== 'all') {\n      filtered = filtered.filter(g => g.courseId === courseFilter);\n    }",
  "if (courseFilter !== 'all') {\n      filtered = filtered.filter(g => g.courseId === courseFilter);\n    }\n    if (roomFilter !== 'all') {\n      filtered = filtered.filter(g => g.room === roomFilter);\n    }"
);

// Also add roomFilter to dependency array
code = code.replace(
  "}, [groups, courseFilter]);",
  "}, [groups, courseFilter, roomFilter]);"
);

// Add room filter UI next to course filter
const courseFilterUI = `<div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">فلتر الكورسات</h3>
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الكورسات</option>
            {courses?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>`;

const newFiltersUI = courseFilterUI + `\n\n        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">فلتر القاعات</h3>
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع القاعات</option>
            {uniqueRooms.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>`;

code = code.replace(courseFilterUI, newFiltersUI);

// Make grid 5 cols instead of 4 since we added a card
code = code.replace(
  '<div className="grid grid-cols-1 md:grid-cols-4 gap-4">',
  '<div className="grid grid-cols-1 md:grid-cols-5 gap-4">'
);

// Display room in weekly view
code = code.replace(
  '<p className="text-slate-500 mt-1 font-mono" dir="ltr">\n                                {group.startTime} - {group.endTime}\n                              </p>',
  '<p className="text-slate-500 mt-1 font-mono" dir="ltr">\n                                {group.startTime} - {group.endTime}\n                              </p>\n                              {group.room && <p className="text-slate-500 text-[10px] mt-1 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">قاعة: {group.room}</p>}'
);

// Display room in daily view
code = code.replace(
  '<p className="text-xs text-slate-500 mt-1">\n                            ينتهي في {group.endTime} • السعة: {group.maxStudents || \'مفتوح\'} طالب\n                          </p>',
  '<p className="text-xs text-slate-500 mt-1">\n                            ينتهي في {group.endTime} • السعة: {group.maxStudents || \'مفتوح\'} طالب {group.room && `• قاعة: ${group.room}`}\n                          </p>'
);

fs.writeFileSync('src/pages/Academic/Schedule.tsx', code);
