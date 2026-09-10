import { revalidatePath } from 'next/cache';

/**
 * Safely trigger Next.js cache revalidation.
 * Suppresses static generation store errors when executed outside HTTP request contexts (e.g. CLI / unit tests).
 */
export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore missing static store in non-HTTP contexts
  }
}
