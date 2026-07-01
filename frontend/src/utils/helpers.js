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

export const compressImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!file || file.type === 'application/pdf') {
      return resolve(file);
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
