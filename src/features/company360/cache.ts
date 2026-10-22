/**
 * Rules for the Company 360 profile cache (table companyProfileCache), shared by Company 360 and
 * AI Priorities so both agree on when a saved profile can be reused without calling Apollo.
 */

/** After this many days a profile is rebuilt from fresh Apollo data. */
export const PROFILE_MAX_AGE_DAYS = 7;

/** Bump when the way profiles are built changes, so cached ones are rebuilt instead of showing old numbers. */
export const PROFILE_VERSION = 6;

export function isFreshProfile(data: { profileVersion?: number } | null | undefined, updatedAt: Date): boolean {
  return data?.profileVersion === PROFILE_VERSION && Date.now() - updatedAt.getTime() < PROFILE_MAX_AGE_DAYS * 86400000;
}
