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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">لوحة التحكم</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">مؤشرات الأداء المالي والأكاديمي لسنتر مسار</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-xs font-semibold bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 pr-6 cursor-pointer"
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
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">من تاريخ</label>
            <input 
              type="date" 
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="text-xs border-slate-300 dark:border-slate-700 rounded bg-transparent text-slate-900 dark:text-slate-100 px-2.5 py-1.5" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">إلى تاريخ</label>
            <input 
              type="date" 
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="text-xs border-slate-300 dark:border-slate-700 rounded bg-transparent text-slate-900 dark:text-slate-100 px-2.5 py-1.5" 
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors group gap-3 relative"
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.name}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
            </div>
            
            <div className="flex justify-between items-baseline">
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">التدفقات النقدية (إيرادات ومصروفات)</h2>
          </div>
          
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '6px', 
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value} ج.م`, '']}
                />
                <Bar dataKey="revenue" name="إيرادات" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expenses" name="مصروفات" fill="#64748b" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clean, Non-Slop Outstanding Dues Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">المتأخرات غير المحصلة</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              مجموع المبالغ المتبقية على الطلاب من اشتراكات شهرية وحصص غير مسددة بالكامل.
            </p>
            
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 my-2">
              <span className="text-[11px] text-slate-400 block mb-1">إجمالي المستحقات المعلقة</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {toMajorUnits(stats.outstanding).toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
              </div>
            </div>
          </div>

          <Link 
            to="/dues" 
            className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors text-center shadow-xs"
          >
            مراجعة سجل المستحقات
          </Link>
        </div>
      </div>
    </div>
  );
}
