export const inr = (n) => {
  return '₹' + Math.round(n).toLocaleString('en-IN');
};

export const TODAY = '15 July 2026';

/** Aadhaar: 1234 5678 9012 */
export const formatAadhaar = (value) => {
  if (!value || value === '—') return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
};

/** PAN: ABCDE1234F */
export const formatPan = (value) => {
  if (!value || value === '—') return '';
  return String(value)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
};

/** Mobile: +91 98765 43210 */
export const formatMobile = (value) => {
  if (!value || value === '—') return '';

  let digits = String(value).replace(/\D/g, '');

  // Strip country code when present (+91 / 91)
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('91') && digits.length >= 3 && /^91[6-9]/.test(digits)) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 10);
  if (!digits) return '';

  const local =
    digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;

  return `+91 ${local}`;
};

export const displayAadhaar = (value) => {
  if (!value || value === '—') return '—';
  const trimmed = String(value).trim();
  if (/^XXXX\sXXXX\s\d{4}$/i.test(trimmed)) return trimmed;
  return formatAadhaar(trimmed) || '—';
};

export const displayPan = (value) => {
  if (!value || value === '—') return '—';
  const trimmed = String(value).trim().toUpperCase();
  if (/^[A-Z]{5}[•*]{4}[A-Z]$/.test(trimmed)) return trimmed;
  return formatPan(trimmed) || '—';
};

export const displayMobile = (value) => formatMobile(value) || '—';
