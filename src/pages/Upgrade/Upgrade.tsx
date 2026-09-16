import React, { useState, useEffect } from 'react';
import { useOrganization, useAuth } from '@clerk/clerk-react';
import { Check, ArrowUpCircle, AlertCircle, MessageCircle, Mail, Loader2 } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { cn } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

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

export function Upgrade() {
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const { subscription } = useSubscription();
  const { success: successToast, error: errorToast } = useToast();
  const [proposalStatus, setProposalStatus] = useState<{ requested_plan?: string; status: string }>({ status: 'loading' });
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);

  const currentPlan = subscription?.plan || 'trial';

  const getWhatsAppUrl = (planName?: string) => {
    const orgName = organization?.name ? `أكاديمية ${organization.name}` : 'أكاديميتنا';
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

  useEffect(() => {
    fetchProposalStatus();
  }, [organization?.id]);

  const fetchProposalStatus = async () => {
    if (!organization?.id) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/orgs/${organization.id}/upgrade-proposal/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      
      // Check local cache if server had no pending record
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
      console.error('Error fetching proposal status:', e);
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
    }
  };

  const handleProposeUpgrade = async (planId: string) => {
    if (!organization?.id) return;
    setIsSubmitting(planId);
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

      if (res.ok) {
        successToast('تم إرسال طلب الترقية بنجاح!');
        const newStatus = { requested_plan: planId, status: 'pending' as const };
        setProposalStatus(newStatus);
        try {
          localStorage.setItem(`masar_proposal_${organization.id}`, JSON.stringify(newStatus));
        } catch {}
        setShowConfirmModal(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        errorToast(`حدث خطأ أثناء إرسال الطلب: ${errData.details || errData.error || res.statusText || res.status}`);
      }
    } catch (e: any) {
      console.error('Error submitting proposal:', e);
      errorToast(`حدث خطأ أثناء إرسال الطلب: ${e.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-4xl">
          الترقية وإدارة الباقة
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          اختر الباقة المناسبة لاحتياجات الأكاديمية أو تواصل معنا لطلب خطة مخصصة تناسب طموحك.
        </p>
      </div>

      <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPending = proposalStatus.status === 'pending' && proposalStatus.requested_plan === plan.id;
          const hasAnyPending = proposalStatus.status === 'pending';

          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-2xl shadow-sm border flex flex-col justify-between transition-all duration-200 relative overflow-hidden bg-white dark:bg-slate-900",
                plan.highlight 
                  ? "border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-900/5 ring-1 ring-blue-600" 
                  : "border-slate-200 dark:border-slate-800",
                isCurrentPlan && "bg-slate-50 dark:bg-slate-800/50"
              )}
            >
              {plan.highlight && !isCurrentPlan && (
                <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 text-center tracking-wider uppercase">
                  الأكثر طلباً
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 left-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 text-center tracking-wider">
                  باقتك الحالية
                </div>
              )}

              <div className="p-8 pt-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-x-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{plan.price}</span>
                </div>
                
                <ul className="mt-8 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-5 w-5 flex-none text-emerald-500" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0 mt-auto">
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    مُفعل حالياً
                  </button>
                ) : isPending ? (
                  <div className="w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    طلب الترقية قيد المراجعة
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmModal(plan.id)}
                    disabled={hasAnyPending || proposalStatus.status === 'loading'}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors",
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

      <div className="mt-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">تحتاج لمساعدة في اختيار الباقة؟</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              فريق الدعم الفني جاهز للإجابة على استفساراتك وتجهيز خطة مخصصة لك.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            واتساب
          </a>
          <a
            href="mailto:support@masar.top"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Mail className="w-4 h-4" />
            تواصل معنا
          </a>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-4 mb-4">
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
              سيتم إرسال طلبك لفريق المبيعات الخاص بنا وسيتواصلون معك في خلال 24 ساعة لتأكيد الترقية وإتمام عملية الدفع.
            </p>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmitting === showConfirmModal}
              >
                إلغاء
              </button>
              <a
                href={getWhatsAppUrl(PLANS.find(p => p.id === showConfirmModal)?.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#25D366] hover:bg-[#25D366]/10 transition-colors flex items-center gap-1.5 border border-[#25D366]/30"
              >
                <MessageCircle className="w-4 h-4" />
                تواصل واتساب
              </a>
              <button
                onClick={() => handleProposeUpgrade(showConfirmModal)}
                disabled={isSubmitting === showConfirmModal}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
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
