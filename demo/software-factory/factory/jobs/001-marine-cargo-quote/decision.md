ESCALATE

## Why
The build is complete and correct: every acceptance criterion is met with evidence I could
reproduce, the round-1 gate passed, all four reviews are `VERDICT: PASS` with only taste
notes, and `git merge-tree --write-tree main factory/001-marine-cargo-quote` is clean. I am
escalating because the branch sets prices. The rate tables, minimum premium, policy fee,
referral limits and the CIF + 10% basis in `src/rating.js` are the spec's own indicative
values (Assumptions, first bullet), and a number that reaches a customer is a human's call,
not mine.

## Acceptance criteria
1. `npm test` and `node --check`: met. I ran both in the worktree: 15 passing, no output from
   the syntax check.
2. `factory/checks.sh` exits 0: met, per round-1/checks.md and my own run.
3. Worked example totals 3,517.50: met. I recomputed it by hand and ran the `node -e` line
   from the spec, which printed `3517.5`.
4. Minimum premium case totals 315: met, asserted in `rating.test.js` and recomputed.
5. Referral rules: met, both rules and both boundary cases are tested.
6. `validate` field set: met, tested.
7. HTTP status codes and errors: met, each case has a test in `server.test.js` and build.md
   shows the `curl` output.
8. Security headers and path containment: met, tested and shown in build.md.
9. Browser behaviour at desktop and phone width: met, per build.md; I did not open a
   browser myself, and the UX and UI reviews both confirm it.
10. `AGENTS.md` lists the app: met, in the diff.
11. Diff scope and no dependencies: met. `git diff main --stat` shows `AGENTS.md` and
    `apps/marine-cargo-quote/**` only; `package.json` has no dependency fields.

## For the human
Sign off on the numbers in `apps/marine-cargo-quote/src/rating.js`, or tell the builder what
to change with `factory rework 001-marine-cargo-quote "<note>"`:

- Base rates: sea 0.30%, air 0.20%, road 0.40% of the sum insured.
- Relativities: cargo type 1.00 / 1.25 / 1.40 / 1.60; route 0.90 / 1.00 / 1.00 / 1.10 / 1.20;
  cover ICC (A) 1.00, (B) 0.80, (C) 0.65; deductible 1.00 / 0.95 / 0.90.
- Minimum premium AED 250, policy fee AED 50, VAT 5% on premium plus fee.
- Sum insured = CIF + 10%.
- Referral above AED 50,000,000 or for hazardous goods by air.

Also confirm the customer-facing wording in `public/index.html`: the lede, the CIF hint and
the "Indicative only…" fine print.

If the numbers are acceptable as a demo tariff, merge with
`factory approve 001-marine-cargo-quote`. Files: `apps/marine-cargo-quote/src/rating.js`,
`apps/marine-cargo-quote/public/index.html`, `factory/jobs/001-marine-cargo-quote/spec.md`.
