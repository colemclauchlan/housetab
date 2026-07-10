import type { TgCallbackQuery } from "@/lib/telegram/updates";

const LINK_PREFIX = "link:";

export interface LinkableMember {
  id: string;
  name: string;
}

/** Build the one-time setup message + inline keyboard (2 names per row). */
export function buildLinkingMessage(members: LinkableMember[]): {
  text: string;
  reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] };
} {
  const buttons = members.map((m) => ({ text: m.name, callback_data: `${LINK_PREFIX}${m.id}` }));
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return {
    text: "👋 Tap your name once to link your Telegram account to HouseTab:",
    reply_markup: { inline_keyboard: rows },
  };
}

/** Extract the member id from a `link:<id>` callback, or null. */
export function parseLinkData(data: string | undefined): string | null {
  if (!data || !data.startsWith(LINK_PREFIX)) return null;
  const id = data.slice(LINK_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

export interface LinkDeps {
  /** The member currently linked to this Telegram user, if any. */
  getMemberByTelegramId(tgUserId: number): Promise<{ id: string; name: string } | null>;
  /** The target member (to check existence + whether already claimed). */
  getMember(
    memberId: string,
  ): Promise<{ id: string; name: string; telegram_user_id: number | null } | null>;
  /**
   * Atomically claim the member for this Telegram user: link only if still
   * unclaimed. Returns true on success, false if it was claimed first (race).
   */
  linkMember(memberId: string, tgUserId: number): Promise<boolean>;
  /** Answer the callback query with a private toast. */
  answerCallback(callbackQueryId: string, text: string): Promise<void>;
}

export type LinkOutcome = "linked" | "already-linked" | "taken" | "invalid" | "member-missing";

export interface LinkResult {
  outcome: LinkOutcome;
  memberId?: string;
  memberName?: string;
}

/**
 * Handle a member tapping their name button (FR-22). First-come-first-served and
 * idempotent: each tap answers with a private toast, and re-taps / claimed names
 * produce clear messages rather than double-linking.
 */
export async function handleLinkCallback(
  cbq: TgCallbackQuery,
  deps: LinkDeps,
): Promise<LinkResult> {
  const memberId = parseLinkData(cbq.data);
  if (!memberId) {
    await deps.answerCallback(cbq.id, "Sorry — that button is no longer valid.");
    return { outcome: "invalid" };
  }
  const tgUserId = cbq.from.id;

  // Already linked (to this or another member)?
  const existing = await deps.getMemberByTelegramId(tgUserId);
  if (existing) {
    const msg =
      existing.id === memberId
        ? `You're already linked as ${existing.name} ✅`
        : `You're already linked as ${existing.name}. Ask the admin to change it.`;
    await deps.answerCallback(cbq.id, msg);
    return { outcome: "already-linked", memberId: existing.id, memberName: existing.name };
  }

  const member = await deps.getMember(memberId);
  if (!member) {
    await deps.answerCallback(cbq.id, "That member was removed — ask the admin.");
    return { outcome: "member-missing" };
  }
  if (member.telegram_user_id != null) {
    await deps.answerCallback(cbq.id, `${member.name} is already claimed — ask the admin.`);
    return { outcome: "taken", memberId: member.id, memberName: member.name };
  }

  const claimed = await deps.linkMember(memberId, tgUserId);
  if (!claimed) {
    await deps.answerCallback(cbq.id, `${member.name} was just claimed — ask the admin.`);
    return { outcome: "taken", memberId: member.id, memberName: member.name };
  }

  await deps.answerCallback(cbq.id, `Linked you as ${member.name} ✅`);
  return { outcome: "linked", memberId: member.id, memberName: member.name };
}
