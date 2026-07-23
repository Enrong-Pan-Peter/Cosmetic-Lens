/**
 * PII minimization (improvement-plan 9.3).
 *
 * Stored feedback rows (7.3) get reviewed by a human during eval triage, so we
 * scrub obvious personal identifiers from the free text first. Deliberately
 * CONSERVATIVE — it targets only unambiguous PII (emails, phone numbers, long
 * digit runs like card/ID numbers) and never touches skincare content such as
 * concentration ranges ("0.3–0.4%") or product names. We do NOT try to redact
 * health self-disclosure ("I'm pregnant"): that's central to the very
 * pregnancy-safety feedback we want to learn from, and the app already never
 * persists the user's stored profile (allergies/pregnancy) into feedback.
 */

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// NANP-style separated phone (3-3-4). Requires digit groups, so it won't match
// "0.3 - 0.4" concentration ranges.
const PHONE_SEP = /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g;
// A run of 7+ consecutive digits (phone without separators, ids, card numbers).
const LONG_DIGITS = /\b\d{7,}\b/g;

/** Redact unambiguous PII from a string. Returns non-strings unchanged. */
export function redactPII<T>(text: T): T {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(EMAIL, '[redacted-email]')
    .replace(PHONE_SEP, '[redacted-phone]')
    .replace(LONG_DIGITS, '[redacted-number]') as unknown as T;
}
