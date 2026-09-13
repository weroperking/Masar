const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin/Settings.tsx', 'utf8');
const replacement = `          )}
        </section>

        {/* API Access Section */}
        {subscription?.limits?.api_access && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              الوصول البرمجي (API)
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                مفاتيح الوصول البرمجي الخاص بك للربط مع الأنظمة الخارجية.
              </p>
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                توليد مفتاح جديد
              </button>
            </div>
          </section>
        )}

        {/* Data Management Section */}`;
code = code.replace(
  `          )}
        </section>

        {/* Data Management Section */}`, replacement
);
fs.writeFileSync('src/pages/Admin/Settings.tsx', code);
