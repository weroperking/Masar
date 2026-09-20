import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { CardCustomDesign } from '../types';

export interface RenderCardOptions {
  design: CardCustomDesign;
  face: 'front' | 'back';
  cardNumber?: string;
  studentName?: string;
  width?: number; // Standard 300 DPI width (default 1050)
  height?: number; // Standard 300 DPI height (default 660)
}

/**
 * Loads an image from URL or Base64 into an HTMLImageElement safely
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for card rendering: ' + err));
    img.src = src;
  });
}

/**
 * Draws rounded rectangle path on Canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * High-definition in-memory Canvas Card Renderer
 * Generates crisp 300 DPI print-ready PNG data URL without any DOM manipulation or html2canvas issues
 */
export async function renderCardToCanvas(options: RenderCardOptions): Promise<HTMLCanvasElement> {
  const {
    design,
    face,
    cardNumber = '1001',
    width = 1050,
    height = 660
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Smooth antialiasing and image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cleanCode = String(cardNumber).replace(/\D/g, '') || '1001';
  const isQrCode = (design.cardFormat || 'barcode') === 'qrcode';

  // Base fill
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 1. FRONT FACE RENDERING
  if (face === 'front') {
    if (design.frontImage) {
      try {
        const frontImg = await loadImage(design.frontImage);
        ctx.save();
        
        // Calculate fit & scale
        const fit = design.frontFit || 'cover';
        const scale = design.frontScale ?? 1;
        const offsetX = (design.frontOffsetX ?? 0) * (width / 360);
        const offsetY = (design.frontOffsetY ?? 0) * (height / 225);

        if (fit === 'contain') {
          const ratio = Math.min(width / frontImg.width, height / frontImg.height);
          const dw = frontImg.width * ratio * scale;
          const dh = frontImg.height * ratio * scale;
          const dx = (width - dw) / 2 + offsetX;
          const dy = (height - dh) / 2 + offsetY;
          ctx.drawImage(frontImg, dx, dy, dw, dh);
        } else if (fit === 'stretch') {
          ctx.drawImage(frontImg, offsetX, offsetY, width * scale, height * scale);
        } else {
          // 'cover' default
          const ratio = Math.max(width / frontImg.width, height / frontImg.height);
          const dw = frontImg.width * ratio * scale;
          const dh = frontImg.height * ratio * scale;
          const dx = (width - dw) / 2 + offsetX;
          const dy = (height - dh) / 2 + offsetY;
          ctx.drawImage(frontImg, dx, dy, dw, dh);
        }
        ctx.restore();
      } catch (err) {
        console.warn('Could not draw front image:', err);
        // Fallback banner
        drawDefaultFront(ctx, width, height, design);
      }
    } else {
      drawDefaultFront(ctx, width, height, design);
    }
  } 
  // 2. BACK FACE RENDERING
  else {
    if (design.backImage) {
      try {
        const backImg = await loadImage(design.backImage);
        ctx.save();
        const fit = design.backFit || 'cover';
        const scale = design.backScale ?? 1;
        const offsetX = (design.backOffsetX ?? 0) * (width / 360);
        const offsetY = (design.backOffsetY ?? 0) * (height / 225);

        if (fit === 'contain') {
          const ratio = Math.min(width / backImg.width, height / backImg.height);
          const dw = backImg.width * ratio * scale;
          const dh = backImg.height * ratio * scale;
          const dx = (width - dw) / 2 + offsetX;
          const dy = (height - dh) / 2 + offsetY;
          ctx.drawImage(backImg, dx, dy, dw, dh);
        } else if (fit === 'stretch') {
          ctx.drawImage(backImg, offsetX, offsetY, width * scale, height * scale);
        } else {
          // 'cover'
          const ratio = Math.max(width / backImg.width, height / backImg.height);
          const dw = backImg.width * ratio * scale;
          const dh = backImg.height * ratio * scale;
          const dx = (width - dw) / 2 + offsetX;
          const dy = (height - dh) / 2 + offsetY;
          ctx.drawImage(backImg, dx, dy, dw, dh);
        }
        ctx.restore();
      } catch (err) {
        console.warn('Could not draw back image:', err);
        drawDefaultBack(ctx, width, height);
      }
    } else {
      drawDefaultBack(ctx, width, height);
    }

    // 3. DRAW BARCODE OR QR CODE BADGE ON BACK
    await drawCodeOverlayOnBack(ctx, width, height, design, cleanCode, isQrCode);
  }

  return canvas;
}

/**
 * Draws crisp barcode or QR code with white sticker container on back card
 */
async function drawCodeOverlayOnBack(
  ctx: CanvasRenderingContext2D,
  cardWidth: number,
  cardHeight: number,
  design: CardCustomDesign,
  code: string,
  isQrCode: boolean
) {
  const codeXPercent = (design.codeX ?? 50) / 100;
  const codeYPercent = (design.codeY ?? 55) / 100;
  const codeScale = (design.codeScale ?? 100) / 100;
  const showDigits = design.showCodeDigits ?? true;

  const centerX = cardWidth * codeXPercent;
  const centerY = cardHeight * codeYPercent;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(codeScale, codeScale);

  if (isQrCode) {
    // Render QR Code onto temp canvas
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, code, {
      margin: 1,
      width: 220,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    const stickerWidth = 260;
    const stickerHeight = showDigits ? 285 : 240;
    const stickerX = -stickerWidth / 2;
    const stickerY = -stickerHeight / 2;

    // Draw White Sticker Background with subtle shadow & border
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, 20);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    roundRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, 20);
    ctx.stroke();

    // Draw QR Code centered inside sticker
    const qrX = -110;
    const qrY = stickerY + 16;
    ctx.drawImage(qrCanvas, qrX, qrY, 220, 220);

    // Draw Digits text
    if (showDigits) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px Cairo, "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`* ${code} *`, 0, stickerY + stickerHeight - 22);
    }
  } else {
    // Render Barcode Code 128
    const barcodeCanvas = document.createElement('canvas');
    try {
      JsBarcode(barcodeCanvas, code, {
        format: 'CODE128',
        width: 3.2,
        height: 100,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });
    } catch (e) {
      console.warn('JsBarcode render error, falling back:', e);
    }

    const bWidth = barcodeCanvas.width || 340;
    const stickerWidth = Math.max(380, bWidth + 50);
    const stickerHeight = showDigits ? 175 : 135;
    const stickerX = -stickerWidth / 2;
    const stickerY = -stickerHeight / 2;

    // Draw White Sticker Background with subtle shadow & border
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, 20);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    roundRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, 20);
    ctx.stroke();

    // Draw Barcode Image centered
    const bcX = -barcodeCanvas.width / 2;
    const bcY = stickerY + 18;
    ctx.drawImage(barcodeCanvas, bcX, bcY);

    // Draw Digits
    if (showDigits) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Cairo, "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`* ${code} *`, 0, stickerY + stickerHeight - 24);
    }
  }

  ctx.restore();
}

/**
 * Fallback front background when teacher has not uploaded image yet
 */
function drawDefaultFront(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  design: CardCustomDesign
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top accent bar
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, width, 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(design.centerName || 'بطاقة الطالب الذكية', width / 2, height / 2 - 30);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Cairo, sans-serif';
  ctx.fillText('ارفع تصميم وجه الكارت الخاص بك من لوحة التحكم', width / 2, height / 2 + 25);
}

/**
 * Fallback back background
 */
function drawDefaultBack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top accent line
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, 0, width, 12);
}

/**
 * Renders card face directly to Base64 PNG data URL in memory
 */
export async function generateCardDataUrl(options: RenderCardOptions): Promise<string> {
  const canvas = await renderCardToCanvas(options);
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Downloads a single card face PNG directly in the browser
 */
export async function downloadCardImage(
  options: RenderCardOptions,
  filename?: string
): Promise<void> {
  const dataUrl = await generateCardDataUrl(options);
  const defaultFilename = options.face === 'front' 
    ? `تصميم_الوجه_الامامي_${options.cardNumber || '1001'}.png` 
    : `تصميم_الوجه_الخلفي_${options.cardNumber || '1001'}.png`;

  const link = document.createElement('a');
  link.download = filename || defaultFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
