import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import {
  generateMockRoster,
  PATROLS,
  BSA_RANKS,
  ADULT_LABELS,
  defaultPatrolForYouth,
  defaultRankForYouth,
  defaultAdultLabel,
  compareMembersByLastName,
} from '../data/membersMockData';

const APP_ROLES = ['Admin', 'QM', 'Basic'];
const MEMBER_KINDS = ['youth', 'adult'];

const STORAGE_ROSTER_DATA = 'membersMockRosterData';
/** Bump when mock size/shape changes — forces fresh seed and drops oversized legacy caches. */
const STORAGE_ROSTER_VERSION = 'membersMockDataVersion';
const CURRENT_ROSTER_VERSION = '5';

function normalizeAppRole(role) {
  const r = role && String(role).trim();
  return APP_ROLES.includes(r) ? r : 'Basic';
}

function normalizeMemberKind(k) {
  const v = k && String(k).trim();
  return MEMBER_KINDS.includes(v) ? v : 'adult';
}

function loadInitialMembers() {
  try {
    const v = sessionStorage.getItem(STORAGE_ROSTER_VERSION);
    if (v !== CURRENT_ROSTER_VERSION) {
      const fresh = generateMockRoster();
      sessionStorage.setItem(STORAGE_ROSTER_VERSION, CURRENT_ROSTER_VERSION);
      sessionStorage.setItem(STORAGE_ROSTER_DATA, JSON.stringify(fresh));
      return fresh;
    }
    const raw = sessionStorage.getItem(STORAGE_ROSTER_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Drop legacy ~150-row caches from older builds; keep normal edits (e.g. 20 + a few adds)
        if (parsed.length > 100) {
          const fresh = generateMockRoster();
          sessionStorage.setItem(STORAGE_ROSTER_DATA, JSON.stringify(fresh));
          return fresh;
        }
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  const fresh = generateMockRoster();
  try {
    sessionStorage.setItem(STORAGE_ROSTER_VERSION, CURRENT_ROSTER_VERSION);
    sessionStorage.setItem(STORAGE_ROSTER_DATA, JSON.stringify(fresh));
  } catch {
    /* ignore */
  }
  return fresh;
}

const MembersMockContext = createContext(null);

export function MembersMockProvider({ children }) {
  const [members, setMembers] = useState(loadInitialMembers);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_ROSTER_DATA, JSON.stringify(members));
    } catch {
      /* ignore */
    }
  }, [members]);

  const canEditRoster = true;

  const listMembers = useCallback(
    (q) => {
      const term = (q || '').trim().toLowerCase();
      let list = [...members].sort(compareMembersByLastName);
      if (term) {
        list = list.filter((m) => {
          const blob = [
            m.fullName,
            m.email,
            m.patrol,
            m.rank,
            m.adultLabel,
            m.memberKind,
            m.role,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return blob.includes(term);
        });
      }
      return list;
    },
    [members]
  );

  const getMember = useCallback((id) => members.find((m) => m.id === id) || null, [members]);

  const addMember = useCallback(
    ({
      fullName,
      email,
      role,
      memberKind,
      patrol,
      rank,
      adultLabel,
    }) => {
      const name = (fullName || '').trim();
      if (!name) {
        throw new Error('fullName is required');
      }
      const kind = normalizeMemberKind(memberKind);
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        fullName: name,
        email: (email || '').trim(),
        role: normalizeAppRole(role),
        memberKind: kind,
        patrol: kind === 'youth' ? (patrol || defaultPatrolForYouth()) : null,
        rank: kind === 'youth' ? (rank || defaultRankForYouth()) : null,
        adultLabel: kind === 'adult' ? adultLabel || defaultAdultLabel() : null,
        createdAt: now,
        updatedAt: now,
      };
      if (kind === 'youth' && !PATROLS.includes(row.patrol)) {
        row.patrol = 'Unassigned';
      }
      if (kind === 'youth' && !BSA_RANKS.includes(row.rank)) {
        row.rank = defaultRankForYouth();
      }
      if (kind === 'adult' && row.adultLabel && !ADULT_LABELS.includes(row.adultLabel)) {
        row.adultLabel = defaultAdultLabel();
      }
      setMembers((prev) => [...prev, row]);
      return row;
    },
    []
  );

  const updateMember = useCallback((id, payload) => {
    const name = (payload.fullName || '').trim();
    if (!name) {
      throw new Error('fullName is required');
    }
    setMembers((prev) => {
      const i = prev.findIndex((m) => m.id === id);
      if (i === -1) return prev;
      const cur = prev[i];
      const kind = payload.memberKind !== undefined ? normalizeMemberKind(payload.memberKind) : cur.memberKind;
      const next = {
        ...cur,
        fullName: name,
        updatedAt: new Date().toISOString(),
      };
      if (payload.email !== undefined) next.email = String(payload.email).trim();
      if (payload.role !== undefined && payload.role !== null) next.role = normalizeAppRole(payload.role);
      next.memberKind = kind;
      if (kind === 'youth') {
        next.patrol =
          payload.patrol !== undefined ? payload.patrol || 'Unassigned' : cur.patrol || defaultPatrolForYouth();
        next.rank = payload.rank !== undefined ? payload.rank || defaultRankForYouth() : cur.rank || defaultRankForYouth();
        next.adultLabel = null;
        if (!PATROLS.includes(next.patrol)) next.patrol = 'Unassigned';
        if (!BSA_RANKS.includes(next.rank)) next.rank = defaultRankForYouth();
      } else {
        next.patrol = null;
        next.rank = null;
        next.adultLabel =
          payload.adultLabel !== undefined
            ? payload.adultLabel || defaultAdultLabel()
            : cur.adultLabel || defaultAdultLabel();
        if (next.adultLabel && !ADULT_LABELS.includes(next.adultLabel)) {
          next.adultLabel = defaultAdultLabel();
        }
      }
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      listMembers,
      getMember,
      addMember,
      updateMember,
      deleteMember,
      canEditRoster,
    }),
    [listMembers, getMember, addMember, updateMember, deleteMember]
  );

  return <MembersMockContext.Provider value={value}>{children}</MembersMockContext.Provider>;
}

export function useMembersMock() {
  const ctx = useContext(MembersMockContext);
  if (!ctx) {
    throw new Error('useMembersMock must be used within MembersMockProvider');
  }
  return ctx;
}
