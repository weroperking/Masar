import React, { useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { playSuccessBeep, playWarningBeep } from '../../utils/audio';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const containerId = useRef(`html5-qrcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // States for Native Device Camera File Processing
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Debounce/Cooldown ref to avoid repeated triggers on same code
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Handle successful detection
  const handleDecoded = (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    const now = Date.now();
    // 2.5 second cooldown for the exact same student code to prevent duplicate logging
    if (cleanText === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = cleanText;
    lastScannedTimeRef.current = now;

    playSuccessBeep();

    setSuccessCode(cleanText);
    setTimeout(() => {
      setSuccessCode(null);
    }, 2000);

    // Call parent scan callback immediately without requiring Enter
    onScan(cleanText);
  };

  // Process File Captured from the Native Device Camera App
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setFileScanError(null);

    try {
      // Html5Qrcode requires the target container DOM element to exist
      const tempScanner = new Html5Qrcode(containerId);
      
      // scanFile parses the captured photo file directly using high performance client-side decoding
      const decodedText = await tempScanner.scanFile(file, false);
      
      handleDecoded(decodedText);
      
      try {
        tempScanner.clear();
      } catch (e) {}
    } catch (err: any) {
      console.warn("File QR/Barcode scan failed:", err);
      setFileScanError("لم يتم العثور على رمز باركود أو QR واضح في الصورة الملتقطة. يرجى الاقتراب من الكارت والتأكد من وضوح الصورة وتجنب الاهتزاز.");
      playWarningBeep();
    } finally {
      setIsScanningFile(false);
      // Reset input value to allow scanning the same or new file next time
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  return (
    <div className="relative bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col transition-all duration-200">
      
      {/* Hidden Target Container for QR Parser Engine */}
      <div id={containerId} className="hidden" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-blue-400" />
            <span>تسجيل الحضور بكاميرا الجهاز</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium hidden sm:inline">
            تشغيل الكاميرا مباشرة
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs transition-colors cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Viewport Content: Native Device Camera Launcher */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center gap-4 bg-slate-950">
        
        {/* File Input triggering Native Device OS Camera directly */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
          id="native-device-camera-trigger"
        />

        {!isScanningFile && !successCode && (
          <label
            htmlFor="native-device-camera-trigger"
            className="flex flex-col items-center justify-center p-8 bg-slate-900 hover:bg-slate-900/80 border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-2xl cursor-pointer transition-all duration-200 group max-w-sm w-full shadow-lg"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 ring-4 ring-blue-500/5 group-hover:scale-110 transition-transform duration-200">
              <Camera className="w-8 h-8 text-blue-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-100 mb-1">
              تشغيل كاميرا الجهاز
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              اضغط هنا لفتح الكاميرا والتقاط صورة واضحة للباركود أو كود QR للطالب مباشرة
            </p>
            <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-block shadow-sm">
              التقاط صورة للتحضير
            </span>
          </label>
        )}

        {/* Scanning/Processing State */}
        {isScanningFile && (
          <div className="flex flex-col items-center justify-center p-8 gap-3 max-w-sm w-full">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-sm font-bold text-slate-200 mt-2">جاري قراءة كود الصورة...</h4>
            <p className="text-xs text-slate-400">
              يقوم النظام بتحليل الباركود الملتقط لتسجيل حضور الطالب فوراً
            </p>
          </div>
        )}

        {/* Success Temporary Status Indicator */}
        {successCode && (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-emerald-400 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 ring-4 ring-emerald-500/5">
              <Check className="w-8 h-8 text-emerald-400 stroke-[3]" />
            </div>
            <h4 className="text-sm font-bold text-slate-100">تمت القراءة والتسجيل!</h4>
            <p className="text-xs text-emerald-400/80 font-mono font-bold">
              كود الطالب: #{successCode}
            </p>
          </div>
        )}

        {/* Native QR Parsing Errors and Solutions Guide */}
        {fileScanError && !isScanningFile && !successCode && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-md text-right text-xs space-y-2 flex flex-col items-center">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>تعذر فك ترميز الكود</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-center">
              {fileScanError}
            </p>
            <div className="pt-1">
              <label
                htmlFor="native-device-camera-trigger"
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer transition-colors inline-block"
              >
                إعادة المحاولة
              </label>
            </div>
          </div>
        )}

        {/* Tips for Best Scanning Results */}
        <div className="text-[11px] text-slate-400 bg-slate-900/40 p-3 rounded-xl max-w-sm border border-slate-900/50 flex items-start gap-2 text-right">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>نصيحة:</strong> يفضل جعل الكاميرا عمودية تماماً على الكارت مع وجود إضاءة جيدة لتحقيق قراءة فورية في أقل من ثانية.
          </p>
        </div>

      </div>

      {/* Camera Footer Banner */}
      <div className="px-4 py-2.5 bg-slate-900/90 text-center border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>يدعم أكواد QR والباركود التسلسلي ID للطلاب</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>قراءة سريعة فورية</span>
        </span>
      </div>
    </div>
  );
}
