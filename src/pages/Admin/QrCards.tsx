import { QrCode, Plus, Printer, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { v4 as uuidv4 } from 'uuid';
import { QrCard } from '../../types';

export function QrCards() {
  const cards = useLiveQuery(() => db.qrCards.filter(c => !c.deleted_at).reverse().sortBy('created_at'), []);
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray(), []);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const toast = useToast();

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    try {
      const now = Date.now();
      const newCards: QrCard[] = Array.from({ length: generateCount }).map(() => {
        const id = uuidv4();
        const shortCode = id.split('-')[0].toUpperCase();
        return {
          id,
          cardNumber: `MSR-${shortCode}`,
          qrCodeData: `https://masar.app/qr/${id}`,
          printStatus: 'queued',
          status: 'active',
          created_at: now,
          updated_at: now,
          sync_status: 'pending'
        };
      });

      await db.qrCards.bulkAdd(newCards);
      toast.success(`تم توليد ${generateCount} بطاقة بنجاح وإضافتها لقائمة الطباعة`);
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد البطاقات');
    }
    setIsGenerating(false);
  };

  const handleMarkPrinted = async (cardId: string) => {
    await db.qrCards.update(cardId, {
      printStatus: 'available',
      updated_at: Date.now(),
      sync_status: 'pending'
    });
    toast.success('تم تحديث حالة البطاقة إلى "متاحة"');
  };

  const getStudentName = (studentId?: string | null) => {
    if (!studentId) return null;
    return students?.find(s => s.id === studentId)?.name || 'طالب محذوف';
  };

  // Stats
  const queued = cards?.filter(c => c.printStatus === 'queued').length || 0;
  const available = cards?.filter(c => c.printStatus === 'available' && !c.studentId).length || 0;
  const linked = cards?.filter(c => c.studentId).length || 0;
  const total = cards?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">بطاقات QR الخاصة بالطلاب</h1>
        <div className="flex items-center gap-3">
          <input 
            type="number" 
            min="1" 
            max="100" 
            value={generateCount}
            onChange={(e) => setGenerateCount(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="عدد البطاقات"
          />
          <button 
            onClick={handleGenerateCards}
            disabled={isGenerating}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 ml-2" />
            {isGenerating ? 'جاري التوليد...' : 'توليد بطاقات جديدة'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">إجمالي البطاقات</p>
            <QrCode className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">في قائمة الطباعة</p>
            <Printer className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{queued}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/30 p-5">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">متاحة وجاهزة للربط</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">{available}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30 p-5">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-400">مرتبطة بطالب</p>
            <UserIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{linked}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {cards?.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <QrCode className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">لا يوجد بطاقات مسجلة</h2>
            <p className="text-slate-500 mt-2">قم بتوليد بطاقات جديدة للبدء في استخدام نظام الحضور بالـ QR</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">رقم البطاقة التسلسلي</th>
                  <th className="px-6 py-4 font-medium">الطالب المرتبط</th>
                  <th className="px-6 py-4 font-medium">حالة البطاقة</th>
                  <th className="px-6 py-4 font-medium">حالة الطباعة</th>
                  <th className="px-6 py-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cards?.map((card) => {
                  const studentName = getStudentName(card.studentId);
                  
                  return (
                    <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {card.cardNumber}
                      </td>
                      <td className="px-6 py-4">
                        {studentName ? (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{studentName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">غير مرتبط</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${card.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {card.status === 'active' ? 'نشطة' : 'موقوفة'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          card.printStatus === 'queued' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          card.printStatus === 'available' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {card.printStatus === 'queued' ? 'قيد الطباعة' : card.printStatus === 'available' ? 'متاحة للربط' : 'تم الربط'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {card.printStatus === 'queued' && (
                            <button
                              onClick={() => handleMarkPrinted(card.id)}
                              className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              تعليم كمطبوعة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
