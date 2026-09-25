import React, { useState, useEffect } from 'react';
import { useOrganization, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, X, ArrowUpCircle, AlertCircle, MessageCircle, Mail, 
  Loader2, Building2, ShieldCheck, Sparkles, HelpCircle, 
  ChevronRight, ExternalLink, Info, CheckCircle2
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { cn } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { MasarLogo } from '../../components/MasarLogo';

interface Plan {
  id: string;
  name: string;
  priceMonthly: string;
  priceAnnual: string;
  description: string;
  badge?: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: '990 ج.م',
    priceAnnual: '790 ج.م',
    description: 'مثالي للمراكز الصغيرة والمدرسين المستقلين',
    features: [
      'فرع واحد فقط',
      'حتى 500 طالب فعال',
      'إدارة المجموعات والجداول',
      'نظام تسجيل الحضور والغياب',
      'دعم فني قياسي',
      'طباعة كروت QR للطلاب',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: '2490 ج.م',
    priceAnnual: '1990 ج.م',
    description: 'أفضل قيمة للمراكز والأكاديميات النامية',
    badge: 'الأكثر طلباً',
    features: [
      'حتى 3 فروع أكاديمية',
      'حتى 2000 طالب فعال',
      'إدارة الاشتراكات والمدفوعات',
      'متابعة الديون والمستحقات',
      'تقارير وإحصائيات متقدمة',
      'إدارة الكتب والمنتجات والمخزون',
      'دعم فني ذو أولوية 24/7',
    ],
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 'تواصل معنا',
    priceAnnual: 'تواصل معنا',
    description: 'للمؤسسات التعليمية والمجمعات الكبيرة',
    badge: 'للمؤسسات',
    features: [
      'فروع غير محدودة',
      'عدد طلاب غير محدود',
      'ربط وتكامل مخصص مع أنظمتكم',
      'جميع ميزات وإمكانيات النظام',
      'مدير حساب مخصص',
      'تدريب واستيراد بيانات مجاني',
    ],
  }
];

// Feature comparison matrix
interface FeatureCategory {
  title: string;
  features: {
    name: string;
    info?: string;
    starter: string | boolean;
    growth: string | boolean;
    pro: string | boolean;
  }[];
}

const COMPARISON_CATEGORIES: FeatureCategory[] = [
  {
    title: 'السعة والتفرع الأكاديمي',
    features: [
      { name: 'عدد الفروع المتاحة', starter: 'فرع واحد', growth: 'حتى 3 فروع', pro: 'غير محدود' },
      { name: 'الحد الأقصى للطلاب الفعّالين', starter: 'حتى 500 طالب', growth: 'حتى 2000 طالب', pro: 'غير محدود' },
      { name: 'عدد حسابات الموظفين والمعلمين', starter: '3 حسابات', growth: '10 حسابات', pro: 'غير محدود' },
      { name: 'نظام الأدوار والصلاحيات', starter: true, growth: true, pro: true },
    ]
  },
  {
    title: 'إدارة الطلاب والمجموعات والحضور',
    features: [
      { name: 'إدارة المجموعات والكورسات', starter: true, growth: true, pro: true },
      { name: 'تسجيل الحضور بقارئ الكاميرا وكروت QR', starter: true, growth: true, pro: true },
      { name: 'طباعة وتصميم بطاقات QR الطلاب', starter: true, growth: true, pro: true },
      { name: 'الجدول الزمني والتنبيهات المباشرة', starter: true, growth: true, pro: true },
      { name: 'بوابة الاستعلام للطلاب وأولياء الأمور بالـ QR', starter: true, growth: true, pro: true },
    ]
  },
  {
    title: 'المالية، المدفوعات والمخزون',
    features: [
      { name: 'مدفوعات الحصص والاشتراكات الشهرية', starter: true, growth: true, pro: true },
      { name: 'سجل المستحقات والديون والمتأخرات', starter: false, growth: true, pro: true },
      { name: 'إدارة كتب المناهج والمبيعات والملزمات', starter: false, growth: true, pro: true },
      { name: 'السجلات المالية وحركة الخزينة العامة', starter: 'أساسي', growth: 'متقدم', pro: 'شامل وتدقيق' },
    ]
  },
  {
    title: 'التقارير والتكامل والدعم الفني',
    features: [
      { name: 'تقارير الحضور والنسب المالية', starter: 'أساسية', growth: 'متقدمة', pro: 'شاملة وتصدير' },
      { name: 'قوالب رسائل واتساب التلقائية', starter: true, growth: true, pro: true },
      { name: 'ربط وتكامل مخصص مع الأنظمة الخارجية', starter: false, growth: false, pro: true },
      { name: 'نوع الدعم الفني والتوجيه', starter: 'قياسي', growth: 'أولوية 24/7', pro: 'مدير حساب مخصص' },
    ]
  }
];

export function Upgrade() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const { subscription } = useSubscription();
  const { success: successToast, error: errorToast } = useToast();
  
  const [proposalStatus, setProposalStatus] = useState<{ requested_plan?: string; status: string }>({ status: 'loading' });
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  
  // X.com UI interaction states
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('growth');

  const currentPlan = subscription?.plan || 'trial';

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
          if (data.requested_plan) {
            setSelectedPlanId(data.requested_plan);
          }
          try {
            localStorage.setItem(`masar_proposal_${organization.id}`, JSON.stringify(data));
          } catch {}
          return;
        }
      }
      
      try {
        const saved = localStorage.getItem(`masar_proposal_${organization.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.status === 'pending') {
            setProposalStatus(parsed);
            if (parsed.requested_plan) {
              setSelectedPlanId(parsed.requested_plan);
            }
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
            if (parsed.requested_plan) {
              setSelectedPlanId(parsed.requested_plan);
            }
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

  const getWhatsAppUrl = (planName?: string) => {
    const savedName = (organization?.id ? localStorage.getItem(`masar_academy_name_${organization.id}`) : null) || localStorage.getItem('masar_academy_name') || organization?.name;
    const orgName = savedName ? `أكاديمية ${savedName}` : 'أكاديميتنا';
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

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];
  const isSelectedActive = currentPlan === selectedPlanObj.id;
  const isSelectedPending = proposalStatus.status === 'pending' && proposalStatus.requested_plan === selectedPlanObj.id;
  const hasAnyPending = proposalStatus.status === 'pending';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 text-slate-900 overflow-y-auto font-sans flex flex-col" dir="rtl">
      
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="إغلاق والعودة"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <MasarLogo className="h-6 w-auto" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-36 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full pt-6 sm:pt-10">
        
        {/* Headline Header Section (X.com Style) */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            اختر الخطة المناسبة <span className="text-slate-900 dark:text-slate-100">لتطوير سنترك التعليمي</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            استمتع بكافة إمكانيات منصة مسار لإدارة الطلاب، الحضور والغياب الكترونياً، التحصيل المالي المتقدم والتقارير.
          </p>

          {/* Monthly / Annual Toggle Pill (X.com Style) */}
          <div className="pt-4 flex items-center justify-center">
            <div className="bg-slate-200/80 p-1 rounded-full inline-flex items-center gap-1 border border-slate-300/60 shadow-xs">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200",
                  billingCycle === 'monthly'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                دفع شهري
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  "px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5",
                  billingCycle === 'annual'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                دفع سنوي
              </button>
            </div>
          </div>
        </div>

        {/* Plan Cards Grid (Horizontal Row Layout) */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 gap-5 max-w-4xl mx-auto">
          {PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrentPlan = currentPlan === plan.id;
            const isPending = proposalStatus.status === 'pending' && proposalStatus.requested_plan === plan.id;
            const priceDisplay = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "rounded-2xl border transition-all duration-200 p-6 sm:p-7 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 cursor-pointer relative bg-white dark:bg-slate-900 shadow-xs group",
                  isSelected
                    ? "border-slate-900 dark:border-slate-100 ring-2 ring-slate-900 dark:ring-slate-100 shadow-lg shadow-slate-900/10 dark:shadow-slate-100/10 scale-[1.01]"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md",
                  isCurrentPlan && "bg-slate-50/80 dark:bg-slate-800/50"
                )}
              >
                {/* Badge Header - Placed inside the top right corner */}
                {plan.badge && !isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white text-[10px] font-bold px-3.5 py-1 rounded-bl-xl rounded-tr-[15px] shadow-xs uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3.5 py-1 rounded-bl-xl rounded-tr-[15px] shadow-xs uppercase tracking-wider">
                    مُفعل حالياً
                  </div>
                )}

                {/* Left side: Info & Features */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-xs"
                        : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 group-hover:border-slate-400"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {plan.description}
                  </p>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Check className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side: Pricing & Action Button */}
                <div className="w-full md:w-auto md:min-w-[220px] flex flex-col sm:flex-row md:flex-col items-center sm:items-between md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="text-left md:text-right w-full sm:w-auto">
                    <div className="flex items-baseline gap-1 justify-start md:justify-end">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        {priceDisplay}
                      </span>
                      {plan.id !== 'pro' && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          / شهرياً
                        </span>
                      )}
                    </div>
                    {billingCycle === 'annual' && plan.id !== 'pro' && (
                      <div className="mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 inline-block">
                          خصم السنوي
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-full sm:w-auto md:w-full">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        باقتك الحالية
                      </button>
                    ) : isSelected ? (
                      <button
                        className="w-full py-2.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-xs"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        الباقة المختارة
                      </button>
                    ) : (
                      <button
                        className="w-full py-2.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        اختيار هذه الباقة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Are you a business / Enterprise Banner (X.com Style Callout) */}
        <div className="mt-8 sm:mt-10 bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">هل أنت مؤسسة تعليمية أو مجمع أكاديمي كبير؟</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                تحتاج خطة مخصصة لعدة فروع، ربط أنظمة إلكترونية مخصصة، أو استيعاب آلاف الطلاب مع مدير حساب متابع؟
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0 relative z-10">
            <button
              onClick={() => {
                setSelectedPlanId('pro');
                setShowConfirmModal('pro');
              }}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-xs"
            >
              استكشف باقة Pro للمؤسسات
            </button>
          </div>
        </div>

        {/* Detailed Tier Comparison Section (X.com Methodology) */}
        <div className="mt-14 sm:mt-16">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              قارن بين الميزات والخطط
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              جدول تفصيلي يوضح الإمكانيات والقيود لكل باقة تشغيلية
            </p>
          </div>

          <div className="space-y-6">
            {COMPARISON_CATEGORIES.map((category, catIdx) => (
              <div 
                key={catIdx} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3.5">
                  <h3 className="text-sm font-bold text-slate-900">{category.title}</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {category.features.map((feature, featIdx) => (
                    <div 
                      key={featIdx} 
                      className="grid grid-cols-12 px-6 py-4 items-center text-xs sm:text-sm text-slate-700 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="col-span-6 sm:col-span-6 font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{feature.name}</span>
                      </div>

                      {/* Starter Value */}
                      <div className="col-span-2 sm:col-span-2 text-center text-slate-600">
                        {typeof feature.starter === 'boolean' ? (
                          feature.starter ? (
                            <Check className="w-4 h-4 text-slate-900 dark:text-slate-100 mx-auto stroke-[2.5]" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs font-semibold">{feature.starter}</span>
                        )}
                      </div>

                      {/* Growth Value */}
                      <div className="col-span-2 sm:col-span-2 text-center text-slate-900 font-semibold">
                        {typeof feature.growth === 'boolean' ? (
                          feature.growth ? (
                            <Check className="w-4 h-4 text-slate-900 dark:text-slate-100 mx-auto stroke-[2.5]" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{feature.growth}</span>
                        )}
                      </div>

                      {/* Pro Value */}
                      <div className="col-span-2 sm:col-span-2 text-center text-slate-900 font-semibold">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="w-4 h-4 text-slate-900 dark:text-slate-100 mx-auto stroke-[2.5]" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{feature.pro}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Section at Bottom */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تحتاج لمساعدة في اختيار الباقة؟</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                فريق الدعم الفني جاهز للإجابة على استفساراتك وتجهيز الخطة المناسبة لسعة سنترك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </a>
            <a
              href="mailto:support@masar.top"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-200"
            >
              <Mail className="w-4 h-4" />
              تواصل معنا
            </a>
          </div>
        </div>

      </main>

      {/* Sticky Bottom Floating Action Bar (X.com Bottom Subscription Bar Methodology) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
          
          {/* Left Side: Selected Plan Details */}
          <div className="flex items-center gap-3 text-right w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  الباقة المختارة:
                </span>
                <span className="text-base font-bold text-slate-900">
                  {selectedPlanObj.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {billingCycle === 'annual' ? `${selectedPlanObj.priceAnnual} / شهرياً (سداد سنوي)` : `${selectedPlanObj.priceMonthly} / شهرياً`}
              </p>
            </div>
            
            <div className="sm:hidden text-left">
              <span className="text-lg font-extrabold text-slate-900">
                {billingCycle === 'annual' ? selectedPlanObj.priceAnnual : selectedPlanObj.priceMonthly}
              </span>
            </div>
          </div>

          {/* Right Side: Primary Action Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            {isSelectedActive ? (
              <button
                disabled
                className="w-full sm:w-auto px-8 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                مُفعل حالياً
              </button>
            ) : isSelectedPending ? (
              <div className="w-full sm:w-auto px-8 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                طلب الترقية قيد المراجعة
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmModal(selectedPlanObj.id)}
                disabled={hasAnyPending || proposalStatus.status === 'loading'}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-extrabold text-sm sm:text-base text-white bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowUpCircle className="w-5 h-5" />
                {hasAnyPending ? 'يوجد طلب قيد المراجعة' : `طلب الترقية لـ ${selectedPlanObj.name}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal (Command Palette / Search Modal Style) */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity" 
          dir="rtl"
          onClick={() => setShowConfirmModal(null)}
        >
          <div 
            className="w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Grab Handle for mobile */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shrink-0">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    تأكيد طلب الترقية
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    باقة {PLANS.find(p => p.id === showConfirmModal)?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfirmModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                هل أنت متأكد من رغبتك في طلب الترقية إلى باقة <span className="font-extrabold text-slate-900 dark:text-slate-100">{PLANS.find(p => p.id === showConfirmModal)?.name}</span>؟
              </p>

              <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-900 dark:text-slate-100 shrink-0 mt-0.5" />
                <div>
                  سيتم إرسال طلبك لفريق المبيعات الخاص بنا وسيتواصلون معك في خلال 24 ساعة لتأكيد الترقية وإتمام عملية الدفع.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmitting === showConfirmModal}
              >
                إلغاء
              </button>

              <a
                href={getWhatsAppUrl(PLANS.find(p => p.id === showConfirmModal)?.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#20bd5a] bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors flex items-center gap-1.5 border border-[#25D366]/30"
              >
                <MessageCircle className="w-4 h-4" />
                تواصل واتساب
              </a>

              <button
                onClick={() => handleProposeUpgrade(showConfirmModal)}
                disabled={isSubmitting === showConfirmModal}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors flex items-center gap-2 shadow-xs"
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
