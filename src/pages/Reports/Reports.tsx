import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'يناير', revenue: 4000, expenses: 2400 },
  { name: 'فبراير', revenue: 3000, expenses: 1398 },
  { name: 'مارس', revenue: 2000, expenses: 9800 },
  { name: 'أبريل', revenue: 2780, expenses: 3908 },
  { name: 'مايو', revenue: 1890, expenses: 4800 },
  { name: 'يونيو', revenue: 2390, expenses: 3800 },
  { name: 'يوليو', revenue: 3490, expenses: 4300 },
];

export function Reports() {
  const [activeTab, setActiveTab] = useState<'financials' | 'students' | 'courses' | 'products'>('financials');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">التقارير والتحليلات</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveTab('financials')} className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'financials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            الماليات
          </button>
          <button onClick={() => setActiveTab('students')} className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            الطلاب
          </button>
          <button onClick={() => setActiveTab('courses')} className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            الكورسات
          </button>
          <button onClick={() => setActiveTab('products')} className={`shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            المنتجات
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="flex justify-end mb-4">
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium">Export CSV</button>
              </div>
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {activeTab !== 'financials' && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">البيانات الخاصة بهذا القسم غير متوفرة بعد.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
