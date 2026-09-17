import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp, useClerk, useSession, useAuth } from '@clerk/clerk-react';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, LogOut, CheckCircle2, Eye, EyeOff, KeyRound, Check } from 'lucide-react';
import { MasarLogo } from '../../components/MasarLogo';

export function CustomAuth() {
  const clerk = useClerk();
  const { session } = useSession();
  const { isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  
  const [view, setView] = useState<'signin' | 'signup' | 'verify_signup' | 'verify_signin' | 'verify_signin_otp'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // If a session exists in Clerk's cache, auto-activate it
  useEffect(() => {
    if (!clerk.loaded) return;
    
    const sessions = clerk.client?.sessions;
    if (sessions && sessions.length > 0 && !clerk.session) {
      const activeOrFirst = sessions.find((s) => s.status === 'active') || sessions[0];
      if (activeOrFirst) {
        console.log('Auto-activating existing Clerk session:', activeOrFirst.id);
        clerk.setActive({ session: activeOrFirst.id }).catch((err) => {
          console.error('Failed to auto-activate session:', err);
        });
      }
    }
  }, [clerk.loaded, clerk.session, clerk.client?.sessions]);

  // If the user already has an active or recognized session, display the direct Dashboard entrance
  const hasExistingSession = !!session || !!userId || isSignedIn || (clerk.client?.sessions && clerk.client.sessions.length > 0);

  if (hasExistingSession) {
    const userEmail = session?.user?.primaryEmailAddress?.emailAddress || 
                      clerk.user?.primaryEmailAddress?.emailAddress || 
                      clerk.client?.sessions?.[0]?.user?.primaryEmailAddress?.emailAddress ||
                      'المستخدم الحالي';

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8" dir="rtl">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <MasarLogo size="lg" />
          </div>

          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 shadow-sm text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/5 border border-blue-600/10 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">أنت مسجل الدخول بالفعل</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                جلسة تسجيل الدخول نشطة ومؤكدة للحساب: <br />
                <span className="font-semibold text-slate-900 dark:text-slate-100 dir-ltr inline-block mt-1.5 px-3 py-1 bg-blue-500/5 border border-blue-600/10 rounded-lg text-sm text-blue-600">
                  {userEmail}
                </span>
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const targetSession = session?.id || clerk.client?.sessions?.[0]?.id;
                    if (targetSession) {
                      await clerk.setActive({ session: targetSession });
                    }
                  } catch (e) {
                    console.error('Failed to set active session:', e);
                  }
                  window.location.href = '/';
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-sm transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>الانتقال مباشرة إلى لوحة التحكم</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => clerk.signOut().then(() => { window.location.href = '/'; })}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>تسجيل الخروج والتبديل لحساب آخر</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSendOTP = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isSignInLoaded) return;
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لإرسال الرمز');
      return;
    }
    setLoading(true);
    setError('');
    setResendSuccess('');
    try {
      const { supportedFirstFactors } = await signIn.create({
        identifier: email,
      });

      const emailCodeFactor = supportedFirstFactors?.find(
        (factor: any) => factor.strategy === 'email_code'
      );

      if (emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: (emailCodeFactor as any).emailAddressId,
        });
        setView('verify_signin_otp');
      } else {
        setError('لا يمكن إرسال رمز OTP لهذا الحساب.');
      }
    } catch (err: any) {
      const errCode = err.errors?.[0]?.code;
      if (errCode === 'session_exists') {
        const sessions = clerk.client?.sessions;
        const targetSession = sessions?.find((s) => s.status === 'active') || sessions?.[0];
        if (targetSession) {
          await clerk.setActive({ session: targetSession.id });
          return;
        }
      }
      setError(err.errors?.[0]?.longMessage || 'فشل إرسال رمز التحقق. تأكد من صحة البريد الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setError('');
    setResendSuccess('');

    try {
      if (view === 'verify_signup') {
        if (!isSignUpLoaded) return;
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setResendSuccess('تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني');
      } else {
        if (!isSignInLoaded) return;
        if (signIn.supportedFirstFactors) {
          const emailCodeFactor = signIn.supportedFirstFactors.find(
            (factor: any) => factor.strategy === 'email_code'
          );
          if (emailCodeFactor) {
            await signIn.prepareFirstFactor({
              strategy: 'email_code',
              emailAddressId: (emailCodeFactor as any).emailAddressId,
            });
            setResendSuccess('تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني');
          }
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'تعذر إعادة إرسال الرمز حالياً.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: code.trim(),
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError('حالة التحقق غير مكتملة. يرجى المحاولة مجدداً.');
      }
    } catch (err: any) {
      setError('رمز غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError('يجب استكمال خطوات التحقق الإضافية.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || '';
      const errCode = err.errors?.[0]?.code;

      // Handle "already signed in" conflict
      if (errCode === 'session_exists' || msg.toLowerCase().includes('already signed in')) {
        const sessions = clerk.client?.sessions;
        const targetSession = sessions?.find((s) => s.status === 'active') || sessions?.[0];
        if (targetSession) {
          try {
            await clerk.setActive({ session: targetSession.id });
            return;
          } catch (activateErr) {
            console.error('Failed to activate session:', activateErr);
          }
        }

        const metaId = err.errors?.[0]?.meta?.sessionId;
        if (metaId) {
          try {
            await clerk.setActive({ session: metaId });
            return;
          } catch (metaErr) {
            console.error('Failed to activate meta session:', metaErr);
          }
        }

        // Clean stale session and recreate
        try {
          await clerk.signOut();
          const retryResult = await signIn.create({
            identifier: email,
            password,
          });
          if (retryResult.status === 'complete') {
            await setSignInActive({ session: retryResult.createdSessionId });
            return;
          }
        } catch (retryErr: any) {
          setError(retryErr.errors?.[0]?.longMessage || retryErr.errors?.[0]?.message || 'تعذر إتمام الدخول.');
          setLoading(false);
          return;
        }
      }

      setError(msg || 'حدث خطأ في تسجيل الدخول. تأكد من صحة البريد الإلكتروني وكلمة المرور.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    setLoading(true);
    setError('');
    
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setView('verify_signup');
      setLoading(false);
    } catch (err: any) {
      const errCode = err.errors?.[0]?.code;
      if (errCode === 'session_exists') {
        const sessions = clerk.client?.sessions;
        const targetSession = sessions?.find((s) => s.status === 'active') || sessions?.[0];
        if (targetSession) {
          await clerk.setActive({ session: targetSession.id });
          return;
        }
      }
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'حدث خطأ في إنشاء الحساب. تأكد من صحة البيانات.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    setLoading(true);
    setError('');
    
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
      } else {
        setError('كود التحقق غير صحيح أو غير مكتمل.');
        setLoading(false);
      }
    } catch (err: any) {
      const errCode = err.errors?.[0]?.code;
      if (errCode === 'session_exists') {
        const sessions = clerk.client?.sessions;
        const targetSession = sessions?.find((s) => s.status === 'active') || sessions?.[0];
        if (targetSession) {
          await clerk.setActive({ session: targetSession.id });
          return;
        }
      }
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'كود التحقق غير صحيح أو انتهت صلاحيته.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لطلب رمز التحقق.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await signIn.create({
        identifier: email,
        strategy: 'email_code'
      });
      setView('verify_signin');
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || 'حدث خطأ في طلب رمز التحقق.');
      setLoading(false);
    }
  };

  const handleVerifySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: code.trim()
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError('كود التحقق غير صحيح أو غير مكتمل.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'كود التحقق غير صحيح.');
      setLoading(false);
    }
  };

  if (!isSignInLoaded || !isSignUpLoaded) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-8 gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">جاري تهيئة خدمة الدخول...</p>
      </div>
    );
  }

  const isVerifyView = view === 'verify_signup' || view === 'verify_signin' || view === 'verify_signin_otp';

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950" dir="rtl">
      
      {/* 1. Form Section (Right Side in RTL) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-12 xl:px-24">
        <div className="w-full max-w-sm mx-auto">
          {/* Brand Logo for mobile only */}
          <div className="flex lg:hidden justify-center mb-10">
            <MasarLogo size="lg" />
          </div>

          <div className="w-full">
            {/* Header Section */}
            <div className="mb-8">
              {isVerifyView && (
                <div className="w-12 h-12 rounded-2xl bg-blue-500/5 border border-blue-600/10 text-blue-600 flex items-center justify-center mb-5">
                  <Mail className="w-6 h-6" />
                </div>
              )}
              
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {view === 'signin' && 'تسجيل الدخول إلى حسابك.'}
                {view === 'signup' && 'إنشاء حساب جديد.'}
                {view === 'verify_signup' && 'تأكيد البريد الإلكتروني.'}
                {(view === 'verify_signin' || view === 'verify_signin_otp') && 'التحقق برمز الدخول.'}
              </h1>

              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
                {view === 'signin' && 'أهلاً بك مجدداً! قم بتسجيل الدخول للبدء.'}
                {view === 'signup' && 'ابدأ الآن في إدارة حصصك، طلابك، ومصروفاتك في مكان واحد.'}
                {view === 'verify_signup' && 'أدخل رمز التحقق (OTP) المكوّن من 6 أرقام لتأكيد حسابك.'}
                {(view === 'verify_signin' || view === 'verify_signin_otp') && 'أدخل رمز التحقق (OTP) المرسل إلى بريدك لتسجيل الدخول.'}
              </p>

              {isVerifyView && email && (
                <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-sm dir-ltr">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{email}</span>
                </div>
              )}
            </div>

            {/* Feedback & Error Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl space-y-2">
                <p className="leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={() => clerk.signOut()}
                  className="text-xs text-red-600 dark:text-red-300 font-medium hover:underline block text-right"
                >
                  هل واجهت تعارض في الجلسة؟ اضغط هنا لتفريغ الجلسات
                </button>
              </div>
            )}

            {resendSuccess && (
              <div className="mb-6 p-3.5 bg-blue-500/5 border border-blue-600/20 text-blue-600 text-sm rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {view === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pr-11 pl-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all sm:text-sm"
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pr-11 pl-11 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all sm:text-sm"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span>تسجيل الدخول</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ليس لديك حساب؟{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setView('signup');
                          setError('');
                          setResendSuccess('');
                        }}
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        إنشاء حساب جديد
                      </button>
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        نسيت كلمة المرور؟ الدخول بالرمز
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* 2. SIGN UP FORM */}
            {view === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pr-11 pl-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all sm:text-sm"
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pr-11 pl-11 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all sm:text-sm"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span>إنشاء حساب</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                  
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      لديك حساب بالفعل؟{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setView('signin');
                          setError('');
                          setResendSuccess('');
                        }}
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        تسجيل الدخول
                      </button>
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* 3. EMAIL CONFIRMATION / VERIFICATION FORM */}
            {isVerifyView && (
              <form
                onSubmit={
                  view === 'verify_signup'
                    ? handleVerifySignUp
                    : view === 'verify_signin_otp'
                    ? handleVerifyOTP
                    : handleVerifySignIn
                }
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                    رمز التحقق (6 أرقام)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="block w-full max-w-xs mx-auto px-4 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all sm:text-lg"
                    placeholder="123456"
                    dir="ltr"
                  />
                </div>

                <div className="pt-2 space-y-4">
                  <button
                    type="submit"
                    disabled={loading || code.trim().length < 4}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد المتابعة'}
                  </button>

                  <div className="text-center space-y-3">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendLoading}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors disabled:opacity-50 block mx-auto"
                    >
                      {resendLoading ? 'جاري إرسال رمز جديد...' : 'لم يصلك الرمز؟ إعادة الإرسال'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setView('signin');
                          setError('');
                          setResendSuccess('');
                          setCode('');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>العودة للوراء</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Stale session cleaner helper */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => clerk.signOut()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تفريغ الجلسات السابقة وتحديث الصفحة</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Visual Section (Left Side in RTL) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* The Animated Gradient Iframe */}
        <iframe 
          src="https://backgrounds.supply/gradient-lab/embed#s=eyJtIjoicGxhc21hIiwiYyI6WyIjMGQyNDQ3IiwiIzFkNGY3YSIsIiM1YmFjZmYiLCIjMTk3YWY2IiwiI2M2ZjRjZiIsIiMwMDAwMDAiLCIjMDAwMDAwIiwiIzAwMDAwMCJdLCJvIjpbWzAuMzIsMF0sWzAuMDk4ODg1NDM4MTk5OTgzMTksMC4zMDQzMzgwODUyMTQ0NDkxNl0sWy0wLjI1ODg4NTQzODE5OTk4MzE2LDAuMTg4MDkxMjgwNzMzNTkxNDRdLFstMC4yNTg4ODU0MzgxOTk5ODMyLC0wLjE4ODA5MTI4MDczMzU5MTM4XSxbMC4wOTg4ODU0MzgxOTk5ODMxMiwtMC4zMDQzMzgwODUyMTQ0NDkxNl0sWzAsMF0sWzAsMF0sWzAsMF1dLCJuIjo1LCJiIjoxLCJrIjoxLjA1LCJzIjoxLjEsImciOjAuMDIsInAiOnsidV96b29tIjoxLjQsInVfY29tcGxleGl0eSI6MywidV9zbW9vdGgiOjAuNiwidV9zcGVlZCI6MC40fX0" 
          style={{ width: '100%', height: '100%', minHeight: '280px', border: '0', borderRadius: '0', display: 'block', position: 'absolute', inset: 0 }} 
          loading="lazy" 
          allow="fullscreen" 
          title="Gradient by Backgrounds Supply"
        />
        
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-900/30 mix-blend-multiply pointer-events-none"></div>
        
        {/* Content Wrapper */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 lg:p-16 z-10 pointer-events-none">
          {/* Logo overlay on visual side - forcing white color */}
          <div className="text-white drop-shadow-md brightness-0 invert pointer-events-auto w-max">
            <MasarLogo size="lg" />
          </div>

          <div className="max-w-xl">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-white drop-shadow-sm leading-tight">
              إدارة متكاملة<br />لمركزك التعليمي.
            </h2>
          </div>
        </div>
      </div>
      
    </div>
  );
}

