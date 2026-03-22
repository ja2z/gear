/**
 * Parse cost from Google Sheets cells, SQLite, or API payloads.
 * Handles currency strings like "$0.01", "1,234.56", and plain numbers.
 * @returns {number|null} finite number, or null if empty/invalid
 */
function parseCostFromRaw(raw) {
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

/** Round to cents for storage/API consistency */
function normalizeCost(raw) {
  const n = parseCostFromRaw(raw);
  if (n === null) return null;
  return Math.round(n * 100) / 100;
}

module.exports = { parseCostFromRaw, normalizeCost };
