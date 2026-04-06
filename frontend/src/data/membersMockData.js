/** Member roster utilities. */

/** Sort by last name, then full name for ties. */
export function compareMembersByLastName(a, b) {
  const la = String(a.lastName || '').trim();
  const lb = String(b.lastName || '').trim();
  const c = la.localeCompare(lb, undefined, { sensitivity: 'base' });
  if (c !== 0) return c;
  return String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, { sensitivity: 'base' });
}

/**
 * Build section list for grouped view: Adults first, then Youth.
 * memberKind is pre-computed on each member by the backend (based on DOB).
 */
export function buildGroupedSections(membersList) {
  const list = [...membersList];
  const adults = list.filter((m) => m.memberKind === 'adult').sort(compareMembersByLastName);
  const youth = list.filter((m) => m.memberKind === 'youth').sort(compareMembersByLastName);
  const sections = [];
  if (adults.length > 0) sections.push({ key: 'adults', title: 'Adults', members: adults });
  if (youth.length > 0) sections.push({ key: 'youth', title: 'Youth', members: youth });
  return sections;
}
