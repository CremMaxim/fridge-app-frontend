import { ExpiryStatus } from '../models/inventory-item.model';
import {
  diffDays,
  formatDisplayDate,
  getExpiryStatus,
  parseLocalDate,
  toDateStr,
  todayDate,
} from './date.utils';

describe('date utils', () => {
  // ─── parseLocalDate ───────────────────────────────────────────────────
  describe('parseLocalDate', () => {
    it('should parse yyyy-MM-dd into a local Date', () => {
      const d = parseLocalDate('2026-03-23');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2); // 0-based
      expect(d.getDate()).toBe(23);
    });
  });

  // ─── toDateStr ────────────────────────────────────────────────────────
  describe('toDateStr', () => {
    it('should format a Date to yyyy-MM-dd', () => {
      expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  // ─── diffDays ─────────────────────────────────────────────────────────
  describe('diffDays', () => {
    it('should return positive when a is after b', () => {
      const a = new Date(2026, 0, 10);
      const b = new Date(2026, 0, 5);
      expect(diffDays(a, b)).toBe(5);
    });

    it('should return negative when a is before b', () => {
      const a = new Date(2026, 0, 1);
      const b = new Date(2026, 0, 5);
      expect(diffDays(a, b)).toBe(-4);
    });

    it('should return 0 for the same day', () => {
      const d = new Date(2026, 5, 15);
      expect(diffDays(d, d)).toBe(0);
    });
  });

  // ─── getExpiryStatus ──────────────────────────────────────────────────
  describe('getExpiryStatus', () => {
    it('should return Expired for a date in the past', () => {
      expect(getExpiryStatus('2020-01-01')).toBe(ExpiryStatus.Expired);
    });

    it('should return Expired for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getExpiryStatus(toDateStr(yesterday))).toBe(ExpiryStatus.Expired);
    });

    it('should return ExpiringSoon for today', () => {
      expect(getExpiryStatus(toDateStr(todayDate()))).toBe(ExpiryStatus.ExpiringSoon);
    });

    it('should return ExpiringSoon for a date exactly 7 days from today', () => {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      expect(getExpiryStatus(toDateStr(in7))).toBe(ExpiryStatus.ExpiringSoon);
    });

    it('should return Normal for a date 8 days from today', () => {
      const in8 = new Date();
      in8.setDate(in8.getDate() + 8);
      expect(getExpiryStatus(toDateStr(in8))).toBe(ExpiryStatus.Normal);
    });

    it('should return Normal for a date far in the future', () => {
      expect(getExpiryStatus('2099-12-31')).toBe(ExpiryStatus.Normal);
    });
  });

  // ─── formatDisplayDate ────────────────────────────────────────────────
  describe('formatDisplayDate', () => {
    it('should produce a human-readable date string', () => {
      const result = formatDisplayDate('2026-03-23');
      // e.g. "23 Mar 2026" – just assert it contains the year and day
      expect(result).toContain('2026');
      expect(result).toContain('23');
    });
  });
});

