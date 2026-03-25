import { ExpiryStatus } from '../models/inventory-item.model';

/**
 * Parse a yyyy-MM-dd string into a local Date (no timezone shift).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month as number) - 1, day as number);
}

/** Return today's date at midnight (local time). */
export function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Difference in whole calendar days: a − b.
 *  Uses UTC-based calculation to avoid DST ambiguities. */
export function diffDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const expiry = parseLocalDate(expiryDate);
  const today = todayDate();
  const diff = diffDays(expiry, today);
  if (diff < 0) return ExpiryStatus.Expired;
  if (diff <= 7) return ExpiryStatus.ExpiringSoon;
  return ExpiryStatus.Normal;
}

export function isExpired(expiryDate: string): boolean {
  return getExpiryStatus(expiryDate) === ExpiryStatus.Expired;
}

export function isExpiringSoon(expiryDate: string): boolean {
  return getExpiryStatus(expiryDate) === ExpiryStatus.ExpiringSoon;
}

/** Format yyyy-MM-dd to a human-readable string, e.g. "23. März 2026". */
export function formatDisplayDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a Date object to yyyy-MM-dd. */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

