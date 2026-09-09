import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Download, Users, BookOpen, Package, DollarSign, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toMajorUnits } from '../../utils/currency';

export function Reports() {
  const [activeTab, setActiveTab] = useState<'financials' | 'students' | 'courses' | 'products'>('financials');

  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  const courses = useLiveQuery(() => db.courses.filter(c => !c.deleted_at).toArray(), []);
  const ledgerEntries = useLiveQuery(() => db.ledgerEntries.filter(e => !e.deleted_at).toArray(), []);
  const products = useLiveQuery(() => db.products.filter(p => !p.deleted_at).toArray(), []);

  // Compute total financials
  const totalRevenue = ledgerEntries?.filter(e => e.type === 'revenue').reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const totalExpense = ledgerEntries?.filter(e => e.type === 'expense').reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const netProfit = totalRevenue - totalExpense;

  // Chart data
  const currentYear = new Date().getFullYear();
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const monthlyData = months.map(m => ({ name: m, revenue: 0, expenses: 0 }));
  
  ledgerEntries?.forEach(e => {
    if (!e.deleted_at && e.date) {
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear) {
        const monthIdx = d.getMonth();
        if (e.type === 'revenue') {
          monthlyData[monthIdx].revenue += Math.round(toMajorUnits(e.amount || 0));
        } else if (e.type === 'expense') {
          monthlyData[monthIdx].expenses += Math.round(toMajorUnits(e.amount || 0));
        }
      }
    }
  });

  const currentMonthIdx = new Date().getMonth();
  const dynamicChartData = monthlyData.slice(0, currentMonthIdx + 1);

  // Students Lead Source Analytics
  const leadSourceCounts: Record<string, number> = {};
  students?.forEach(s => {
    const src = s.leadSource || 'أخرى';
    leadSourceCounts[src] = (leadSourceCounts[src] || 0) + 1;
  });
  const leadSourceData = Object.entries(leadSourceCounts).map(([name, count]) => ({
    name,
    count
  }));

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeTab === 'financials') {
      csvContent += 'ID,Type,Category,Description,Amount,Date\n';
      ledgerEntries?.forEach(e => {
        csvContent += `"${e.id}","${e.type}","${e.category || ''}","${e.description}","${toMajorUnits(e.amount)}","${e.date}"\n`;
      });
    } else if (activeTab === 'students') {
      csvContent += 'ID,Name,Phone,ParentName,ParentPhone,School,LeadSource,Status\n';
      students?.forEach(s => {
        csvContent += `"${s.id}","${s.name}","${s.phone}","${s.parentName}","${s.parentPhone}","${s.school}","${s.leadSource}","${s.isActive ? 'Active' : 'Inactive'}"\n`;
      });
    } else if (activeTab === 'courses') {
      csvContent += 'ID,Name,Price,PaymentType,Status\n';
      courses?.forEach(c => {
        csvContent += `"${c.id}","${c.name}","${toMajorUnits(c.price)}","${c.paymentType}","${c.isActive ? 'Active' : 'Inactive'}"\n`;
      });
    } else {
      csvContent += 'ID,Name,SalePrice,CostPrice,StockQty,SoldQty,Type\n';
      products?.forEach(p => {
        csvContent += `"${p.id}","${p.name}","${toMajorUnits(p.salePrice)}","${toMajorUnits(p.costPrice)}","${p.stockQty}","${p.soldQty || 0}","${p.type}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `masar_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>التقارير والتحليلات</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مؤشرات الأداء المالي، نمو الطلاب، ومبيعات المناهج والكتب الدراسية
          </p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير البيانات (CSV)</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50">
          {[
            { id: 'financials', label: 'الأداء المالي والتدفقات' },
            { id: 'students', label: 'الطلاب ومصادر التسجيل' },
            { id: 'courses', label: 'الكورسات والاشتراكات' },
            { id: 'products', label: 'المخزون والمبيعات' },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`shrink-0 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-slate-900' 
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Financials Tab */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الإيرادات المسجلة</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {toMajorUnits(totalRevenue).toLocaleString()} ج.م
                  </p>
                  <span className="inline-block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    إجمالي الرسوم ومبيعات المذكرات
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي المصروفات التشغيلية</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {toMajorUnits(totalExpense).toLocaleString()} ج.م
                  </p>
                  <span className="inline-block text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    أجور، إيجار، طباعة، ونثريات
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">صافي الأرباح</span>
                  <p className={`text-xl font-bold mt-1.5 font-mono ${
                    netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {toMajorUnits(netProfit).toLocaleString()} ج.م
                  </p>
                  <span className="inline-block text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    الفارق بعد خصم المصروفات
                  </span>
                </div>
              </div>

              {/* Cash Flow Chart */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>منحنى التدفقات النقدية (الإيرادات مقابل المصروفات)</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">الإيرادات</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">المصروفات</span>
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dynamicChartData.length > 0 ? dynamicChartData : [{ name: 'الشهر الحالي', revenue: totalRevenue, expenses: totalExpense }]}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `${val}`} 
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b', 
                          borderRadius: '8px', 
                          color: '#f8fafc',
                          fontSize: '12px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        name="الإيرادات" 
                        dataKey="revenue" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fill="#2563eb" 
                        fillOpacity={0.08} 
                      />
                      <Area 
                        type="monotone" 
                        name="المصروفات" 
                        dataKey="expenses" 
                        stroke="#64748b" 
                        strokeWidth={2}
                        fill="#64748b" 
                        fillOpacity={0.05} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي عدد الطلاب</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {students?.length || 0} طالب
                  </p>
                  <span className="inline-block text-[11px] text-slate-500 mt-1">الطلاب المسجلين بالمنظومة</span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">الطلاب النشطين</span>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
                    {students?.filter(s => s.isActive).length || 0} طالب
                  </p>
                  <span className="inline-block text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    {students?.length ? Math.round(((students.filter(s => s.isActive).length) / students.length) * 100) : 0}% من إجمالي المسجلين
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">قنوات الاستقطاب (Leads)</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {leadSourceData.length} قنوات
                  </p>
                  <span className="inline-block text-[11px] text-slate-500 mt-1">مصادر المعرفة بالسنتر</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>توزيع الطلاب حسب قنوات التعرف على السنتر</span>
                </h3>
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadSourceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b', 
                          borderRadius: '8px', 
                          color: '#f8fafc',
                          fontSize: '12px'
                        }} 
                      />
                      <Bar dataKey="count" name="عدد الطلاب" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">الكورسات المتاحة</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {courses?.length || 0} كورس
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">متوسط سعر الكورس</span>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                    {courses?.length 
                      ? toMajorUnits(Math.round(courses.reduce((acc, c) => acc + c.price, 0) / courses.length)).toLocaleString() 
                      : 0} ج.م
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">اسم الكورس</th>
                      <th className="px-4 py-3 font-semibold">سعر الاشتراك</th>
                      <th className="px-4 py-3 font-semibold">نظام الدفع</th>
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {courses?.map(course => (
                      <tr key={course.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{course.name}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">{toMajorUnits(course.price)} ج.م</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{course.paymentType === 'monthly' ? 'شهري' : 'باقة'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            course.isActive 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {course.isActive ? 'نشط' : 'متوقف'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الأصناف بالمخزن</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">{products?.length || 0} صنف</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي المذكرات المباعة</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 font-mono">
                    {products?.reduce((acc, p) => acc + (p.soldQty || 0), 0) || 0} نسخة
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">قيمة المخزون الحالي</span>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                    {toMajorUnits((products?.reduce((acc, p) => acc + (p.stockQty * p.salePrice), 0) || 0)).toLocaleString()} ج.م
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">اسم الصنف</th>
                      <th className="px-4 py-3 font-semibold">الرصيد المتاح</th>
                      <th className="px-4 py-3 font-semibold">الكمية المباعة</th>
                      <th className="px-4 py-3 font-semibold">سعر البيع</th>
                      <th className="px-4 py-3 font-semibold">إجمالي المبيعات المحققة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {products?.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.name}</td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300">{p.stockQty} نسخة</td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{p.soldQty || 0} نسخة</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">{toMajorUnits(p.salePrice)} ج.م</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {toMajorUnits(((p.soldQty || 0) * p.salePrice)).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
