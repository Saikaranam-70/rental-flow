import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';

export const fmt = (n) =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'); }
  catch { return '—'; }
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy, hh:mm a'); }
  catch { return '—'; }
};

export const fmtRelative = (d) => {
  if (!d) return '—';
  try { return formatDistanceToNow(typeof d === 'string' ? parseISO(d) : d, { addSuffix: true }); }
  catch { return '—'; }
};

export const daysBetween = (a, b) => {
  try { return differenceInDays(new Date(b), new Date(a)); }
  catch { return 0; }
};

export const overdueDays = (expectedReturn) => {
  const days = daysBetween(expectedReturn, new Date());
  return Math.max(0, days);
};

export const getStatusBadgeClass = (status) => ({
  active: 'badge-active',
  overdue: 'badge-overdue',
  returned: 'badge-returned',
  cancelled: 'badge-returned',
  available: 'badge-available',
  rented: 'badge-rented',
  maintenance: 'badge-maintenance',
  retired: 'badge-retired',
}[status] || 'badge-returned');

export const getTierColor = (tier) => ({
  platinum: 'text-purple-600 bg-purple-50',
  gold: 'text-yellow-600 bg-yellow-50',
  silver: 'text-gray-500 bg-gray-100',
  new: 'text-blue-600 bg-blue-50',
}[tier] || 'text-gray-500 bg-gray-100');

export const getTierLabel = (tier) => ({
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  new: 'New',
}[tier] || 'New');

export const getInitials = (name) =>
  (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

export const categoryIcon = (cat) => ({
  bike: 'Bike',
  scooter: 'Compass',
  car: 'Car',
  cycle: 'Bike',
  auto: 'Truck',
  truck: 'Truck',
  equipment: 'Wrench',
  other: 'Package',
}[cat] || 'Package');

export const categoryLabel = (cat) => ({
  bike: 'Bike', scooter: 'Scooter', car: 'Car',
  cycle: 'Cycle', auto: 'Auto', truck: 'Truck',
  equipment: 'Equipment', other: 'Other',
}[cat] || cat);

export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';
