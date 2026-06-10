// ── Brand configuration ───────────────────────────────────────────────────────
// Single source of truth for all display branding.
// Import this instead of hardcoding brand strings in components.
//
// Technical identifiers (repo names, package names, API route paths, DB table
// names, env var names) are intentionally NOT changed -- only visible UI text.

export const BRAND = {
  /** Full display name used in headers, titles, documents */
  appName: 'Window World Assistant',

  /** Compact name for tight spaces (mobile header, PWA short_name) */
  shortName: 'WW Assistant',

  /** Subtitle shown under the logo and on the login screen */
  subtitle: 'Appointment Assistant',

  /** The company this software serves */
  companyName: 'Window World',

  /** Local market name -- override per tenant via DB if needed */
  marketName: 'Window World Baton Rouge',

  /** Email domain for support/calendar links */
  supportEmail: 'support@windowworldassistant.com',
} as const;
