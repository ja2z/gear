/**
 * Parse cost from API / form (currency strings, commas, plain numbers).
 * @returns {number|null}
 */
export function parseCostFromRaw(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const s = String(raw).trim();
  if (s === '') return null;
  const cleaned = s.replace(/[$€£\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Value for controlled number input (empty string when no cost).
 */
export function costToFormString(raw) {
  const n = parseCostFromRaw(raw);
  if (n === null) return '';
  const cents = Math.round(n * 100);
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}
