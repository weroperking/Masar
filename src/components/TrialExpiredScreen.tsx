import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useClerk, useOrganization, useAuth } from '@clerk/clerk-react';
import { 
  AlertTriangle, 
  ArrowUpCircle, 
  Check, 
  MessageCircle, 
  Mail, 
  Loader2, 
  LogOut, 
  Building2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { MasarLogo } from './MasarLogo';
import { cn } from '../lib/utils';

interface TrialExpiredScreenProps {
  status?: string;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '990 ج.م / شهرياً',
    description: 'مثالي للمراكز الصغيرة والمدرسين المستقلين',
    features: [
      'فرع واحد',
      'حتى 500 طالب',
      'إدارة المجموعات والحضور',
      'دعم فني قياسي',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '2490 ج.م / شهرياً',
    description: 'أفضل قيمة للمراكز النامية',
    features: [
      'حتى 3 فروع',
      'حتى 2000 طالب',
      'إدارة الاشتراكات والمدفوعات',
      'تقارير متقدمة',
      'دعم فني أولوية',
    ],
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'تواصل معنا',
    description: 'للمؤسسات التعليمية الكبيرة',
    features: [
      'فروع غير محدودة',
      'عدد طلاب غير محدود',
      'ربط API مخصص',
      'جميع ميزات النظام',
      'مدير حساب مخصص',
    ],
  }
];

export function TrialExpiredScreen({ status }: TrialExpiredScreenProps) {
  const clerk = useClerk();
  const { organization } = useOrganization();
  const { getToken } = useAuth();

  const [viewMode, setViewMode] = useState<'notice' | 'plans'>('notice');
  const [proposalStatus, setProposalStatus] = useState<{ requested_plan?: string; status: string }>({ status: 'none' });
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  const isPastDue = status === 'past_due';
  const isNone = status === 'none';

  useEffect(() => {
    fetchProposalStatus();
  }, [organization?.id]);

  const fetchProposalStatus = async () => {
    if (!organization?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/orgs/${organization.id}/upgrade-proposal/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'pending') {
          setProposalStatus(data);
          try {
            localStorage.setItem(`masar_proposal_${organization.id}`, JSON.stringify(data));
          } catch {}
          return;
        }
      }

      // Check local cache
      try {
        const saved = localStorage.getItem(`masar_proposal_${organization.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.status === 'pending') {
            setProposalStatus(parsed);
            return;
          }
        }
      } catch {}

      setProposalStatus({ status: 'none' });
    } catch (e) {
      setProposalStatus({ status: 'none' });
    }
  };

  const savedAcademyName = (organization?.id ? localStorage.getItem(`masar_academy_name_${organization.id}`) : null) || localStorage.getItem('masar_academy_name') || organization?.name;

  const getWhatsAppUrl = (planName?: string) => {
    const orgName = savedAcademyName ? `أكاديمية ${savedAcademyName}` : 'أكاديميتنا';
    let message = '';

    if (planName) {
      message = `السلام عليكم ورحمة الله وبركاته،\nنود الاستفسار والتنسيق لترقية حساب ${orgName} إلى باقة (${planName}) في منصة مسار.\nيرجى تزويدنا بتفاصيل الاشتراك وإجراءات التفعيل.\nشكراً لكم.`;
    } else if (proposalStatus.requested_plan) {
      const pendingPlanObj = PLANS.find(p => p.id === proposalStatus.requested_plan);
      const name = pendingPlanObj ? pendingPlanObj.name : proposalStatus.requested_plan;
      message = `السلام عليكم ورحمة الله وبركاته،\nقمنا بتقديم طلب ترقية لحساب ${orgName} إلى باقة (${name}) عبر منصة مسار، ونود متابعة الطلب والتفعيل.\nشكراً لكم.`;
    } else {
      message = `السلام عليكم ورحمة الله وبركاته،\nنود الاستفسار بخصوص ترقية حساب ${orgName} والاطلاع على تفاصيل باقات منصة مسار.\nشكراً لكم.`;
    }

    return `https://wa.me/201277707096?text=${encodeURIComponent(message)}`;
  };

  const handleProposeUpgrade = async (planId: string) => {
    if (!organization?.id) return;
    setIsSubmitting(planId);
    setSubmitErrorMsg(null);
    setSubmitSuccessMsg(null);

    try {
      const token = await getToken();
      const res = await fetch(`/api/orgs/${organization.id}/upgrade-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requested_plan: planId })
      });

      const newStatus = { requested_plan: planId, status: 'pending' as const };
      setProposalStatus(newStatus);
      try {
        localStorage.setItem(`masar_proposal_${organization.id}`, JSON.stringify(newStatus));
      } catch {}

      setSubmitSuccessMsg('تم إرسال طلب الترقية بنجاح! سيتواصل معك فريقنا قريباً.');
      setShowConfirmModal(null);
    } catch (e: any) {
      setSubmitErrorMsg('حدث خطأ أثناء إرسال الطلب. يرجى التواصل معنا عبر واتساب.');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleSignOut = () => {
    clerk.signOut().then(() => {
      window.location.href = '/';
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 overflow-y-auto font-['Cairo'] flex flex-col" dir="rtl">
      
      {/* Top Bar Navigation (Always visible) */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <MasarLogo size="sm" />
          {savedAcademyName && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{savedAcademyName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'plans' && (
            <button
              onClick={() => setViewMode('notice')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة بالتنبيه</span>
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 sm:p-8 flex items-center justify-center">
        {viewMode === 'notice' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center"
          >
            <div className="flex justify-center mb-6">
              <MasarLogo size="lg" className="text-blue-600 dark:text-blue-500" />
            </div>
            
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 font-['Readex_Pro']">
              {isPastDue ? 'فشلت عملية الدفع' : isNone ? 'لا توجد خطة نشطة' : 'انتهت فترتك التجريبية (14 يوماً)'}
            </h1>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-sm sm:text-base">
              {isPastDue 
                ? 'يرجى تحديث معلومات الدفع الخاصة بك لمواصلة استخدام منصة مسار وإدارة مركزك.'
                : isNone
                ? 'يرجى اختيار باقة وتفعيل اشتراكك لمواصلة استخدام منصة مسار وإدارة مركزك التعليمي.'
                : 'لقد انتهت الفترة التجريبية المجانية. يرجى اختيار باقة وإرسال طلب ترقية لمواصلة استخدام منصة مسار.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setViewMode('plans')}
                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm sm:text-base"
              >
                <span>عرض الباقات وطلب الترقية</span>
                <ArrowUpCircle className="w-5 h-5" />
              </button>
              
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل مع الدعم عبر واتساب</span>
              </a>
            </div>
            
            <p className="mt-6 text-xs text-slate-500 dark:text-slate-500 italic">
              بعد إرسال طلب الترقية، سيتم مراجعته وتفعيل حسابك مباشرة.
            </p>
          </motion.div>
        ) : (
          /* PLANS VIEW */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl w-full py-4 animate-fade-in"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                اختر الباقة المناسبة لأكاديميتك
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                يرجى اختيار الباقة التي تناسب حجم مركزك وإرسال طلب ترقية ليتم تفعيل حسابك فوراً.
              </p>
            </div>

            {submitSuccessMsg && (
              <div className="mb-6 max-w-2xl mx-auto p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>{submitSuccessMsg}</span>
                </div>
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-[#25D366] text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  متابعة علواتساب
                </a>
              </div>
            )}

            {submitErrorMsg && (
              <div className="mb-6 max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{submitErrorMsg}</span>
              </div>
            )}

            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {PLANS.map((plan) => {
                const isPending = proposalStatus.status === 'pending' && proposalStatus.requested_plan === plan.id;
                const hasAnyPending = proposalStatus.status === 'pending';

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-2xl shadow-sm border flex flex-col justify-between transition-all duration-200 relative overflow-hidden bg-white dark:bg-slate-900",
                      plan.highlight 
                        ? "border-blue-600 dark:border-blue-500 shadow-xl ring-1 ring-blue-600" 
                        : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    {plan.highlight && (
                      <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 text-center tracking-wider uppercase">
                        الأكثر طلباً
                      </div>
                    )}

                    <div className="p-6 sm:p-8 pt-8 sm:pt-10">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                      <div className="mt-5 flex items-baseline gap-x-2">
                        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{plan.price}</span>
                      </div>
                      
                      <ul className="mt-6 space-y-3 text-xs sm:text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-x-2.5 items-center">
                            <Check className="h-4 w-4 flex-none text-emerald-500" aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 sm:p-8 pt-0 mt-auto">
                      {isPending ? (
                        <div className="w-full py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          طلب الترقية قيد المراجعة
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirmModal(plan.id)}
                          disabled={hasAnyPending}
                          className={cn(
                            "w-full py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors",
                            plan.highlight
                              ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-600/50"
                              : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                          )}
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          {hasAnyPending ? 'يوجد طلب قيد المراجعة' : `طلب الترقية لـ ${plan.name}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Support Section */}
            <div className="mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">تحتاج مساعدة أو خطة خاصة؟</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    فريق الدعم الفني والمبيعات جاهز لمساعدتك عبر الواتساب فوراً.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium text-xs sm:text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  مراسلة عبر واتساب
                </a>
                <a
                  href="mailto:support@masar.top"
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs sm:text-sm transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <Mail className="w-4 h-4" />
                  بريد الدعم
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                تأكيد طلب الترقية
              </h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في طلب الترقية إلى باقة <span className="font-bold text-slate-900 dark:text-slate-100">{PLANS.find(p => p.id === showConfirmModal)?.name}</span>؟
              <br/><br/>
              سيتم تسجيل طلبك وإرساله لفريق المبيعات الخاص بنا وتفعيل حسابك فور إتمام إجراءات الترقية.
            </p>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmitting === showConfirmModal}
              >
                إلغاء
              </button>
              <a
                href={getWhatsAppUrl(PLANS.find(p => p.id === showConfirmModal)?.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#25D366] hover:bg-[#25D366]/10 transition-colors flex items-center gap-1.5 border border-[#25D366]/30"
              >
                <MessageCircle className="w-4 h-4" />
                تواصل واتساب
              </a>
              <button
                onClick={() => handleProposeUpgrade(showConfirmModal)}
                disabled={isSubmitting === showConfirmModal}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {isSubmitting === showConfirmModal && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
