function effectiveRole(user) {
  if (!user) return null;
  return user.role ?? 'Admin';
}

export function canCheckout(user)        { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canCheckin(user)         { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canManageInventory(user) { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canManageMembers(user)   { return effectiveRole(user) === 'Admin'; }
