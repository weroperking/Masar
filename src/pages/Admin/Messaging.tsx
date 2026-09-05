import { MessageSquare, Settings2 } from 'lucide-react';
import { useState } from 'react';

export function Messaging() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'telegram' | 'sms'>('whatsapp');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المراسلات والقوالب</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('whatsapp')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'whatsapp' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            واتساب
          </button>
          <button onClick={() => setActiveTab('telegram')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'telegram' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            تليجرام
          </button>
          <button onClick={() => setActiveTab('sms')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'sms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            رسائل SMS
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">إشعار غياب (لولي الأمر)</h3>
                <button className="text-slate-400 hover:text-blue-600"><Settings2 className="w-5 h-5" /></button>
              </div>
              <textarea 
                className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 resize-none"
                defaultValue="مرحباً {parentName}، نود إعلامكم بغياب الطالب {studentName} عن حضور حصة {courseName} بتاريخ {date}."
              />
              <div className="mt-3 text-xs text-slate-500">
                المتغيرات المتاحة: {`{studentName} {parentName} {courseName} {date}`}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">تذكير تأخر دفع</h3>
                <button className="text-slate-400 hover:text-blue-600"><Settings2 className="w-5 h-5" /></button>
              </div>
              <textarea 
                className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 resize-none"
                defaultValue="مرحباً {parentName}، يرجى سداد الدفعة المستحقة بقيمة {amount} {currency} للطالب {studentName} بحد أقصى {dueDate}."
              />
              <div className="mt-3 text-xs text-slate-500">
                المتغيرات المتاحة: {`{studentName} {parentName} {amount} {currency} {dueDate}`}
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
            هذه القوالب محفوظة محلياً. لم يتم ربط API مزود الخدمة بعد.
          </div>
        </div>
      </div>
    </div>
  );
}
