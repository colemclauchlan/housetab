import { describe, it, expect, vi, type Mock } from "vitest";
import { handlePaidCallback, type PaidDeps } from "@/lib/telegram/paid";
import type { TgCallbackQuery } from "@/lib/telegram/updates";

function makeCbq(fromId = 500, messageId: number | undefined = 42): TgCallbackQuery {
  return {
    id: "cbq1",
    from: { id: fromId },
    data: "paid",
    message: messageId != null ? { message_id: messageId, chat: { id: -100 } } : undefined,
  };
}

function makeDeps(
  overrides: Partial<PaidDeps> = {},
): PaidDeps & { answerCallback: Mock; onPaid: Mock } {
  return {
    getMemberByTelegramId: vi.fn().mockResolvedValue({ id: "m1", name: "Jake" }),
    getPeriodByAnnounceMessage: vi.fn().mockResolvedValue({ id: "p1" }),
    markPaid: vi.fn().mockResolvedValue("paid"),
    answerCallback: vi.fn().mockResolvedValue(undefined),
    onPaid: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as PaidDeps & { answerCallback: Mock; onPaid: Mock };
}

describe("handlePaidCallback", () => {
  it("marks a linked member paid and toasts thanks", async () => {
    const deps = makeDeps();
    const res = await handlePaidCallback(makeCbq(), deps);
    expect(res.outcome).toBe("paid");
    expect(deps.markPaid).toHaveBeenCalledWith("p1", "m1");
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("Thanks Jake"),
    );
    expect(deps.onPaid).toHaveBeenCalledWith("p1");
  });

  it("prompts an unlinked tapper to link first", async () => {
    const deps = makeDeps({ getMemberByTelegramId: vi.fn().mockResolvedValue(null) });
    const res = await handlePaidCallback(makeCbq(), deps);
    expect(res.outcome).toBe("unlinked");
    expect(deps.answerCallback).toHaveBeenCalledWith("cbq1", expect.stringContaining("link first"));
    expect(deps.markPaid).not.toHaveBeenCalled();
  });

  it("says 'already marked' on a duplicate tap and does not refresh", async () => {
    const deps = makeDeps({ markPaid: vi.fn().mockResolvedValue("already") });
    const res = await handlePaidCallback(makeCbq(), deps);
    expect(res.outcome).toBe("already");
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("Already marked"),
    );
    expect(deps.onPaid).not.toHaveBeenCalled();
  });

  it("handles an announcement with no matching period", async () => {
    const deps = makeDeps({ getPeriodByAnnounceMessage: vi.fn().mockResolvedValue(null) });
    const res = await handlePaidCallback(makeCbq(), deps);
    expect(res.outcome).toBe("no-period");
    expect(deps.markPaid).not.toHaveBeenCalled();
  });

  it("handles a tapper with no share in this period", async () => {
    const deps = makeDeps({ markPaid: vi.fn().mockResolvedValue("no-share") });
    const res = await handlePaidCallback(makeCbq(), deps);
    expect(res.outcome).toBe("no-share");
    expect(deps.onPaid).not.toHaveBeenCalled();
  });
});
