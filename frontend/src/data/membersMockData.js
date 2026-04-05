/** Mock roster constants and generator (6 adults + 7 youth — demo data). */

export const PATROL_SECTION_ORDER = ['Fox', 'Hawk', 'Raven', 'Wolf', 'Mountaineers', 'Unassigned'];

export const PATROLS = PATROL_SECTION_ORDER;

export const BSA_RANKS = [
  'Scout',
  'Tenderfoot',
  'Second Class',
  'First Class',
  'Star',
  'Life',
  'Eagle',
];

export const ADULT_LABELS = ['Uniformed leader', 'Committee', 'Parent/guardian', 'Other'];

export const MEMBER_KINDS = ['youth', 'adult'];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Taylor', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Avery', 'Jamie',
  'Chris', 'Dana', 'Emery', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jules', 'Kai', 'Logan',
  'Marley', 'Noel', 'Oakley', 'Parker', 'Reese', 'Sage', 'Skyler', 'Terry', 'Val', 'Winter',
  'Blake', 'Cameron', 'Drew', 'Ellis', 'Frankie', 'Glen', 'Hayden', 'Ira', 'Jess', 'Kelly',
];

const LAST_NAMES = [
  'Martinez', 'Kim', 'Wilson', 'Brooks', 'Nguyen', 'Chen', 'Patel', 'Garcia', 'Lee', 'Brown',
  'Davis', 'Miller', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker',
  'Hall', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Nelson', 'Carter', 'Mitchell',
  'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart',
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Mock roster sizes. */
const MOCK_ADULT_COUNT = 6;
const MOCK_YOUTH_COUNT = 7;

/** Total rows returned by generateMockRoster (guards against accidental duplicates). */
export const MOCK_ROSTER_TOTAL = MOCK_ADULT_COUNT + MOCK_YOUTH_COUNT;

/**
 * Small demo roster (6 adults + 7 scouts). First adult is Admin, second is QM; youth rotate patrols.
 */
export function generateMockRoster() {
  const usedNames = new Set();
  function uniqueFullName(i) {
    let name;
    let guard = 0;
    do {
      name = `${randomPick(FIRST_NAMES)} ${randomPick(LAST_NAMES)}`;
      if (guard++ > 500) {
        name = `Member ${i}`;
        break;
      }
    } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  }

  const members = [];
  const now = new Date().toISOString();

  for (let i = 0; i < MOCK_ADULT_COUNT; i++) {
    let adultLabel = 'Other';
    if (i < 1) adultLabel = 'Uniformed leader';
    else if (i < 2) adultLabel = 'Committee';
    else if (i < 4) adultLabel = 'Parent/guardian';

    let appRole = 'Basic';
    if (i === 0) appRole = 'Admin';
    else if (i < 2) appRole = 'QM';

    members.push({
      id: crypto.randomUUID(),
      fullName: uniqueFullName(i),
      email: `adult.${i + 1}@troop222.example.com`,
      role: appRole,
      memberKind: 'adult',
      patrol: null,
      rank: null,
      adultLabel,
      createdAt: now,
      updatedAt: now,
    });
  }

  const rotating = ['Fox', 'Hawk', 'Raven', 'Wolf', 'Mountaineers'];
  for (let j = 0; j < MOCK_YOUTH_COUNT; j++) {
    // ~1 unassigned of 7 (similar to 8/50), rest rotate patrols
    const patrol = j < 1 ? 'Unassigned' : rotating[(j - 1) % rotating.length];
    const rankIdx = j % BSA_RANKS.length;
    members.push({
      id: crypto.randomUUID(),
      fullName: uniqueFullName(MOCK_ADULT_COUNT + j),
      email: `scout.${j + 1}@troop222.example.com`,
      role: 'Basic',
      memberKind: 'youth',
      patrol,
      rank: BSA_RANKS[rankIdx],
      adultLabel: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return members.slice(0, MOCK_ROSTER_TOTAL);
}

export function defaultPatrolForYouth() {
  return 'Fox';
}

export function defaultRankForYouth() {
  return 'Scout';
}

export function defaultAdultLabel() {
  return 'Parent/guardian';
}

/** Last word of full name — simple roster sort (works for "First Last"). */
function lastNameKey(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  return parts[parts.length - 1];
}

/** Sort by family name, then full name for ties. */
export function compareMembersByLastName(a, b) {
  const la = lastNameKey(a.fullName);
  const lb = lastNameKey(b.fullName);
  const c = la.localeCompare(lb, undefined, { sensitivity: 'base' });
  if (c !== 0) return c;
  return String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, { sensitivity: 'base' });
}

/**
 * Build section list for grouped view: Adults first, then each patrol (youth only).
 */
export function buildGroupedSections(membersList) {
  const list = [...membersList];
  const adults = list.filter((m) => m.memberKind === 'adult').sort(compareMembersByLastName);
  const sections = [{ key: 'adults', title: 'Adults', members: adults }];
  for (const p of PATROL_SECTION_ORDER) {
    const inPatrol = list
      .filter((m) => m.memberKind === 'youth' && (m.patrol || 'Unassigned') === p)
      .sort(compareMembersByLastName);
    if (inPatrol.length === 0) continue;
    const title = p === 'Unassigned' ? 'Unassigned youth' : `${p} Patrol`;
    sections.push({ key: `patrol-${p}`, title, members: inPatrol });
  }
  return sections;
}
