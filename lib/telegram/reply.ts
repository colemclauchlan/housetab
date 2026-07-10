/**
 * Fallback "I've paid" detection (FR-12/FR-13): a reply to the announcement
 * containing a payment word, or a 👍/✅ reaction on it.
 */

// paid / sent / done / e-transfer(red)
const PAID_WORDS = /\b(paid|sent|done|e-?transfer(?:r?ed)?)\b/i;

// Negations and questions that flip the meaning ("who hasn't paid?", "not paid").
const NEGATION =
  /\b(not|never|no one|noone|who|whom|whose|when|how|why|haven|hasn|hadn|didn|doesn|don|isn|aren|won|wouldn|couldn|shouldn|can)\b/i;

/** Does a group reply to the announcement mean "I paid"? Rejects false positives. */
export function isPaidReply(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0) return false;
  if (t.includes("?")) return false; // questions aren't declarations
  const positive = PAID_WORDS.test(t) || t.includes("✅");
  if (!positive) return false;
  if (NEGATION.test(t)) return false;
  return true;
}

const PAID_EMOJI = new Set(["👍", "✅"]);

/** Is any of these reactions a 👍/✅? */
export function isPaidReaction(reactions: { type: string; emoji?: string }[] | undefined): boolean {
  return (reactions ?? []).some((r) => r.emoji != null && PAID_EMOJI.has(r.emoji));
}
