import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp, useClerk, useSession, useAuth } from '@clerk/clerk-react';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';

export function CustomAuth() {
  const clerk = useClerk();
  const { session } = useSession();
  const { isSignedIn, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  
  const [view, setView] = useState<'signin' | 'signup' | 'verify_signup' | 'verify_signin' | 'verify_signin_otp'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">أنت مسجل الدخول بالفعل</h2>
          <p className="text-slate-500 text-sm mb-6">
            جلسة تسجيل الدخول نشطة ومؤكدة للحساب: <br />
            <span className="font-semibold text-slate-700 dark:text-slate-300 dir-ltr inline-block mt-1">{userEmail}</span>
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                const targetSession = session?.id || clerk.client?.sessions?.[0]?.id;
                if (targetSession) {
                  await clerk.setActive({ session: targetSession });
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              الانتقال مباشرة إلى لوحة التحكم
            </button>
            
            <button
              type="button"
              onClick={() => clerk.signOut()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والتبديل لحساب آخر</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  
  const handleSendOTP = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لإرسال الرمز');
      return;
    }
    setLoading(true);
    setError('');
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
        setError('لا يمكن إرسال رمز OTP لهذا الحساب');
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
      setError(err.errors?.[0]?.longMessage || 'فشل إرسال رمز التحقق. تأكد من صحة البريد.');
    } finally {
      setLoading(false);
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
        code,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError('حالة غير مكتملة. يرجى المراجعة.');
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

      setError(msg || 'حدث خطأ في تسجيل الدخول. تأكد من صحة البيانات.');
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
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'حدث خطأ في التسجيل. تأكد من صحة البيانات.';
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
      const result = await signUp.attemptEmailAddressVerification({ code });
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
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'كود التحقق غير صحيح.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لطلب الرمز.');
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
        code
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center w-full mb-8">
            <ShieldCheck className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
              {view === 'signin' ? 'تسجيل الدخول' : view === 'signup' ? 'إنشاء حساب جديد' : view === 'verify_signin_otp' ? 'تسجيل الدخول برمز التحقق' : 'تحقق من البريد'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm text-center">
              {view === 'signin' ? 'مرحباً بك مجدداً في مسار' : view === 'signup' ? 'انضم إلينا وابدأ في إدارة منصة مسار' : view === 'verify_signin_otp' ? 'أدخل رمز OTP المرسل إلى بريدك لتسجيل الدخول' : 'أدخل الكود المرسل إلى بريدك الإلكتروني'}
            </p>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded-l-md flex flex-col gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => clerk.signOut()}
              className="text-xs text-red-800 underline font-medium hover:text-red-950 text-right"
            >
              اضغط هنا لتسجيل الخروج وتفريغ الجلسة المعلقة
            </button>
          </div>
        )}

        {(view === 'signin' || view === 'signup') && (
          <form onSubmit={view === 'signin' ? handleSignIn : handleSignUp} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:text-sm"
                  placeholder="name@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'signin' ? 'دخول' : 'إنشاء حساب')}
              </button>

              {view === 'signin' && (
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-70"
                >
                  نسيت كلمة المرور؟ الدخول برمز التحقق (OTP)
                </button>
              )}
            </div>
          </form>
        )}

        {(view === 'verify_signup' || view === 'verify_signin') && (
          <form onSubmit={view === 'verify_signup' ? handleVerifySignUp : handleVerifySignIn} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">كود التحقق (OTP)</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="block w-full px-3 py-3 text-center tracking-widest text-lg border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all sm:text-sm"
                placeholder="123456"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تحقق من الرمز'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={() => clerk.signOut()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج وتفريغ الجلسات المعلقة</span>
          </button>
        </div>
      </div>

        <div className="bg-slate-50 dark:bg-slate-900 px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          {view === 'signin' ? (
            <p className="text-sm text-slate-600">
              ليس لديك حساب؟{' '}
              <button type="button" onClick={() => { setView('signup'); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                سجل الآن
              </button>
            </p>
          ) : view === 'signup' ? (
            <p className="text-sm text-slate-600">
              لديك حساب بالفعل؟{' '}
              <button type="button" onClick={() => { setView('signin'); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                تسجيل الدخول
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              <button type="button" onClick={() => { setView('signin'); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
