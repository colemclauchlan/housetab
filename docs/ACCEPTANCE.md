# ACCEPTANCE.md — MVP acceptance run (PRD §9, AC-1…AC-8)

Run this once the bot is live (token set, webhook registered, bot in a test group with Cole +
at least one other Telegram account). Check each box and paste evidence (screenshot link / note).

**Prereqs:** M1.5 deploy done · M2.2 token + group confirmed · linking message posted · at least
2 members linked.

- [ ] **AC-1** — Admin logs in on phone, enters 4 bills in < 2 min, sees the correct even split
      (verify against hand-calc incl. cent-rounding).
      _Evidence:_
- [ ] **AC-2** — Clicking Announce posts the formatted breakdown + inline button into the real
      group within 5 s.
      _Evidence:_
- [ ] **AC-3** — A linked member taps the button → flips to paid in < 3 s: private toast shown,
      their ⬜ becomes ✅ on the message, dashboard updates. Unlinked tapper gets a helpful
      toast; double-tap says "already marked".
      _Evidence:_
- [ ] **AC-4** — Member-linking flow: a fresh member taps their name once and is permanently
      linked.
      _Evidence:_
- [ ] **AC-5** — Dashboard shows paid/unpaid with method + timestamp; manual override works and
      the chat message reflects it.
      _Evidence:_
- [ ] **AC-6** — "Remind unpaid" posts a message mentioning only the unpaid members. (M4.1)
      _Evidence:_
- [ ] **AC-7** — Webhook rejects calls without the correct secret token; duplicate `update_id`s
      are processed once. _(secret 401 + dedupe already covered by unit tests in M2.1; confirm
      live.)_
      _Evidence:_
- [ ] **AC-8** — All CI checks pass; zero secrets in the repo; `.env.example` complete; README
      has the full setup runbook. _(CI green; `.env.example` present; README runbook in M4.6.)_
      _Evidence:_

> Notes / issues found during the run:
