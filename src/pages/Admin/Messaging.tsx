import { MessageSquare, Save, Settings2, Send, Phone, User, Users, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { MessageTemplate, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { v4 as uuidv4 } from 'uuid';
import { getWhatsAppUrl, normalizeEgyptianPhone, isValidPhone, formatPhoneDisplay } from '../../utils/phone';

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

  // Instant messaging state
  const students = useLiveQuery(() => db.students.filter(s => !s.deleted_at).toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [recipientType, setRecipientType] = useState<'student' | 'parent' | 'custom'>('student');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customCourse, setCustomCourse] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Derive target phone
  let targetPhone = '';
  if (recipientType === 'student' && selectedStudent) {
    targetPhone = selectedStudent.phone || '';
  } else if (recipientType === 'parent' && selectedStudent) {
    targetPhone = selectedStudent.parentPhone || '';
  } else if (recipientType === 'custom') {
    targetPhone = customPhone;
  }

  const normalizedNumber = normalizeEgyptianPhone(targetPhone);
  const isValidNumber = isValidPhone(targetPhone);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const existing = await db.messageTemplates.toArray();
    if (existing.length === 0) {
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

  const applyTemplateToComposer = (templateContent: string) => {
    let text = templateContent;
    const studentName = selectedStudent?.name || 'الطالب';
    const parentName = selectedStudent?.parentName || 'ولي الأمر المحترم';
    const courseName = customCourse || courses[0]?.name || 'المادة الدراسية';
    const today = new Date().toLocaleDateString('ar-EG');

    text = text
      .replace(/{{StudentName}}/g, studentName)
      .replace(/{{ParentName}}/g, parentName)
      .replace(/{{CourseName}}/g, courseName)
      .replace(/{{Date}}/g, today)
      .replace(/{{DueDate}}/g, today);

    setMessageText(text);
  };

  const handleSendWhatsApp = () => {
    if (!targetPhone) {
      toast.error('يرجى تحديد أو إدخال رقم الهاتف أولاً');
      return;
    }
    if (!isValidNumber) {
      toast.error('رقم الهاتف غير صالح. يرجى التأكد من كتابته بشكل سليم (مثل: 0126667896)');
      return;
    }
    const url = getWhatsAppUrl(targetPhone, messageText);
    if (!url) {
      toast.error('تعذر إنشاء رابط واتساب للرقم المحدد');
      return;
    }
    window.open(url, '_blank');
    toast.success('تم فتح محادثة واتساب بنجاح');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">المراسلات والقوالب</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إرسال إشعارات وتنبيهات مباشرة عبر واتساب مع معالجة وتنسيق أرقام الهواتف المصرية تلقائياً
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab('whatsapp')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'whatsapp' ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            واتساب (مباشر وقوالب)
          </button>
          <button onClick={() => setActiveTab('telegram')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'telegram' ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            تليجرام
          </button>
          <button onClick={() => setActiveTab('sms')} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'sms' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            رسائل SMS
          </button>
        </div>

        <div className="p-6 space-y-8">
          {activeTab === 'whatsapp' && (
            <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">إرسال سريع ومباشر عبر واتساب</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      معالجة ذكية للأرقام المصرية (+20) وإزالة الصفر البادئ تلقائياً لمنع أي أخطاء في واتساب
                    </p>
                  </div>
                </div>
                {isValidNumber && targetPhone && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    رقم صالح: +{normalizedNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Pick Student or Custom */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    اختر الطالب من المسجلين
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      if (e.target.value && recipientType === 'custom') {
                        setRecipientType('student');
                      }
                    }}
                  >
                    <option value="">-- أو أدخل رقماً يدوياً أدناه --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone || 'بدون هاتف'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Recipient Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    الجهة المستلمة
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setRecipientType('student')}
                      disabled={!selectedStudent}
                      className={`py-1.5 px-2 rounded font-semibold text-center transition-colors ${
                        recipientType === 'student' && selectedStudent
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
                      }`}
                    >
                      الطالب
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType('parent')}
                      disabled={!selectedStudent?.parentPhone}
                      className={`py-1.5 px-2 rounded font-semibold text-center transition-colors ${
                        recipientType === 'parent' && selectedStudent?.parentPhone
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
                      }`}
                    >
                      ولي الأمر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType('custom')}
                      className={`py-1.5 px-2 rounded font-semibold text-center transition-colors ${
                        recipientType === 'custom'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      رقم مخصص
                    </button>
                  </div>
                </div>

                {/* 3. Phone Input / Preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهاتف المستهدف
                  </label>
                  {recipientType === 'custom' ? (
                    <input
                      type="tel"
                      placeholder="مثال: 0126667896"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      dir="ltr"
                    />
                  ) : (
                    <div className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between" dir="ltr">
                      <span>{targetPhone || 'لا يوجد رقم مسجل'}</span>
                      {targetPhone && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
                          {formatPhoneDisplay(targetPhone)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Templates Quick Actions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    نص الرسالة
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-500">تحميل قالب سريع:</span>
                    {templates.map(tmpl => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplateToComposer(tmpl.content)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded transition-colors"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="w-full h-24 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed"
                  placeholder="اكتب نص الرسالة هنا أو اختر قالباً جاهزاً من الأزرار أعلاه..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              {/* Send Button & Link Info */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    الرقم في الرابط: <strong className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">+{normalizedNumber || '20...'}</strong>
                  </span>
                  <span>•</span>
                  <span>يتم تجنب الخطأ بدمج كود مصر الدولي (20) تلقائياً وحذف الصفر البادئ من الرقم المحلي.</span>
                </div>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={!targetPhone}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح محادثة واتساب (إرسال)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>
          )}

          {/* Saved Templates Section */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>قوالب الرسائل المحفوظة</span>
            </h2>

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
