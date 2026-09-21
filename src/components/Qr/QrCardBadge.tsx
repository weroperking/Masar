import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'qrcode';
import { CardCustomDesign, CardOverlayElement } from '../../types';
import { buildStudentLookupUrl } from '../../utils/studentCode';

export type CardThemeColor = 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';

export interface QrCardBadgeProps {
  cardNumber: string;
  qrCodeData?: string;
  studentName?: string | null;
  studentPhone?: string | null;
  studentGrade?: string | null;
  studentSchool?: string | null;
  centerName?: string;
  themeColor?: CardThemeColor | 'custom';
  showPhone?: boolean;
  showGrade?: boolean;
  showCenterName?: boolean;
  showCardNumber?: boolean;
  status?: 'active' | 'revoked' | string;
  size?: 'normal' | 'large' | 'compact' | 'print';
  backgroundImage?: string;
  className?: string;
  customDesign?: CardCustomDesign;
  face?: 'front' | 'back'; // Render active face, defaults to 'front'
  id?: string;
}

const themeStyles: Record<CardThemeColor, {
  headerBg: string;
  headerText: string;
  accentBorder: string;
  accentColor: string;
  accentBg: string;
  tagBg: string;
  tagText: string;
  brandMark: string;
}> = {
  blue: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-blue-600 dark:border-blue-500',
    accentColor: 'text-blue-600 dark:text-blue-400',
    accentBg: 'bg-blue-50 dark:bg-blue-950/60',
    tagBg: 'bg-blue-500/10 border-blue-500/20',
    tagText: 'text-blue-400',
    brandMark: 'bg-blue-600 text-white'
  },
  emerald: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-emerald-600 dark:border-emerald-500',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    tagBg: 'bg-emerald-500/10 border-emerald-500/20',
    tagText: 'text-emerald-400',
    brandMark: 'bg-emerald-600 text-white'
  },
  indigo: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-indigo-600 dark:border-indigo-500',
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    accentBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    tagBg: 'bg-indigo-500/10 border-indigo-500/20',
    tagText: 'text-indigo-400',
    brandMark: 'bg-indigo-600 text-white'
  },
  amber: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-amber-600 dark:border-amber-500',
    accentColor: 'text-amber-600 dark:text-amber-400',
    accentBg: 'bg-amber-50 dark:bg-amber-950/60',
    tagBg: 'bg-amber-500/10 border-amber-500/20',
    tagText: 'text-amber-400',
    brandMark: 'bg-amber-600 text-white'
  },
  rose: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-rose-600 dark:border-rose-500',
    accentColor: 'text-rose-600 dark:text-rose-400',
    accentBg: 'bg-rose-50 dark:bg-rose-950/60',
    tagBg: 'bg-rose-500/10 border-rose-500/20',
    tagText: 'text-rose-400',
    brandMark: 'bg-rose-600 text-white'
  },
  slate: {
    headerBg: 'bg-slate-900 dark:bg-slate-950',
    headerText: 'text-slate-100',
    accentBorder: 'border-slate-500 dark:border-slate-400',
    accentColor: 'text-slate-700 dark:text-slate-300',
    accentBg: 'bg-slate-100 dark:bg-slate-800',
    tagBg: 'bg-slate-500/10 border-slate-500/20',
    tagText: 'text-slate-400',
    brandMark: 'bg-slate-700 text-white'
  }
};

export function QrCardBadge({
  cardNumber,
  qrCodeData,
  studentName,
  studentPhone,
  studentGrade,
  studentSchool,
  centerName = 'سنتر مسار التعليمي',
  themeColor = 'blue',
  showPhone = true,
  showGrade = true,
  showCenterName = true,
  showCardNumber = true,
  status = 'active',
  size = 'normal',
  backgroundImage,
  className = '',
  customDesign,
  face = 'front',
  id
}: QrCardBadgeProps) {
  const isPrint = size === 'print';
  const isCompact = size === 'compact';
  const isLarge = size === 'large';

  // Customize config extraction
  const design = customDesign || {};
  const activeThemeColor: any = design.themeColor || themeColor || 'blue';
  const isCustomTheme = activeThemeColor === 'custom';

  const activeCenterName = design.centerName ?? centerName ?? 'سنتر مسار التعليمي';
  const activeShowPhone = design.showPhone ?? showPhone ?? true;
  const activeShowGrade = design.showGrade ?? showGrade ?? true;
  const activeShowSchool = design.showSchool ?? true;
  const activeShowCenterName = design.showCenterName ?? showCenterName ?? true;
  const activeShowCardNumber = design.showCardNumber ?? showCardNumber ?? true;
  const activeCardFormat = design.codeFormat || design.cardFormat || 'qrcode';
  const activeFontFamily = design.fontFamily ?? 'Cairo, sans-serif';
  const activeBorderRadius = design.borderRadius ?? 12;
  const activeBorderWidth = design.borderWidth ?? 1;
  const activeBorderColor = design.borderColor ?? '#cbd5e1';
  const activeSubtitleLabel = design.subtitleLabel ?? (studentName ? 'بطاقة طالب' : 'بطاقة حضور');
  const activeShowLogo = design.showLogo ?? true;
  const activeLogoPosition = design.logoPosition ?? 'right';

  // Generate QR Code targeting the student's dedicated portal page (/s/:code)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const isQrCode = activeCardFormat !== 'barcode'; // Defaults to QR Code
  const cleanCode = String(cardNumber || qrCodeData || '0001').replace(/\D/g, '') || '0001';

  useEffect(() => {
    if (isQrCode) {
      // If qrCodeData is already a full URL, encode it; otherwise encode /s/{cleanCode}
      const qrTargetUrl = (qrCodeData && (qrCodeData.startsWith('http://') || qrCodeData.startsWith('https://')))
        ? qrCodeData
        : buildStudentLookupUrl(cleanCode);

      QRCode.toDataURL(
        qrTargetUrl,
        { margin: 1, width: 140, color: { dark: '#000000', light: '#ffffff' } },
        (err, url) => {
          if (!err && url) {
            setQrCodeUrl(url);
          }
        }
      );
    }
  }, [cleanCode, isQrCode, qrCodeData]);

  // Is a custom template uploaded for this specific face?
  const hasFrontTemplate = !!design.frontImage;
  const hasBackTemplate = !!design.backImage;

  // Render the template image behind overlays
  const getObjectFit = (fit?: 'cover' | 'contain' | 'stretch'): any => {
    if (fit === 'stretch') return 'fill';
    if (fit === 'contain') return 'contain';
    return 'cover';
  };

  const renderFaceTemplate = () => {
    if (face === 'front' && hasFrontTemplate) {
      return (
        <img
          src={design.frontImage}
          alt="Front template"
          className="absolute inset-0 z-0 pointer-events-none select-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: getObjectFit(design.frontFit),
            opacity: design.frontOpacity ?? 1,
            transform: `scale(${design.frontScale ?? 1}) translate(${design.frontOffsetX ?? 0}px, ${design.frontOffsetY ?? 0}px)`,
          }}
          referrerPolicy="no-referrer"
        />
      );
    }
    if (face === 'back' && hasBackTemplate) {
      return (
        <img
          src={design.backImage}
          alt="Back template"
          className="absolute inset-0 z-0 pointer-events-none select-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: getObjectFit(design.backFit),
            opacity: design.backOpacity ?? 1,
            transform: `scale(${design.backScale ?? 1}) translate(${design.backOffsetX ?? 0}px, ${design.backOffsetY ?? 0}px)`,
          }}
          referrerPolicy="no-referrer"
        />
      );
    }
    return null;
  };

  // Helper to resolve overlay placement style
  const getElementStyle = (elem: CardOverlayElement) => {
    const align = elem.align || 'center';
    const tx = align === 'center' ? '-50%' : align === 'left' ? '0%' : '-100%';
    return {
      position: 'absolute' as const,
      left: `${elem.x}%`,
      top: `${elem.y}%`,
      transform: `translate(${tx}, -50%)`,
      fontSize: `${elem.fontSize}px`,
      color: elem.color,
      fontFamily: activeFontFamily,
      whiteSpace: 'nowrap' as const,
      zIndex: 20,
    };
  };

  // Overlay element rendering
  const renderOverlayElement = (elem: CardOverlayElement | undefined, text: string | null | undefined, defaultElem?: Partial<CardOverlayElement>) => {
    const fallback = defaultElem || {};
    const merged: CardOverlayElement = {
      visible: elem?.visible ?? (fallback.visible ?? false),
      x: elem?.x ?? (fallback.x ?? 50),
      y: elem?.y ?? (fallback.y ?? 50),
      fontSize: elem?.fontSize ?? (fallback.fontSize ?? 12),
      color: elem?.color ?? (fallback.color ?? '#000000'),
      align: elem?.align ?? (fallback.align ?? 'center'),
      showBackground: elem?.showBackground ?? (fallback.showBackground ?? false),
      backgroundColor: elem?.backgroundColor ?? (fallback.backgroundColor ?? '#ffffff'),
      backgroundOpacity: elem?.backgroundOpacity ?? (fallback.backgroundOpacity ?? 1),
      backgroundPadding: elem?.backgroundPadding ?? (fallback.backgroundPadding ?? 6),
      backgroundRadius: elem?.backgroundRadius ?? (fallback.backgroundRadius ?? 6),
    };

    if (!merged.visible || !text) return null;
    const style = getElementStyle(merged);

    if (merged.showBackground) {
      return (
        <div
          style={{
            ...style,
            backgroundColor: merged.backgroundColor,
            opacity: merged.backgroundOpacity,
            padding: `${merged.backgroundPadding}px ${merged.backgroundPadding * 2}px`,
            borderRadius: `${merged.backgroundRadius}px`,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            color: merged.color,
            transform: style.transform,
          }}
        >
          {text}
        </div>
      );
    }

    return (
      <div style={style}>
        {text}
      </div>
    );
  };

  // Setup styles
  const cardBorderRadius = `${activeBorderRadius}px`;
  const borderStyle = {
    borderRadius: cardBorderRadius,
    borderWidth: `${activeBorderWidth}px`,
    borderColor: isCustomTheme ? activeBorderColor : undefined,
    fontFamily: activeFontFamily
  };

  // Custom core background (legacy gradient or customColor)
  const legacyBodyStyle = design.gradientBg 
    ? { backgroundImage: `linear-gradient(${design.gradientAngle ?? 135}deg, ${design.gradientFrom ?? '#eff6ff'}, ${design.gradientTo ?? '#dbeafe'})` }
    : isCustomTheme && design.customColor
    ? { backgroundColor: design.customColor }
    : undefined;

  // Base background if template is missing
  const fallbackBgStyle = backgroundImage 
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', ...borderStyle } 
    : borderStyle;

  // Render barcode or QR code absolutely (matching physical card sticker: barcode + id underneath)
  const renderCodeOverlay = () => {
    const codeX = design.codeX ?? 50;
    const codeY = design.codeY ?? (face === 'back' ? 55 : 80);
    const codeScale = (design.codeScale ?? 100) / 100;
    const codeWidthVal = design.codeWidth ?? (isQrCode ? 92 : 135);
    const codeHeightVal = design.codeHeight ?? (isQrCode ? 92 : 42);
    const showDigits = design.showCodeDigits ?? true;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${codeX}%`,
          top: `${codeY}%`,
          transform: `translate(-50%, -50%) scale(${codeScale})`,
          transformOrigin: 'center center',
          zIndex: 30,
        }}
      >
        {isQrCode ? (
          <div 
            className="bg-white p-2 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center justify-between aspect-square overflow-hidden box-border"
            style={{
              width: `${codeWidthVal}px`,
              height: `${codeWidthVal}px`,
            }}
          >
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                style={{ 
                  width: showDigits ? `${codeWidthVal - 26}px` : `${codeWidthVal - 14}px`, 
                  height: showDigits ? `${codeWidthVal - 26}px` : `${codeWidthVal - 14}px`, 
                  objectFit: 'contain' 
                }}
                referrerPolicy="no-referrer"
                className="shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded animate-pulse" />
            )}
            {showDigits && (
              <span 
                className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-900 text-center select-all shrink-0 pb-0.5 leading-none"
              >
                * {cleanCode} *
              </span>
            )}
          </div>
        ) : (
          <div 
            className="bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm flex flex-col items-center justify-center overflow-hidden"
            style={{
              minWidth: `${codeWidthVal + 10}px`,
            }}
          >
            <div className="flex flex-col items-center justify-center">
              <Barcode 
                value={cleanCode} 
                format="CODE128" 
                width={1.2} 
                height={codeHeightVal} 
                displayValue={false} 
                margin={0}
                background="#ffffff"
                lineColor="#000000"
              />
            </div>
            {showDigits && (
              <span 
                className="font-mono text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-900 mt-1 text-center select-all"
              >
                * {cleanCode} *
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id={id}
      dir="rtl"
      style={{
        ...fallbackBgStyle,
        borderColor: isCustomTheme ? activeBorderColor : undefined,
        borderWidth: `${activeBorderWidth}px`,
        borderRadius: cardBorderRadius,
      }}
      className={`relative select-none overflow-hidden transition-all duration-150 text-right ${
        isPrint
          ? 'w-[340px] h-[215px] bg-white text-slate-900 border-slate-300 shadow-none'
          : isLarge
          ? 'w-full max-w-[420px] aspect-[1.58/1] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
          : isCompact
          ? 'w-[280px] h-[178px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
          : 'w-[350px] sm:w-[360px] h-[225px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
      } ${className}`}
    >
      {/* Background Overlay if custom color/gradient or legacy background is active */}
      {!hasFrontTemplate && !hasBackTemplate && (
        <>
          {backgroundImage && <div className="absolute inset-0 bg-white/92 dark:bg-slate-950/92 z-0" />}
          <div className="absolute inset-0 z-0 opacity-80" style={legacyBodyStyle} />
        </>
      )}

      {/* Render custom template image face if available */}
      {renderFaceTemplate()}

      {/* Front Face: ONLY the teacher's uploaded design */}
      {face === 'front' && (
        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {hasFrontTemplate ? (
            // Full teacher design without any overlays, text, or elements
            null
          ) : (
            // Placeholder when front design has not been uploaded yet
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/90 dark:to-slate-900 border border-dashed border-slate-300 dark:border-slate-700">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                تصميم الوجه الأمامي (Front)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                يظهر هنا تصميم المعلم بالكامل بدون أي نصوص أو بيانات إضافية
              </span>
            </div>
          )}
        </div>
      )}

      {/* Back Face: Back design + Barcode or QR Code with student ID */}
      {face === 'back' && (
        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {!hasBackTemplate && (
            <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900/90 flex flex-col items-center justify-start pt-6 pointer-events-none">
              <span className="text-[10px] text-slate-400 font-bold">الوجه الخلفي للبطاقة (Back)</span>
            </div>
          )}
          {renderCodeOverlay()}
        </div>
      )}
    </div>
  );
}
