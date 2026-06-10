// ─────────────────────────────────────────────────────────────────────────────
// phoneUtils.ts — Phone normalization, SMS link building, platform detection
// Used by the "Text Customer" action in AppointmentDetailPage.
// Does NOT send SMS automatically. Only builds links and copies text.
// ─────────────────────────────────────────────────────────────────────────────

export interface PhoneResult {
  isValid: boolean;
  displayPhone: string; // formatted for display e.g. (225) 328-2500
  smsPhone: string;     // stripped for sms: URI e.g. +12253282500
  error?: string;
}

/**
 * Strip all non-digit characters except a leading '+'.
 */
function digitsOnly(raw: string): string {
  return raw.replace(/[^\d+]/g, '');
}

/**
 * Format a 10-digit number as (NXX) NXX-XXXX.
 */
function formatUS(digits10: string): string {
  return `(${digits10.slice(0, 3)}) ${digits10.slice(3, 6)}-${digits10.slice(6)}`;
}

/**
 * Normalize a raw phone string into a validated, display-friendly, and
 * sms-link-safe representation.
 *
 * Accepted formats:
 *   225-328-2500 / (225) 328-2500 / 225.328.2500 / +12253282500 / 2253282500
 *
 * Returns:
 *   { isValid, displayPhone, smsPhone, error }
 *
 * Does NOT mutate saved customer data.
 */
export function normalizePhoneForSms(raw: string | null | undefined): PhoneResult {
  if (!raw || raw.trim() === '') {
    return { isValid: false, displayPhone: '', smsPhone: '', error: 'missing' };
  }

  const cleaned = digitsOnly(raw.trim());

  // Handle +1XXXXXXXXXX (11 digits starting with +1 or 1)
  let digits10 = cleaned;
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    digits10 = cleaned.slice(2);
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    digits10 = cleaned.slice(1);
  } else if (cleaned.startsWith('+') && !cleaned.startsWith('+1')) {
    // International number — preserve as-is
    if (cleaned.length < 7) {
      return { isValid: false, displayPhone: raw, smsPhone: '', error: 'invalid' };
    }
    return {
      isValid: true,
      displayPhone: raw.trim(),
      smsPhone: cleaned, // keep the + prefix
      error: undefined,
    };
  }

  if (digits10.length !== 10) {
    return {
      isValid: false,
      displayPhone: raw.trim(),
      smsPhone: '',
      error: digits10.length < 10 ? 'too_short' : 'too_long',
    };
  }

  // Validate NXX area code (first digit can't be 0 or 1)
  if (digits10[0] === '0' || digits10[0] === '1') {
    return { isValid: false, displayPhone: raw.trim(), smsPhone: '', error: 'invalid' };
  }

  return {
    isValid: true,
    displayPhone: formatUS(digits10),
    smsPhone: `+1${digits10}`,
    error: undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS link builder
// ─────────────────────────────────────────────────────────────────────────────

export interface SmsLinkOptions {
  phone: string;  // already-normalized smsPhone (+1XXXXXXXXXX)
  body?: string;  // optional pre-populated message body
}

/**
 * Detect the OS so we can pick the correct SMS body separator.
 * iOS uses  &body=   Android uses  ?body=
 * On desktop we skip the body parameter entirely (no support).
 */
export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Build a platform-safe sms: URI.
 *
 * - iOS:     sms:+1XXXXXXXXXX&body=...
 * - Android: sms:+1XXXXXXXXXX?body=...
 * - Desktop: sms:+1XXXXXXXXXX  (no body — browser support is absent)
 *
 * Always provide a copy-message fallback for desktop.
 */
export function buildSmsLink({ phone, body }: SmsLinkOptions): string {
  const platform = detectPlatform();
  if (!body || platform === 'desktop') {
    return `sms:${phone}`;
  }
  const encoded = encodeURIComponent(body);
  if (platform === 'ios') {
    return `sms:${phone}&body=${encoded}`;
  }
  // Android
  return `sms:${phone}?body=${encoded}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default message template
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageTemplateVars {
  customerFirstName: string;
  repName: string;
  address: string;
}

export function buildDefaultSmsMessage({ customerFirstName, repName, address }: MessageTemplateVars): string {
  return `Hi ${customerFirstName}, this is ${repName} with Window World. I'm following up about your appointment at ${address}. Let me know when you have a minute.`;
}
