const fs = require('fs');
let content = fs.readFileSync('src/pages/Auth/CustomAuth.tsx', 'utf8');

// Update view state
content = content.replace(/useState<'signin' \| 'signup' \| 'verify_signup' \| 'verify_signin'>\('signin'\);/, `useState<'signin' | 'signup' | 'verify_signup' | 'verify_signin' | 'verify_signin_otp'>('signin');`);

// Add OTP handling functions
const otpFunctions = `
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
          emailAddressId: emailCodeFactor.emailAddressId,
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
`;

content = content.replace(/const handleSignIn = async \(/, otpFunctions + '\n  const handleSignIn = async (');

// Fix text-center for the heading
content = content.replace(/<div className="text-center mb-8">/g, `<div className="flex flex-col items-center justify-center text-center w-full mb-8">`);
content = content.replace(/<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">/g, `<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">`);
content = content.replace(/<p className="text-slate-500 mt-2 text-sm">/g, `<p className="text-slate-500 mt-2 text-sm text-center">`);

// Add OTP link in signin view
const otpLink = `
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                نسيت كلمة المرور؟ تسجيل الدخول برمز (OTP)
              </button>
            </div>
`;
content = content.replace(/<\/form>\s*<div className="mt-6 text-center">/, `${otpLink}\n          </form>\n\n          <div className="mt-6 text-center">`);

// Add verify_signin_otp view rendering
const verifyOtpView = `
        {view === 'verify_signin_otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">رمز التحقق (OTP)</label>
              <div className="relative">
                <ShieldCheck className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="123456"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل الدخول'}
            </button>
            
            <button
              type="button"
              onClick={() => setView('signin')}
              className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition-colors"
            >
              العودة
            </button>
          </form>
        )}
`;

content = content.replace(/\{view === 'verify_signup' && \(/, `${verifyOtpView}\n        {view === 'verify_signup' && (`);

// Dynamic heading for verify OTP
content = content.replace(/'تحقق من البريد'\}/, `'تحقق من البريد' : view === 'verify_signin_otp' ? 'تسجيل الدخول برمز التحقق' : 'تحقق من البريد'}`);
content = content.replace(/'أدخل الكود المرسل إلى بريدك الإلكتروني'\}/, `'أدخل الكود المرسل إلى بريدك الإلكتروني' : view === 'verify_signin_otp' ? 'أدخل رمز OTP المرسل إلى بريدك لتسجيل الدخول' : 'أدخل الكود المرسل إلى بريدك الإلكتروني'}`);

fs.writeFileSync('src/pages/Auth/CustomAuth.tsx', content);
