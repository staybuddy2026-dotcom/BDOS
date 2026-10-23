/**
 * Helper to ensure meeting URLs always navigate to a valid, live destination.
 * If the link is empty or contains known test/dummy codes (like abc-defg-hij or xxx-yyyy-zzz),
 * it defaults to Google Meet's instant room generator ('https://meet.google.com/new'),
 * which immediately provisions an active video call for signed-in users.
 */
export const DEFAULT_MEET_URL = 'https://meet.google.com/new';

export function sanitizeMeetingUrl(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim()) {
    return DEFAULT_MEET_URL;
  }

  let url = rawUrl.trim();

  // If user pasted without protocol, prepend https://
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Detect dummy placeholder codes and example links
  const isPlaceholder =
    /abc-defg-hij|xxx-yyyy-zzz|example\.com|meet\.google\.com\/(placeholder|test|dummy|abc$)/i.test(url);

  if (isPlaceholder) {
    return DEFAULT_MEET_URL;
  }

  return url;
}
