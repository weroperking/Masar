import { MessageSquare, Save, Settings2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { MessageTemplate } from '../../types';
import { useToast } from '../../context/ToastContext';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TEMPLATES: Partial<MessageTemplate>[] = [
  {
    type: 'absence_alert',
    title: 'إشعار غياب (لولي الأمر)',
    content: 'مرحباً {{ParentName}}، نود إعلامكم بغياب الطالب {{StudentName}} عن حضور حصة {{CourseName}} بتاريخ {{Date}}.'
  },
  {
    type: 'payment_reminder',
    title: 'تذكير تأخر دفع (لولي الأمر)',
    content: 'مرحباً {{ParentName}}، يرجى سداد الدفعة المستحقة عن الكورس للطالب {{StudentName}} بحد أقصى {{DueDate}}.'
  }
];

export function Messaging() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'telegram' | 'sms'>('whatsapp');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const existing = await db.messageTemplates.toArray();
    if (existing.length === 0) {
      // Seed default templates
      const now = Date.now();
      const seeded = DEFAULT_TEMPLATES.map(t => ({
        ...t,
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        sync_status: 'pending'
      } as MessageTemplate));
      await db.messageTemplates.bulkAdd(seeded);
      setTemplates(seeded);
    } else {
      setTemplates(existing);
    }
  };

  const updateTemplateContent = (id: string, newContent: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, content: newContent } : t));
  };

  const handleSave = async (template: MessageTemplate) => {
    try {
      await db.messageTemplates.update(template.id, {
        content: template.content,
        updated_at: Date.now(),
        sync_status: 'pending'
      });
      toast.success('تم حفظ القالب بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ القالب');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المراسلات والقوالب</h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('whatsapp')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'whatsapp' ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            واتساب
          </button>
          <button onClick={() => setActiveTab('telegram')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'telegram' ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            تليجرام
          </button>
          <button onClick={() => setActiveTab('sms')} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'sms' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            رسائل SMS
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map(template => (
              <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">{template.title}</h3>
                  <button 
                    onClick={() => handleSave(template)}
                    className="flex items-center text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Save className="w-4 h-4 ml-1.5 text-blue-600 dark:text-blue-400" />
                    حفظ
                  </button>
                </div>
                
                <textarea 
                  className="w-full h-32 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={template.content}
                  onChange={(e) => updateTemplateContent(template.id, e.target.value)}
                />
                
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded border border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">المتغيرات المتاحة:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{"{{StudentName}}"}</code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{"{{ParentName}}"}</code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{"{{CourseName}}"}</code>
                  {template.type === 'absence_alert' && (
                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{"{{Date}}"}</code>
                  )}
                  {template.type === 'payment_reminder' && (
                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{"{{DueDate}}"}</code>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">الربط مع مزودي الخدمة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              هذه القوالب محفوظة محلياً وتستخدم لإنشاء رسائل سريعة (روابط wa.me). للربط المباشر مع واجهات WhatsApp Business API أو مزودي الـ SMS، يرجى إعداد المفاتيح من قسم الإعدادات.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
