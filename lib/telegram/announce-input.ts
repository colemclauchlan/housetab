import { splitEven, sumBillCents } from "@/lib/split";
import type { AnnouncementInput } from "@/lib/telegram/announce";

export interface AssembleArgs {
  periodLabel: string;
  bills: { type: string; label: string | null; amount_cents: number }[];
  /** Active members in display order (admin first). */
  activeMembers: { id: string; name: string; is_admin: boolean }[];
  paidMemberIds: Set<string>;
  banner?: string;
}

/**
 * Pure assembly of the announcement input from period data — the even split over
 * active members plus each member's paid flag. Shared by the Announce action and
 * the live refresher so they can never drift. Throws (via splitEven) on 0 active
 * members or >1 admin.
 */
export function buildAnnouncementInput(args: AssembleArgs): AnnouncementInput {
  const totalCents = sumBillCents(args.bills.map((b) => ({ amountCents: b.amount_cents })));
  const preview = splitEven(
    totalCents,
    args.activeMembers.map((m) => ({ id: m.id, isAdmin: m.is_admin, active: true })),
  );
  const amountByMember = new Map(preview.shares.map((s) => [s.memberId, s.amountCents]));

  return {
    periodLabel: args.periodLabel,
    bills: args.bills.map((b) => ({ type: b.type, label: b.label, amountCents: b.amount_cents })),
    totalCents,
    perPersonCents: preview.perPersonCents,
    activeCount: preview.activeCount,
    members: args.activeMembers.map((m) => ({
      name: m.name,
      amountCents: amountByMember.get(m.id) ?? 0,
      isAdmin: m.is_admin,
      paid: args.paidMemberIds.has(m.id),
    })),
    banner: args.banner,
  };
}
