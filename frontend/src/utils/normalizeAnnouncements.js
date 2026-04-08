/**
 * Normalizes GET /announcements (when implemented) or [] on 404.
 * Expected shape from API: { items: [...] } or a bare array.
 * Each item: { id, subject, snippet?, receivedAt, from? }
 */
export function normalizeAnnouncements(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : raw.items;
  if (!Array.isArray(arr)) return [];
  return arr.map((a, i) => ({
    id: a.id != null ? String(a.id) : `ann-${i}`,
    subject: (a.subject && String(a.subject).trim()) || 'Message',
    snippet: (a.snippet || a.bodySnippet || a.preview || '').trim(),
    receivedAt: a.receivedAt || a.created_at || a.sentAt || null,
    from: (a.from || a.fromAddress || '').trim(),
  }));
}
