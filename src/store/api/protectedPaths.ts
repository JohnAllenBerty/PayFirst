// Central list & helper for protected API endpoints.
// These endpoints require an authenticated token and should be suppressed while the auth modal is open.
// Keep this list focused on endpoints that act on the current user account or private resources.

const EXACT_PROTECTED = [
  '/profile',
  '/meta',
  '/change_password',
  // Summary is namespaced under /user but listed for clarity
  '/user/summary',
];

// Prefixes that indicate a protected resource collection
const PREFIX_PROTECTED = [
  '/user/contact-groups',
  '/user/contact',
  '/user/transaction',
  '/user/repayment',
  '/user/payment_method',
  '/user/payment_source',
  '/user/import_contacts',
  '/user/summary', // (also in exact list)
];

// Public endpoints (explicit allow list)
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/signup',
  '/forgot_password',
  '/reset_password',
  '/verify-email', // verification via emailed token can be done unauthenticated
  '/resend_email', // requesting verification email
]);

export function isProtectedPath(raw: string | undefined): boolean {
  if (!raw) return false;
  let path = raw.trim();
  // Normalize relative URLs (strip query params & trailing slashes for matching)
  try {
    // Remove origin if accidentally included
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    if (origin && path.startsWith(origin)) path = path.slice(origin.length);
  } catch { /* noop */ }
  // Strip query string & hash
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = '/' + path;
  if (PUBLIC_PATHS.has(path)) return false;
  if (EXACT_PROTECTED.includes(path)) return true;
  return PREFIX_PROTECTED.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}

export const PROTECTED_PATHS = { EXACT_PROTECTED, PREFIX_PROTECTED, PUBLIC_PATHS };