import type { LineItem } from '../types/invoice';

/**
 * Normalizes a numeric input into a safe non-negative integer for LAK currency.
 */
export function toIntegerLAK(value: number | string): number {
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : value;
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

/**
 * Normalizes a quantity into a safe non-negative integer.
 */
export function toIntegerQuantity(value: number | string): number {
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : value;
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

/**
 * Deterministic integer line total calculation in LAK.
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  const q = toIntegerQuantity(quantity);
  const p = toIntegerLAK(unitPrice);
  const total = q * p;
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Line total exceeds safe integer range');
  }
  return total;
}

/**
 * Deterministic integer grand total across line items.
 */
export function calculateGrandTotal(items: ReadonlyArray<Pick<LineItem, 'quantity' | 'unitPrice'>>): number {
  let sum = 0;
  for (const item of items) {
    sum += calculateLineTotal(item.quantity, item.unitPrice);
  }
  if (!Number.isSafeInteger(sum)) {
    throw new RangeError('Grand total exceeds safe integer range');
  }
  return sum;
}

/**
 * Formats an integer LAK amount with thousand separators (e.g., 8,880,000).
 */
export function formatLAK(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(safe);
}

/**
 * Formats an integer LAK amount with the Lao Kip symbol (e.g., 8,880,000 ₭).
 */
export function formatLAKWithSymbol(amount: number, symbol = '₭'): string {
  return `${formatLAK(amount)} ${symbol}`;
}

/**
 * Formats a YYYY-MM-DD date string to DD/MM/YYYY as used on the original paper invoice.
 */
export function formatDateDMY(isoDate: string): string {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Formats sequential invoice number with optional prefix and zero-padding (e.g., 000001).
 */
export function formatInvoiceNumber(seq: number, prefix = '', digits = 6): string {
  const safeSeq = Math.max(1, Math.floor(Number.isFinite(seq) ? seq : 1));
  const safeDigits = Math.max(1, Math.min(12, Math.floor(Number.isFinite(digits) ? digits : 6)));
  return `${prefix}${String(safeSeq).padStart(safeDigits, '0')}`;
}

/**
 * Returns local today's date as YYYY-MM-DD.
 */
export function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a unique local entity ID.
 */
export function createEntityId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
