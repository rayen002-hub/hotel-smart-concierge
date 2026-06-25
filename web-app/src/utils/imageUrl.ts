/**
 * Resolves an event image URL to an absolute URL safe for <img src>.
 *
 * Rules:
 *  - If imageUrl is null/empty → return null (caller should show placeholder)
 *  - If imageUrl starts with http:// or https:// → already absolute (Supabase, CDN, etc.)
 *  - If imageUrl starts with /uploads/ → relative path, prepend backend base URL
 *
 * The backend base URL is derived from VITE_API_URL (stripping /api suffix).
 * Falls back to window.location.origin so it never points to localhost in production.
 */
export function resolveEventImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  // Already an absolute URL (Supabase public URL, CDN, etc.)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Relative path (/uploads/events/...) — prepend backend base URL
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const backendBase = apiUrl
    ? apiUrl.replace(/\/api\/?$/, '')           // strip trailing /api
    : window.location.origin;                   // fallback: same origin (dev proxy)

  return `${backendBase}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
