import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, Wallet, CreditCard, TrendingUp, Sparkles, ArrowUpRight, AlertCircle, BarChart3, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toMajorUnits } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

export function Dashboard() {
  const [dateRange, setDateRange] = useState<'today' | 'month' | 'year' | 'last12' | 'custom'>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (dateRange) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'year':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    case 'last12':
      startDate = subMonths(now, 12);
      endDate = endOfDay(now);
      break;
    case 'custom':
      startDate = customStart ? startOfDay(new Date(customStart)) : subMonths(now, 1);
      endDate = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }

  // 1. Total active students
  const activeStudentsCount = useLiveQuery(
    () => db.students.filter(s => s.isActive === true && !s.deleted_at).count(), 
    []
  );

  // Queries for Financials
  const ledgerEntries = useLiveQuery(() => db.ledgerEntries.filter(e => !e.deleted_at).toArray(), []);
  const payments = useLiveQuery(() => db.monthlySubscriptions.toArray(), []);
  const sessionPayments = useLiveQuery(() => db.sessionPayments.toArray(), []);

  // Compute stats based on Date Range
  const stats = useMemo(() => {
    let revenue = 0;
    let expense = 0;
    let refund = 0;
    let outstanding = 0;
    
    // Map for charting (month aggregation)
    const monthlyMap = new Map<string, { monthStr: string; revenue: number; expense: number; profit: number }>();

    // Pre-fill months if last12 or year
    if (dateRange === 'last12') {
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = format(d, 'yyyy-MM');
        monthlyMap.set(key, { monthStr: format(d, 'MMM yyyy', { locale: ar }), revenue: 0, expense: 0, profit: 0 });
      }
    } else if (dateRange === 'year') {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        const key = format(d, 'yyyy-MM');
        monthlyMap.set(key, { monthStr: format(d, 'MMM yyyy', { locale: ar }), revenue: 0, expense: 0, profit: 0 });
      }
    }

    // Process Ledger
    if (ledgerEntries) {
      ledgerEntries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const isInRange = isWithinInterval(entryDate, { start: startDate, end: endDate });
        
        if (isInRange) {
          if (entry.type === 'revenue') revenue += entry.amount;
          if (entry.type === 'expense') expense += entry.amount;
          if (entry.type === 'refund') refund += entry.amount;
        }
        
        const monthKey = format(entryDate, 'yyyy-MM');
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { monthStr: format(entryDate, 'MMM yyyy', { locale: ar }), revenue: 0, expense: 0, profit: 0 });
        }
        
        const m = monthlyMap.get(monthKey)!;
        if (entry.type === 'revenue') { m.revenue += entry.amount; m.profit += entry.amount; }
        if (entry.type === 'expense') { m.expense += entry.amount; m.profit -= entry.amount; }
        if (entry.type === 'refund') { m.profit -= entry.amount; }
      });
    }

    // Process Payments (Monthly Subscriptions)
    if (payments) {
      payments.forEach(payment => {
        // Outstanding (total accumulated regardless of date filter)
        if (payment.status !== 'paid') {
          outstanding += (payment.amountTotal - payment.amountPaid);
        }
      });
    }

    // Process Session Payments
    // Note: Session Payments & Dues log to ledgerEntries natively. We don't double count revenue.
    if (sessionPayments) {
      sessionPayments.forEach(sp => {
        // Outstanding
        if (sp.status !== 'paid' && sp.status !== 'refunded') {
          outstanding += (sp.amount - sp.paidAmount);
        }
      });
    }

    // Sort chart data
    const chartData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(entry => ({
        month: entry[1].monthStr,
        revenue: toMajorUnits(entry[1].revenue),
        expenses: toMajorUnits(entry[1].expense),
        profit: toMajorUnits(entry[1].profit)
      }));

    return { revenue, expense, refund, outstanding, chartData };
  }, [ledgerEntries, payments, sessionPayments, dateRange, startDate, endDate, customStart, customEnd]);

  const netProfit = stats.revenue - stats.expense - stats.refund;

  const statCards = [
    { name: 'إجمالي الطلاب (نشط)', value: activeStudentsCount ?? '...', icon: Users, href: '/students', color: 'text-blue-600 dark:text-blue-400' },
    { name: 'إجمالي الإيرادات', value: `${toMajorUnits(stats.revenue).toLocaleString()} ج.م`, icon: Wallet, href: '/ledgers', color: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'إجمالي المصروفات', value: `${toMajorUnits(stats.expense).toLocaleString()} ج.م`, icon: CreditCard, href: '/ledgers', color: 'text-red-600 dark:text-red-400' },
    { name: 'صافي الأرباح', value: `${toMajorUnits(netProfit).toLocaleString()} ج.م`, icon: TrendingUp, href: '/reports', color: netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">مؤشرات الأداء المالي والأكاديمي لسنتر مسار</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>البيانات حية من Dexie</span>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 pr-8"
            >
              <option value="today">اليوم</option>
              <option value="month">هذا الشهر</option>
              <option value="year">هذا العام</option>
              <option value="last12">آخر 12 شهر</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">من تاريخ</label>
            <input 
              type="date" 
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="text-sm border-slate-300 dark:border-slate-700 rounded bg-transparent text-slate-900 dark:text-slate-100" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">إلى تاريخ</label>
            <input 
              type="date" 
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="text-sm border-slate-300 dark:border-slate-700 rounded bg-transparent text-slate-900 dark:text-slate-100" 
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all group gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center gap-2.5">
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.name}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">التدفقات النقدية (إيرادات ومصروفات)</h2>
          </div>
          
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value} ج.م`, '']}
                />
                <Bar dataKey="revenue" name="إيرادات" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" name="مصروفات" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 rounded-xl shadow-xs border border-rose-100 dark:border-rose-900/30 p-6 flex flex-col justify-center items-center text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">إجمالي المتأخرات غير المحصلة</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">مجموع المبالغ المتبقية على الطلاب من اشتراكات شهرية وحصص غير مسددة بالكامل.</p>
          
          <div className="text-4xl font-black text-rose-600 dark:text-rose-500">
            {toMajorUnits(stats.outstanding).toLocaleString()} <span className="text-lg font-bold text-rose-400">ج.م</span>
          </div>

          <Link to="/dues" className="mt-8 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-sm w-full">
            مراجعة المستحقات
          </Link>
        </div>
      </div>
    </div>
  );
}
