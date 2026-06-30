const COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
];

function initials(firstName, lastName, email) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
}

function colorFor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ user, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.first_name || user.email}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  const label = initials(user.first_name, user.last_name, user.email);
  const color = colorFor(user.email || user.id?.toString() || '');

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {label}
    </div>
  );
}
