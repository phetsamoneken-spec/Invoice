import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { Invoice } from '../types/invoice';
import { formatDateDMY, formatLAKWithSymbol } from './invoiceMath';

export interface ShareResult {
  mode: 'native-share' | 'fallback-download';
  whatsappUrl?: string;
  message: string;
}

/**
 * Renders the dedicated OriginalPaperInvoice DOM element to a high-DPI PNG data URL & Blob.
 * Uses browser font shaping so Noto Sans Lao tone marks and vowels render accurately.
 */
export async function generateInvoicePngBlob(element: HTMLElement): Promise<{ blob: Blob; dataUrl: string }> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(element, {
    pixelRatio: 3,
    backgroundColor: '#ffffff',
    cacheBust: true,
    skipFonts: false,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { blob, dataUrl };
}

/**
 * Generates an A4 PDF Blob embedding the high-resolution rendered Lao/French invoice.
 * Embedding the browser-shaped raster ensures 100% accurate Lao Unicode rendering across all PDF viewers.
 */
export async function generateInvoicePdfBlob(element: HTMLElement): Promise<Blob> {
  const { dataUrl } = await generateInvoicePngBlob(element);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 10;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const rect = element.getBoundingClientRect();
  const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 210 / 297;

  let renderW = maxW;
  let renderH = renderW / aspect;
  if (renderH > maxH) {
    renderH = maxH;
    renderW = renderH * aspect;
  }

  const x = (pageWidth - renderW) / 2;
  const y = margin;

  pdf.addImage(dataUrl, 'PNG', x, y, renderW, renderH, undefined, 'FAST');
  return pdf.output('blob');
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function buildWhatsAppSummaryText(invoice: Invoice, shopName: string): string {
  const statusMap: Record<Invoice['status'], string> = {
    draft: 'ຮ່າງ (Draft)',
    issued: 'ອອກບິນແລ້ວ / ຍັງບໍ່ຈ່າຍ',
    paid: 'ຈ່າຍແລ້ວ',
    void: 'ຍົກເລີກ (Void)',
  };

  return [
    `ໃບຮັບເງິນ / FACTURE`,
    `ຮ້ານ: ${shopName}`,
    `ເລກທີ: ${invoice.invoiceNumber}`,
    `ວັນທີ: ${formatDateDMY(invoice.date)}`,
    `ລູກຄ້າ: ${invoice.customerName}`,
    `ລວມເງິນ: ${formatLAKWithSymbol(invoice.totalAmount)}`,
    `ສະຖານະ: ${statusMap[invoice.status]}`,
  ].join('\n');
}

export function buildWhatsAppFallbackUrl(invoice: Invoice, shopName: string): string {
  const text = encodeURIComponent(buildWhatsAppSummaryText(invoice, shopName));
  const digits = invoice.customerPhone.replace(/[^\d]/g, '');
  // If customer phone looks like a Laos number (e.g. 020...), keep wa.me generic unless international code is present
  const phoneSegment = digits.startsWith('856') ? digits : '';
  return phoneSegment
    ? `https://wa.me/${phoneSegment}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

export function canUseWebShareWithFiles(file: File): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Shares an invoice PDF or PNG file using the Web Share API when supported.
 * Falls back cleanly to downloading the file + providing a WhatsApp text-link URL.
 * Never claims automatic WhatsApp delivery.
 */
export async function shareInvoiceViaWhatsApp(params: {
  invoice: Invoice;
  shopName: string;
  blob: Blob;
  filename: string;
  mimeType: 'application/pdf' | 'image/png';
}): Promise<ShareResult> {
  const { invoice, shopName, blob, filename, mimeType } = params;
  const file = new File([blob], filename, { type: mimeType });
  const summaryText = buildWhatsAppSummaryText(invoice, shopName);

  if (canUseWebShareWithFiles(file)) {
    await navigator.share({
      title: `ໃບຮັບເງິນ ${invoice.invoiceNumber}`,
      text: summaryText,
      files: [file],
    });
    return {
      mode: 'native-share',
      message: 'ເປີດໜ້າຕ່າງແບ່ງປັນແລ້ວ — ກະລຸນາເລືອກ WhatsApp ແລະ ກົດສົ່ງດ້ວຍຕົວເອງ.',
    };
  }

  triggerBlobDownload(blob, filename);
  return {
    mode: 'fallback-download',
    whatsappUrl: buildWhatsAppFallbackUrl(invoice, shopName),
    message:
      'ບຣາວເຊີນີ້ບໍ່ຮອງຮັບການແນບໄຟລ໌ໂດຍກົງຜ່ານ Web Share — ລະບົບໄດ້ດາວໂຫຼດໄຟລ໌ໄວ້ໃຫ້ແລ້ວ, ກະລຸນາເປີດ WhatsApp ແລະ ແນບໄຟລ໌ດ້ວຍຕົວເອງ.',
  };
}
