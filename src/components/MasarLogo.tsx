import React from 'react';

interface MasarLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const MasarLogo: React.FC<MasarLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-xl' },
    md: { icon: 'w-8 h-8', text: 'text-2xl' },
    lg: { icon: 'w-10 h-10', text: 'text-3xl' },
    xl: { icon: 'w-12 h-12', text: 'text-4xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      dir="rtl"
      aria-label="مسار"
    >
      {/* 1. Iconic Tilted Squircle Mark (from 29049.svg) */}
      <svg
        viewBox="0 0 64 64"
        className={`${icon} aspect-square shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g transform="translate(32, 32) rotate(9.5)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M -9.5 -23 L 9.5 -23 C 18 -23 23 -18 23 -9.5 L 23 9.5 C 23 18 18 23 9.5 23 L -9.5 23 C -18 23 -23 18 -23 9.5 L -23 -9.5 C -23 -18 -18 -23 -9.5 -23 Z M 0 -8.2 C 4.53 -8.2 8.2 -4.53 8.2 0 C 8.2 4.53 4.53 8.2 0 8.2 C -4.53 8.2 -8.2 4.53 -8.2 0 C -8.2 -4.53 -4.53 -8.2 0 -8.2 Z"
            className="fill-slate-900 dark:fill-slate-100 transition-colors duration-200"
          />
        </g>
      </svg>

      {/* 2. Arabic Typography: مسار */}
      {showText && (
        <span
          className={`font-brand font-extrabold ${text} tracking-tight text-slate-900 dark:text-slate-100 transition-colors duration-200 leading-none`}
        >
          مسار
        </span>
      )}
    </div>
  );
};

export default MasarLogo;
