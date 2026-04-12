/**
 * Normalize role for UI gating. Prefer `role_id` when present (matches backend auth);
 * then roles.name from API (Admin / QM / Basic).
 */
function effectiveRole(user) {
  if (!user) return null;
  const id = user.role_id != null ? Number(user.role_id) : null;
  if (id === 1) return 'Admin';
  if (id === 2) return 'QM';
  if (id === 3) return 'Basic';
  if (user.role != null && user.role !== '') return user.role;
  return 'Admin';
}

export function canCheckout(user)        { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canCheckin(user)         { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canManageInventory(user) { const r = effectiveRole(user); return r === 'Admin' || r === 'QM'; }
export function canManageMembers(user)   { return effectiveRole(user) === 'Admin'; }
