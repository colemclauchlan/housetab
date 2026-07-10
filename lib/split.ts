/**
 * HouseTab split engine (PRD FR-6 / FR-7).
 *
 * The total of a period's bills is split **evenly** among all *active* members
 * (including the admin). Everyone owes the same base amount; any leftover cents
 * that don't divide evenly are absorbed by the admin so the shares always sum to
 * the total *exactly* — no money is created or lost to rounding.
 *
 * All amounts are integer cents (CAD). Never use floats for money.
 */

export interface SplitMember {
  /** Stable member id (uuid in the DB). */
  id: string;
  /** The admin absorbs the remainder cents. Exactly one member is the admin. */
  isAdmin: boolean;
  /** Inactive members are excluded from the split (they change the divisor). */
  active: boolean;
}

export interface MemberShare {
  memberId: string;
  amountCents: number;
  isAdmin: boolean;
}

export interface SplitResult {
  /** Echoed input total. */
  totalCents: number;
  /** Number of active members the total was divided among. */
  activeCount: number;
  /** The base even share every active member owes (before the admin's remainder). */
  perPersonCents: number;
  /** Leftover cents (0..activeCount-1) added onto the admin's share. */
  remainderCents: number;
  /** One entry per ACTIVE member, in input order. Sums exactly to totalCents. */
  shares: MemberShare[];
}

/**
 * Split `totalCents` evenly across the active members, assigning any remainder
 * cents to the admin.
 *
 * @throws if `totalCents` is not a non-negative integer, or there are no active members.
 */
export function splitEven(totalCents: number, members: SplitMember[]): SplitResult {
  if (!Number.isInteger(totalCents)) {
    throw new Error(`totalCents must be an integer number of cents, got ${totalCents}`);
  }
  if (totalCents < 0) {
    throw new Error(`totalCents must be >= 0, got ${totalCents}`);
  }

  const active = members.filter((m) => m.active);
  const activeCount = active.length;
  if (activeCount === 0) {
    throw new Error("cannot split among zero active members");
  }

  // The contract is exactly one admin (who absorbs the remainder). Zero active
  // admins is tolerated via a documented fallback below; more than one is a data
  // integrity bug we surface loudly rather than silently mis-attributing cents.
  const adminCount = active.filter((m) => m.isAdmin).length;
  if (adminCount > 1) {
    throw new Error(`expected at most one active admin, got ${adminCount}`);
  }

  const perPersonCents = Math.floor(totalCents / activeCount);
  // remainder is in [0, activeCount - 1]; equal to totalCents % activeCount.
  const remainderCents = totalCents - perPersonCents * activeCount;

  // Remainder cents go to the admin (FR-7). If there's no active admin (defensive
  // — the real admin is always active), fall back to the first active member so
  // the shares still reconcile to the total exactly.
  const adminIndex = active.findIndex((m) => m.isAdmin);
  const remainderHolderIndex = adminIndex === -1 ? 0 : adminIndex;

  const shares: MemberShare[] = active.map((m, i) => ({
    memberId: m.id,
    isAdmin: m.isAdmin,
    amountCents: perPersonCents + (i === remainderHolderIndex ? remainderCents : 0),
  }));

  return { totalCents, activeCount, perPersonCents, remainderCents, shares };
}

/** Sum of all bill amounts for a period, in integer cents. */
export function sumBillCents(bills: ReadonlyArray<{ amountCents: number }>): number {
  return bills.reduce((acc, b) => acc + b.amountCents, 0);
}
