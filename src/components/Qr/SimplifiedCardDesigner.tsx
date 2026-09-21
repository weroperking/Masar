import React, { useState, useEffect } from 'react';
import { 
  Save, Upload, CheckCircle, 
  QrCode, CreditCard, Palette, Trash2, HelpCircle,
  ZoomIn, ZoomOut, Maximize2, Download, Send, RefreshCw,
  Sliders, Eye, Sparkles, Smartphone, UserCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CardCustomDesign } from '../../types';
import { QrCardBadge } from './QrCardBadge';
import { ExportCardOrderModal } from './ExportCardOrderModal';
import { downloadCardImage } from '../../utils/cardRenderer';

export interface SimplifiedCardDesignerProps {
  design: CardCustomDesign;
  setDesign: React.Dispatch<React.SetStateAction<CardCustomDesign>>;
  onSaveDesign: () => Promise<void>;
  isSavingDesign: boolean;
  academyName?: string;
  totalStudents?: number;
}

export function SimplifiedCardDesigner({
  design,
  setDesign,
  onSaveDesign,
  isSavingDesign,
  academyName = 'أكاديمية مسار التعليمية',
  totalStudents = 0
}: SimplifiedCardDesignerProps) {
  const toast = useToast();
  const [activePreviewFace, setActivePreviewFace] = useState<'front' | 'back'>('front');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDownloadingDirect, setIsDownloadingDirect] = useState<boolean>(false);

  // Guarantee card back is strictly a QR code (no barcode)
  useEffect(() => {
    if (design.cardFormat !== 'qrcode') {
      setDesign(prev => ({ ...prev, cardFormat: 'qrcode' }));
    }
  }, [design.cardFormat, setDesign]);

  // File upload handlers
  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setDesign(prev => ({
          ...prev,
          cardFormat: 'qrcode',
          frontImage: ev.target?.result as string,
          frontFit: 'cover',
          frontOpacity: 1,
          frontScale: 1
        }));
        toast.success('تم رفع تصميم الوجه الأمامي للكارت بنجاح!');
        setActivePreviewFace('front');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setDesign(prev => ({
          ...prev,
          cardFormat: 'qrcode',
          backImage: ev.target?.result as string,
          backFit: 'cover',
          backOpacity: 1,
          backScale: 1,
          codeX: prev.codeX ?? 50,
          codeY: prev.codeY ?? 55
        }));
        toast.success('تم رفع تصميم الوجه الخلفي للكارت بنجاح!');
        setActivePreviewFace('back');
      };
      reader.readAsDataURL(file);
    }
  };

  // Direct download front or back in background (HD 300 DPI)
  const handleDirectDownloadFace = async (face: 'front' | 'back') => {
    try {
      setIsDownloadingDirect(true);
      await downloadCardImage({
        design: { ...design, cardFormat: 'qrcode' },
        face,
        cardNumber: '1001',
        width: 1050,
        height: 660
      });
      toast.success(face === 'front' ? 'تم تنزيل تصميم الوجه الأمامي بدقة HD' : 'تم تنزيل تصميم الظهر مع رمز QR بدقة HD');
    } catch (err: any) {
      toast.error('فشل تنزيل الصورة: ' + (err?.message || ''));
    } finally {
      setIsDownloadingDirect(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>محرر وتخصيص كروت الطلاب (الوجه والظهر)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ارفع التصميم المخصص لوجه وظهر الكارت، وحدد موضع الباركود أو كود QR بدقة للطباعة الفورية.
            </p>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form & Design Controls (lg:col-span-6 / order-2 lg:order-1) */}
        <div className="lg:col-span-6 space-y-5 order-2 lg:order-1">
          
          {/* 1. FRONT CARD UPLOAD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-900/50">
                  1
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">صورة الوجه الأمامي (Front)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تصميم المعلم / الأكاديمية بالكامل بدون أي نصوص إضافية</p>
                </div>
              </div>
              {design.frontImage && (
                <button
                  type="button"
                  onClick={() => setDesign(prev => ({ ...prev, frontImage: undefined }))}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إزالة</span>
                </button>
              )}
            </div>

            {design.frontImage ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <img
                  src={design.frontImage}
                  alt="Front Preview"
                  className="w-full sm:w-24 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>تم رفع تصميم الوجه الأمامي بنجاح</span>
                  </p>
                  <label className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold inline-block mt-0.5">
                    اضغط لتغيير صورة الوجه
                    <input type="file" accept="image/*" onChange={handleFrontUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-850/40 group">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">اضغط لرفع صورة وجه الكارت (Front Image)</span>
                <span className="text-[10px] text-slate-400 mt-1 text-center">PNG أو JPG مقاس قياسي (مثلاً 1050 × 660 أو 1000 × 630)</span>
                <input type="file" accept="image/*" onChange={handleFrontUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* 2. BACK CARD UPLOAD */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-900/50">
                  2
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">صورة الوجه الخلفي (Back)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تصميم ظهر الكارت المطبوع الذي سيحمل الرمز وكود الطالب</p>
                </div>
              </div>
              {design.backImage && (
                <button
                  type="button"
                  onClick={() => setDesign(prev => ({ ...prev, backImage: undefined }))}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إزالة</span>
                </button>
              )}
            </div>

            {design.backImage ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <img
                  src={design.backImage}
                  alt="Back Preview"
                  className="w-full sm:w-24 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>تم رفع تصميم الوجه الخلفي بنجاح</span>
                  </p>
                  <label className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold inline-block mt-0.5">
                    اضغط لتغيير صورة الظهر
                    <input type="file" accept="image/*" onChange={handleBackUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-850/40 group">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">اضغط لرفع صورة ظهر الكارت (Back Image)</span>
                <span className="text-[10px] text-slate-400 mt-1 text-center">PNG أو JPG مقاس قياسي</span>
                <input type="file" accept="image/*" onChange={handleBackUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* 3. CODE TYPE & POSITION CONTROLS */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-900/50">
                3
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">رمز QR الذكي وموضعه في ظهر الكارت</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">رمز QR تفاعلي موحد يجمع بين تسجيل الحضور وبوابة الطالب الذكية</p>
              </div>
            </div>

            {/* Dual-Purpose QR Code Feature Card */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      رمز كيو آر الموحد (Dual-Purpose QR Code)
                    </h5>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                      معتمد وثابت لجميع الكروت الصادرة في السنتر (بدون باركود تقليدي)
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>مفعل تلقائياً</span>
                </span>
              </div>

              {/* Two Core Functions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-3 border border-blue-100 dark:border-blue-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>1. للمنصة والسنتر:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    يخزن المعرّف الفريد للطالب غير القابل للتكرار، لتسجيل الحضور والغياب فورياً عبر كاميرا المنصة أو ماسح السنتر.
                  </p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 rounded-lg p-3 border border-blue-100 dark:border-blue-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>2. للطلاب وأولياء الأمور:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    عند مسح الرمز بكاميرا الهاتف المحمول، يفتح مباشرة صفحة الطالب المخصصة لمتابعة درجاته وحضوره واشتراكاته.
                  </p>
                </div>
              </div>
            </div>

            {/* Position Controls on Back */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">موضع الرمز في ظهر الكارت:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDesign(prev => ({ ...prev, codeX: 50, codeY: 55 }));
                      setActivePreviewFace('back');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer min-h-[32px]"
                  >
                    في المنتصف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDesign(prev => ({ ...prev, codeX: 50, codeY: 78 }));
                      setActivePreviewFace('back');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer min-h-[32px]"
                  >
                    في الأسفل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDesign(prev => ({ ...prev, codeX: 50, codeY: 30 }));
                      setActivePreviewFace('back');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer min-h-[32px]"
                  >
                    في الأعلى
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>الموضع الرأسي (عمودي):</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{design.codeY ?? 55}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="85"
                    value={design.codeY ?? 55}
                    onChange={e => {
                      setDesign(prev => ({ ...prev, codeY: Number(e.target.value) }));
                      setActivePreviewFace('back');
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>الموضع الأفقي (يمين / يسار):</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{design.codeX ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="85"
                    value={design.codeX ?? 50}
                    onChange={e => {
                      setDesign(prev => ({ ...prev, codeX: Number(e.target.value) }));
                      setActivePreviewFace('back');
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Scale / Sizing of Code on Back */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Maximize2 className="w-4 h-4 text-blue-500" />
                  <span>حجم وتكبير ملصق الرمز:</span>
                </span>
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  {design.codeScale ?? 100}%
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  title="تصغير"
                  onClick={() => {
                    setDesign(prev => ({ ...prev, codeScale: Math.max(50, (prev.codeScale ?? 100) - 5) }));
                    setActivePreviewFace('back');
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="50"
                  max="160"
                  step="5"
                  value={design.codeScale ?? 100}
                  onChange={e => {
                    setDesign(prev => ({ ...prev, codeScale: Number(e.target.value) }));
                    setActivePreviewFace('back');
                  }}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />

                <button
                  type="button"
                  title="تكبير"
                  onClick={() => {
                    setDesign(prev => ({ ...prev, codeScale: Math.min(160, (prev.codeScale ?? 100) + 5) }));
                    setActivePreviewFace('back');
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Live Card Preview (lg:col-span-6 / order-1 lg:order-2) */}
        <div className="lg:col-span-6 lg:sticky lg:top-6 space-y-4 order-1 lg:order-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col items-center gap-4 sm:gap-5 shadow-2xs">
            
            <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-500" />
                <span>المعاينة المباشرة للكارت (Live Preview)</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {activePreviewFace === 'front' ? 'معاينة الوجه الأمامي' : 'معاينة الوجه الخلفي'}
              </span>
            </div>

            {/* Face Switcher Buttons (Front / Back) */}
            <div className="w-full grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActivePreviewFace('front')}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
                  activePreviewFace === 'front'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <span>الوجه الأمامي (Front)</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewFace('back')}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] ${
                  activePreviewFace === 'back'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                <span>الوجه الخلفي (Back)</span>
              </button>
            </div>

            {/* Responsive Card Container */}
            <div className="w-full flex justify-center items-center py-4 sm:py-6 px-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="w-full max-w-[360px] sm:max-w-[400px] flex justify-center">
                <QrCardBadge
                  id="preview-card-element"
                  cardNumber="1001"
                  qrCodeData="1001"
                  customDesign={design}
                  face={activePreviewFace}
                  size="large"
                  className="shadow-md"
                />
              </div>
            </div>

            {/* Direct Instant Action Buttons */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDirectDownloadFace('front')}
                disabled={isDownloadingDirect}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50 min-h-[44px]"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>تنزيل الوجه الأمامي (HD)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectDownloadFace('back')}
                disabled={isDownloadingDirect}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50 min-h-[44px]"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>تنزيل الوجه الخلفي (HD)</span>
              </button>
            </div>

            {/* Primary Order & Export Button */}
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer min-h-[46px]"
            >
              <Send className="w-4 h-4" />
              <span>تجهيز ملفات الطباعة وطلب الكروت PVC</span>
            </button>

            {/* Explanatory Guide Box */}
            <div className="w-full p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>مواصفات الكارت المطبوع:</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                • <strong className="text-slate-700 dark:text-slate-300">الوجه الأمامي:</strong> يظهر تصميمك الأصلي بالكامل بدون أي بيانات مشوهة أو متداخلة.
                <br />
                • <strong className="text-slate-700 dark:text-slate-300">الوجه الخلفي:</strong> يظهر تصميم الظهر ومثبت عليه ملصق رمز QR الذكي مع كود الطالب مطبوعاً أسفله (<span className="font-mono font-bold text-slate-700 dark:text-slate-300">* 1001 *</span>).
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Export & Order Modal */}
      <ExportCardOrderModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        design={design}
        academyName={academyName}
        totalStudents={totalStudents}
      />

    </div>
  );
}
