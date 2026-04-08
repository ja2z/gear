import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { compareMembersByLastName } from '../data/membersMockData';
import { useAuth } from './AuthContext';
import { canManageMembers } from '../utils/permissions';

const API_BASE = getApiBaseUrl();

const MembersMockContext = createContext(null);

export function MembersMockProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const canEditRoster = canManageMembers(user);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/manage/members`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API_BASE}/manage/members/roles`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([membersData, rolesData]) => {
        if (!cancelled) {
          setMembers(Array.isArray(membersData) ? membersData : []);
          setRoles(Array.isArray(rolesData) ? rolesData : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load members:', err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const listMembers = useCallback(
    (q) => {
      const term = (q || '').trim().toLowerCase();
      let list = [...members].sort(compareMembersByLastName);
      if (term) {
        list = list.filter((m) => {
          const blob = [m.firstName, m.lastName, m.email, m.role, m.memberKind]
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

  const addMember = useCallback(async ({ firstName, lastName, email, role, memberKind, dob }) => {
    const resolvedDob = memberKind === 'adult' ? '1970-01-01' : dob;
    const res = await fetch(`${API_BASE}/manage/members`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, role, dob: resolvedDob }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to add member');
    }
    const member = await res.json();
    setMembers((prev) => [...prev, member]);
    return member;
  }, []);

  const updateMember = useCallback(async (id, { firstName, lastName, email, role, memberKind, dob }) => {
    const resolvedDob = memberKind === 'adult' ? '1970-01-01' : dob;
    const res = await fetch(`${API_BASE}/manage/members/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, role, dob: resolvedDob }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to update member');
    }
    const member = await res.json();
    setMembers((prev) => prev.map((m) => (m.id === id ? member : m)));
    return member;
  }, []);

  const deleteMember = useCallback(async (id) => {
    const res = await fetch(`${API_BASE}/manage/members/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to delete member');
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({ listMembers, getMember, addMember, updateMember, deleteMember, canEditRoster, loading, roles }),
    [listMembers, getMember, addMember, updateMember, deleteMember, canEditRoster, loading, roles]
  );

  return <MembersMockContext.Provider value={value}>{children}</MembersMockContext.Provider>;
}

export function useMembersMock() {
  const ctx = useContext(MembersMockContext);
  if (!ctx) throw new Error('useMembersMock must be used within MembersMockProvider');
  return ctx;
}
