import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { User, Phone, GraduationCap, School, ShieldCheck, QrCode as QrIcon } from 'lucide-react';

export type CardThemeColor = 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';

export interface QrCardBadgeProps {
  cardNumber: string;
  qrCodeData?: string;
  studentName?: string | null;
  studentPhone?: string | null;
  studentGrade?: string | null;
  studentSchool?: string | null;
  centerName?: string;
  themeColor?: CardThemeColor;
  showPhone?: boolean;
  showGrade?: boolean;
  showCenterName?: boolean;
  showCardNumber?: boolean;
  status?: 'active' | 'revoked' | string;
  size?: 'normal' | 'large' | 'compact' | 'print';
  backgroundImage?: string;
  className?: string;
}

// Sophisticated, human-crafted architectural color themes (no arbitrary multi-color gradients)
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
  className = ''
}: QrCardBadgeProps) {
  

  const isPrint = size === 'print';
  const isCompact = size === 'compact';
  const isLarge = size === 'large';

  return (
    <div
      dir="rtl"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={`relative select-none rounded-xl overflow-hidden border transition-all duration-150 text-right ${
        isPrint
          ? 'w-[340px] h-[215px] bg-white text-slate-900 border-slate-300 shadow-none'
          : isLarge
          ? 'w-full max-w-[420px] aspect-[1.58/1] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
          : isCompact
          ? 'w-[280px] h-[178px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
          : 'w-[350px] sm:w-[360px] h-[225px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
      } ${className}`}
    >
      {/* Background Overlay if image is used */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-0"></div>
      )}
      
      {/* Top Header Strip - Clean Architectural Header */}
      <div className={`relative z-10 px-4 py-2.5 flex items-center justify-between border-b border-slate-800/20 dark:border-slate-800 ${themeStyles[themeColor].headerBg} ${themeStyles[themeColor].headerText}`}>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[11px] ${themeStyles[themeColor].brandMark}`}>
            م
          </div>
          {showCenterName && (
            <span className="font-semibold text-xs tracking-wide truncate max-w-[170px] text-slate-200">
              {centerName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(status === 'revoked') ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              موقوفة
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${themeStyles[themeColor].tagBg} ${themeStyles[themeColor].tagText} flex items-center gap-1`}>
              <ShieldCheck className="w-3 h-3" />
              {studentName ? 'بطاقة طالب' : 'بطاقة حضور'}
            </span>
          )}
        </div>
      </div>

      {/* Solid subtle accent hairline */}
      <div className={`relative z-10 h-[2px] w-full ${themeStyles[themeColor].accentBorder.replace('border-', 'bg-')}`} />

      {/* Card Body */}
      <div className="relative z-10 p-4 flex items-center justify-between gap-3 h-[calc(100%-46px)]">
        {/* Student Details / Identification Info */}
        <div className="flex-1 flex flex-col justify-between h-full min-w-0 pr-0.5">
          <div className="space-y-1.5">
            {studentName ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {studentName}
                    </h3>
                  </div>
                </div>

                {showGrade && (studentGrade || studentSchool) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pr-0.5">
                    {studentGrade && (
                      <span className="flex items-center gap-1 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {studentGrade}
                      </span>
                    )}
                    {studentSchool && (
                      <span className="flex items-center gap-1 truncate text-slate-400">
                        • {studentSchool}
                      </span>
                    )}
                  </div>
                )}

                {showPhone && studentPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 pr-0.5 font-mono">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{studentPhone}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1 py-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  <QrIcon className="w-3.5 h-3.5 text-slate-400" />
                  بطاقة عضوية غير مخصصة
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  جاهزة للربط الفوري بأي طالب عند التوزيع أو مسح الكود
                </p>
              </div>
            )}
          </div>

          {/* Bottom Card Number & Guidance */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {showCardNumber && (
              <div>
                <span className="text-[10px] text-slate-400 block leading-none mb-0.5 font-sans">رقم الطالب (الباركود)</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tracking-wider">
                  {String(cardNumber || qrCodeData || '0001').replace(/\D/g, '') || '0001'}
                </span>
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-bold">
              مسار
            </div>
          </div>
        </div>

        {/* Barcode Container - Strict numeric encoding only */}
        <div className="shrink-0 flex flex-col items-center justify-center">
          <div className="bg-white p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col items-center justify-center overflow-hidden w-28 sm:w-32 h-20 sm:h-24">
            <Barcode 
              value={String(cardNumber || qrCodeData || '0001').replace(/\D/g, '') || '0001'} 
              format="CODE128" 
              width={1.5} 
              height={38} 
              displayValue={false} 
              margin={0}
              background="#ffffff"
              lineColor="#0f172a"
            />
            <span className="font-mono text-[10px] font-bold text-slate-900 tracking-wider mt-0.5">
              {String(cardNumber || qrCodeData || '0001').replace(/\D/g, '') || '0001'}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-medium text-center">
            امسح الباركود
          </span>
        </div>
      </div>
    </div>
  );
}
