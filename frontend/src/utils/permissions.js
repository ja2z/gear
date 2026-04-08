function effectiveRole(user) {
  if (!user) return null;
  return user.role ?? 'admin';
}

export function canCheckout(user)        { const r = effectiveRole(user); return r === 'admin' || r === 'qm'; }
export function canCheckin(user)         { const r = effectiveRole(user); return r === 'admin' || r === 'qm'; }
export function canManageInventory(user) { const r = effectiveRole(user); return r === 'admin' || r === 'qm'; }
export function canManageMembers(user)   { return effectiveRole(user) === 'admin'; }
