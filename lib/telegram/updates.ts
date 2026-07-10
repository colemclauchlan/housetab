/**
 * Minimal structural types for the Telegram updates HouseTab cares about, plus
 * helpers to pull the chat id out of any update and classify its kind. We type
 * only the fields we read (Telegram sends far more).
 */

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface TgChat {
  id: number;
  type?: string;
  title?: string;
}

export interface TgMessage {
  message_id?: number;
  chat?: TgChat;
  from?: TgUser;
  text?: string;
  reply_to_message?: TgMessage;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
}

export interface TgChatMemberUpdated {
  chat?: TgChat;
  from?: TgUser;
}

export interface TgMessageReaction {
  chat?: TgChat;
  user?: TgUser;
  new_reaction?: { type: string; emoji?: string }[];
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  channel_post?: TgMessage;
  callback_query?: TgCallbackQuery;
  my_chat_member?: TgChatMemberUpdated;
  chat_member?: TgChatMemberUpdated;
  message_reaction?: TgMessageReaction;
}

/** The update kinds we branch on, in priority order. */
const UPDATE_KINDS = [
  "callback_query",
  "message",
  "edited_message",
  "channel_post",
  "my_chat_member",
  "chat_member",
  "message_reaction",
] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];

/** Classify an update by its first recognised field (for the events.type column). */
export function classifyUpdate(update: TgUpdate): UpdateKind | "unknown" {
  for (const kind of UPDATE_KINDS) {
    if (update[kind] != null) return kind;
  }
  return "unknown";
}

/** Extract the chat id from any update shape, or null if none is present. */
export function extractChatId(update: TgUpdate): number | null {
  const chat =
    update.message?.chat ??
    update.edited_message?.chat ??
    update.channel_post?.chat ??
    update.callback_query?.message?.chat ??
    update.my_chat_member?.chat ??
    update.chat_member?.chat ??
    update.message_reaction?.chat;
  return chat?.id ?? null;
}
