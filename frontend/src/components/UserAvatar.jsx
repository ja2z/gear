/**
 * Initials avatar for the header when no profile photo URL exists from the API.
 */
const UserAvatar = ({ user, className = '' }) => {
  const first = user?.first_name?.trim()?.[0] ?? '';
  const last = user?.last_name?.trim()?.[0] ?? '';
  let initials = `${first}${last}`.toUpperCase();
  if (!initials && user?.email) {
    initials = user.email[0].toUpperCase();
  }
  if (!initials) initials = '?';

  const label =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Signed-in user';

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-scout-blue/20 bg-scout-blue/10 text-[13px] font-bold uppercase tracking-tight text-scout-blue/70 shadow-sm sm:h-11 sm:w-11 sm:text-sm ${className}`}
      role="img"
      aria-label={label}
    >
      {initials.slice(0, 2)}
    </div>
  );
};

export default UserAvatar;
