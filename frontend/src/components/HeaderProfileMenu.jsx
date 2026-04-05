import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

/**
 * Avatar in the top-right of `.header` / TroopBrandHeader; opens a menu with Sign out.
 */
export default function HeaderProfileMenu({ className = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  if (!user) {
    return <div className={`h-10 w-10 shrink-0 ${className}`} aria-hidden />;
  }

  return (
    <div className={`relative z-[60] shrink-0 ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="touch-target flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scout-blue/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <UserAvatar user={user} className="!shadow-none" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.25rem)] min-w-[11rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100"
          >
            <LogOut className="h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
