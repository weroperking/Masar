import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Check, Image, RotateCw, ChevronsUpDown } from 'lucide-react';
import { playSuccessBeep, playWarningBeep } from '../../utils/audio';
import { extractStudentCodeFromScanned } from '../../utils/studentCode';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const containerId = useRef(`html5-qrcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // Scanner ref and state
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [permissionDeniedPermanently, setPermissionDeniedPermanently] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Fallback mode tab (true = File selector, false = Live video)
  const [useFileFallback, setUseFileFallback] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);

  // Debounce/Cooldown ref to avoid repeated triggers on same code
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Handle successful detection
  const handleDecoded = (decodedText: string) => {
    const rawClean = decodedText.trim();
    if (!rawClean) return;

    // Automatically extract clean student code or ID from URL or raw code
    const studentCode = extractStudentCodeFromScanned(rawClean) || rawClean;
    if (!studentCode) return;

    const now = Date.now();
    // 2.5 second cooldown for the exact same student code to prevent duplicate logging
    if (studentCode === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = studentCode;
    lastScannedTimeRef.current = now;

    playSuccessBeep();

    setSuccessCode(studentCode);
    setTimeout(() => {
      setSuccessCode(null);
    }, 2000);

    // Call parent scan callback immediately
    onScan(studentCode);
  };

  // Start scanning with a specific camera ID
  const startScanning = async (cameraId: string) => {
    if (!html5QrcodeRef.current) return;
    setIsStarting(true);
    setInitError(null);

    try {
      // If already scanning, stop it first
      if (html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }

      await html5QrcodeRef.current.start(
        cameraId,
        {
          fps: 25,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // Frame fail (silent)
        }
      );
      setIsScanning(true);
      setInitError(null);
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      let friendlyError = "عذراً، فشل تشغيل الكاميرا المباشرة.";
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")) {
        friendlyError = "تم رفض إذن الكاميرا. يرجى تفعيل إذن الوصول للكاميرا في إعدادات المتصفح.";
      } else if (err?.name === "NotReadableError" || err?.message?.includes("Could not start video source")) {
        friendlyError = "الكاميرا قيد الاستخدام حالياً من قبل تطبيق آخر. يرجى إغلاقه وإعادة المحاولة.";
      }
      setInitError(friendlyError);
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Stop scanning
  const stopScanning = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanning:", err);
      }
    }
  };

  // Initialize and list cameras
  const initializeLiveScanner = async () => {
    setIsStarting(true);
    setInitError(null);
    try {
      let devices: { id: string; label: string }[] = [];
      try {
        devices = await Html5Qrcode.getCameras();
        setCameras(devices);
      } catch (e) {
        console.warn("Failed to get cameras, attempting direct facingMode start", e);
      }

      if (devices && devices.length > 0) {
        // Find rear/back camera
        const backCam = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        const defaultId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(defaultId);
        await startScanning(defaultId);
      } else {
        // Start directly with facingMode environment (triggers permission dialog)
        if (html5QrcodeRef.current) {
          await html5QrcodeRef.current.start(
            { facingMode: "environment" },
            {
              fps: 25,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              handleDecoded(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
          try {
            const freshDevices = await Html5Qrcode.getCameras();
            setCameras(freshDevices);
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error("Initialization failed:", err);
      let friendlyError = "عذراً، فشل تشغيل الكاميرا المباشرة.";
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")) {
        friendlyError = "تم رفض إذن الوصول للكاميرا. يرجى تفعيل إذن الكاميرا للموقع في المتصفح.";
      }
      setInitError(friendlyError);
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Request camera permission explicitly via browser mediaDevices API
  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    setInitError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("المتصفح لا يدعم الوصول المباشر للكاميرا");
      }

      // Explicitly trigger browser camera permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      }).catch(async () => {
        // Fallback to basic video constraint
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });

      // Permission granted! Stop test stream tracks to free hardware for scanner
      stream.getTracks().forEach((track) => track.stop());
      setPermissionDeniedPermanently(false);
      setInitError(null);

      // Start scanner
      await initializeLiveScanner();
    } catch (err: any) {
      console.error("Camera permission request failed:", err);
      let friendlyError = "عذراً، فشل تشغيل الكاميرا المباشرة.";
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.includes("Permission denied") ||
        err?.message?.includes("NotAllowed")
      ) {
        friendlyError = "تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا للموقع من إعدادات المتصفح أو شريط العنوان.";
        setPermissionDeniedPermanently(true);
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        friendlyError = "لم يتم العثور على كاميرا متصلة بهذا الجهاز.";
      } else if (err?.name === "NotReadableError" || err?.message?.includes("Could not start video source")) {
        friendlyError = "الكاميرا قيد الاستخدام حالياً في تطبيق آخر على جهازك.";
      }
      setInitError(friendlyError);
      setIsScanning(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.onchange = () => {
            if (status.state === 'granted') {
              setPermissionDeniedPermanently(false);
              setInitError(null);
              initializeLiveScanner();
            }
          };
        })
        .catch(() => {
          // Ignore browsers that don't support camera permission query
        });
    }

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    // Instantiate the engine once
    const html5Qrcode = new Html5Qrcode(containerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13
      ],
      verbose: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    });
    html5QrcodeRef.current = html5Qrcode;

    if (!useFileFallback) {
      initializeLiveScanner();
    }

    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop()
          .then(() => html5Qrcode.clear())
          .catch(err => console.warn("Failed to stop scanner on unmount:", err));
      }
    };
  }, [containerId, useFileFallback]);

  // Handle camera selection change
  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (newId) {
      await startScanning(newId);
    }
  };

  // Cycle cameras for mobile layout (swap camera icon)
  const cycleCameras = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    setSelectedCameraId(nextId);
    await startScanning(nextId);
  };

  // File fallback handler
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setFileScanError(null);

    try {
      const tempScanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      const decodedText = await tempScanner.scanFile(file, false);
      handleDecoded(decodedText);
      try {
        tempScanner.clear();
      } catch (e) {}
    } catch (err: any) {
      console.warn("File scan failed:", err);
      setFileScanError("لم يتم العثور على رمز باركود أو QR واضح في الصورة. يرجى التأكد من وضوح الصورة وتصوير الكارت عن قرب.");
      playWarningBeep();
    } finally {
      setIsScanningFile(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black text-white flex flex-col justify-between select-none overflow-hidden rounded-none md:rounded-2xl">
      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; }
          50% { top: 94%; }
          100% { top: 6%; }
        }
        .animate-scan-laser {
          animation: scanLaser 2.2s ease-in-out infinite;
        }
        #${containerId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        #${containerId} {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0px !important;
        }
      `}</style>

      {/* 1. Live Camera Stream full-bleed background container */}
      <div 
        id={containerId} 
        className={`absolute inset-0 w-full h-full bg-slate-950 transition-opacity duration-300 ${useFileFallback ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      />

      {/* 2. Overlaid Semi-Transparent Top UI Bar */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-30 flex items-center justify-between px-5 pointer-events-auto">
        {/* Left Side: Mockup Circular Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="إغلاق الكاميرا"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Right Side: Camera Swap (Mobile Rear/Front Switcher) */}
        {!useFileFallback && cameras.length > 1 && (
          <button
            type="button"
            onClick={cycleCameras}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
            title="تبديل الكاميرا"
          >
            <RotateCw className="w-4 h-4 text-slate-200" />
          </button>
        )}
      </div>

      {/* 3. Text Prompts Overlaid directly on the Viewfinder */}
      <div className="absolute top-20 inset-x-0 text-center px-6 z-20 pointer-events-none flex flex-col gap-1.5">
        <h3 className="text-lg md:text-xl font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
          {useFileFallback ? "تصوير كارت الطالب" : "مسح كود الطالب"}
        </h3>
        <p className="text-xs text-slate-300 max-w-[280px] mx-auto drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)] leading-relaxed">
          {useFileFallback 
            ? "التقط صورة واضحة للباركود أو كود الـ QR الخاص بكارت الطالب"
            : "ضع كود الباركود أو الـ QR الخاص بكارت الطالب في مربع المسح المخصص أدناه"}
        </p>
      </div>

      {/* 4. Glassmorphic Central Target Area Finder */}
      {!useFileFallback && isScanning && !successCode && (
        <div className="absolute inset-0 flex flex-col pointer-events-none z-10 overflow-hidden">
          {/* Top dark backdrop segment */}
          <div className="flex-1 bg-black/55" />
          
          {/* Middle segment with clear square window cutout */}
          <div className="flex flex-row h-52 md:h-64 shrink-0">
            <div className="flex-1 bg-black/55" />
            
            {/* The transparent cutout window with premium rounded corners and clean borders (strict square) */}
            <div className="w-52 h-52 md:w-64 md:h-64 shrink-0 relative rounded-2xl border-2 border-white/95">
              
              {/* Corner brackets details */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/60 rounded-tl" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/60 rounded-tr" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/60 rounded-bl" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/60 rounded-br" />

              {/* Shimmer laser scanner line */}
              <div className="absolute left-1.5 right-1.5 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-scan-laser" />
            </div>
            
            <div className="flex-1 bg-black/55" />
          </div>

          {/* Bottom dark backdrop segment */}
          <div className="flex-1 bg-black/55" />
        </div>
      )}

      {/* 5. Center-aligned State Overlays (Starting, Error, Fallback mode) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-20 pointer-events-auto">
        
        {/* Loading / Starting stream indicator */}
        {!useFileFallback && isStarting && (
          <div className="flex flex-col items-center justify-center gap-3 bg-black/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md max-w-xs text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <h4 className="text-xs font-bold text-slate-100">جاري تشغيل بث الكاميرا...</h4>
            <p className="text-[10px] text-slate-400 leading-normal">يرجى السماح بالوصول للكاميرا من المتصفح</p>
          </div>
        )}

        {/* Live camera stream error view & Minimalist Permission Opener */}
        {!useFileFallback && initError && !isStarting && (
          <div className="flex flex-col items-center justify-center gap-3.5 bg-slate-900/95 p-6 rounded-2xl border border-white/10 backdrop-blur-xl max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Minimalist Icon Indicator */}
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 text-blue-400 flex items-center justify-center shadow-inner">
              <Camera className="w-6 h-6" />
            </div>

            {/* Title & Concise Description */}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-wide">
                الكاميرا بحاجة إلى إذن التشغيل
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                {initError}
              </p>
            </div>

            {/* Minimalist Actions Container */}
            <div className="w-full space-y-2 pt-1">
              {/* Minimalist Primary Button: Open Camera Permission */}
              <button
                type="button"
                id="request-camera-permission-btn"
                onClick={requestCameraPermission}
                disabled={isRequestingPermission}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-blue-500/20"
              >
                {isRequestingPermission ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري طلب الإذن...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>منح إذن الكاميرا</span>
                  </>
                )}
              </button>

              {/* Secondary Minimalist Action Buttons */}
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  id="retry-camera-btn"
                  onClick={initializeLiveScanner}
                  disabled={isRequestingPermission}
                  className="flex-1 py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium rounded-xl border border-white/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  type="button"
                  id="fallback-photo-btn"
                  onClick={() => setUseFileFallback(true)}
                  className="flex-1 py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium rounded-xl border border-white/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>تصوير كارت</span>
                </button>
              </div>
            </div>

            {/* Subtle Minimalist Helper Tip if browser blocked permissions */}
            {permissionDeniedPermanently && (
              <div className="mt-1 pt-3 border-t border-white/5 text-[10px] text-slate-400 flex items-start gap-1.5 text-right w-full bg-slate-950/40 p-2.5 rounded-lg leading-relaxed">
                <span className="text-blue-400 text-xs shrink-0">💡</span>
                <span>
                  إذا كان المتصفح يحظر الكاميرا تلقائياً، اضغط على أيقونة القفل أو الكاميرا بجوار رابط الصفحة بالأعلى واختر <strong>سماح (Allow)</strong> ثم أعد الضغط على زر منح الإذن.
                </span>
              </div>
            )}
          </div>
        )}

        {/* PHOTO FILE FALLBACK VIEW PORT */}
        {useFileFallback && (
          <div className="w-full max-w-xs flex flex-col items-center justify-center gap-4 py-4 animate-in fade-in duration-200 mt-20">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelected}
              className="hidden"
              id="fullscreen-fallback-file-input"
            />

            {!isScanningFile && !successCode && (
              <label
                htmlFor="fullscreen-fallback-file-input"
                className="flex flex-col items-center justify-center p-6 bg-slate-900/80 hover:bg-slate-900/90 border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-xl cursor-pointer transition-all duration-200 group w-full shadow-lg text-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-100 mb-1">
                  التقاط صورة لكارت الطالب
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  اضغط هنا لفتح تطبيق الكاميرا الخاص بجهازك والتصوير
                </p>
                <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-md inline-block">
                  فتح الكاميرا والتصوير
                </span>
              </label>
            )}

            {isScanningFile && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 bg-black/60 px-6 rounded-xl border border-white/10 backdrop-blur-md">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                <h4 className="text-xs font-bold text-slate-200">جاري فك الكود...</h4>
              </div>
            )}

            {fileScanError && !isScanningFile && !successCode && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] flex flex-col items-center gap-2 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>تعذر فك الكود</span>
                </div>
                <p className="text-slate-300 leading-normal">{fileScanError}</p>
                <label
                  htmlFor="fullscreen-fallback-file-input"
                  className="mt-2 px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md cursor-pointer text-[10px] transition-colors"
                >
                  إعادة المحاولة
                </label>
              </div>
            )}
          </div>
        )}

        {/* SHARED SUCCESS STATE */}
        {successCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-6 gap-3 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center ring-4 ring-emerald-500/5 animate-bounce mb-1">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h4 className="text-xs font-bold text-slate-100">تمت قراءة الكود بنجاح!</h4>
            <p className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-lg">
              كود الطالب: #{successCode}
            </p>
          </div>
        )}

      </div>

      {/* 6. Active Camera Dropdown Indicator overlay (Only on larger screens for computer convenience) */}
      {!useFileFallback && cameras.length > 1 && (
        <div className="absolute top-16 right-5 z-20 hidden md:block max-w-[190px]">
          <button
            type="button"
            onClick={cycleCameras}
            className="flex items-center justify-between gap-2 text-[10px] bg-black/50 hover:bg-black/70 text-slate-200 font-sans border border-white/15 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-md cursor-pointer shadow-lg w-full text-right"
            title="اضغط للتبديل السريع بين الكاميرات المتوفرة"
          >
            <span className="truncate">
              {cameras.find(c => c.id === selectedCameraId)?.label || `كاميرا ${cameras.findIndex(c => c.id === selectedCameraId) + 1}`}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      )}

      {/* 7. Bottom Elegant Pill switcher (Exactly like mock-up "Scan code" and "Enter code" switch container) */}
      <div className="pb-8 px-6 text-center z-20 pointer-events-auto shrink-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6">
        <div className="inline-flex bg-slate-900/75 border border-slate-800/80 p-1 rounded-full backdrop-blur-md items-center gap-1 min-w-[260px] md:min-w-[280px] shadow-2xl">
          
          {/* Active / Inactive switch block: Live Stream Camera */}
          <button
            type="button"
            onClick={() => {
              if (useFileFallback) {
                setUseFileFallback(false);
              }
            }}
            className={`flex-1 py-2 px-3 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer ${
              !useFileFallback
                ? "bg-white text-slate-900 shadow-md transform scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            مسح الكود (بث مباشر)
          </button>

          {/* Active / Inactive switch block: File capture Fallback */}
          <button
            type="button"
            onClick={() => {
              if (!useFileFallback) {
                stopScanning();
                setUseFileFallback(true);
              }
            }}
            className={`flex-1 py-2 px-3 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer ${
              useFileFallback
                ? "bg-white text-slate-900 shadow-md transform scale-[1.02]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            تصوير الكارت (بديل)
          </button>

        </div>
        
        {/* Subtle camera capability descriptor */}
        <p className="text-[9px] text-slate-500 mt-3 font-medium">
          سنتر مسار — قارئ ذكي فوري لأكواد الطلاب
        </p>
      </div>

    </div>
  );
}
