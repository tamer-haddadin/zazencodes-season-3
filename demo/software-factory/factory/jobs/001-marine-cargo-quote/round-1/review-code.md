VERDICT: PASS

## Checks
cd apps/marine-cargo-quote && npm test: pass (15 tests, 0 failures)
node --check src/*.js: pass
bash factory/checks.sh: pass (same result as round-1/checks.md)

## Findings
None.

## Notes
- Correctness: I recomputed the worked example by hand. Sum insured 1,000,000 × 1.1 =
  1,100,000.00; rate 0.003; risk premium 3,300.00; above the 250 minimum; fee 50; VAT
  5% × 3,350 = 167.50; total 3,517.50. Matches the test and the spec. The minimum-premium
  case gives 11,000 × 0.00166725 = 18.34 (rounded in fils), lifted to 250, VAT 15, total 315.
- Money handling is right: `toFils` rounds once at the input, every subsequent step is
  integer arithmetic, and the "breakdown sums to total" test runs across three values and
  three covers. `rate` is returned as a float for display only; nothing is derived from it
  downstream.
- Tests cover every acceptance criterion that can be a test (AC 1 and 3–8). AC 9 (browser)
  and AC 10–11 (docs, diff scope) are evidenced in build.md. No test is skipped or
  special-cased.
- Simplicity: the server is one `createServer` with four routes and one static handler;
  `readJsonBody` handles both the `Content-Length` fast path and streamed overflow. No
  speculative options. `OPTIONS` is built once at module load from the rating tables, so
  labels have one source of truth.
- Conventions: ES modules, no semicolons, single quotes, 2-space indent, trailing commas,
  pure module plus thin server, `node:test` with servers on port 0, as AGENTS.md asks.
  Comment density matches the guidance (intent and constraints only).
- Docs: `AGENTS.md` gets the app entry with the job id and default port.
- Commit: one commit, `Add marine cargo premium quote app`, nothing stray. `package.json`
  has no dependency fields.
- Minor, non-blocking: `OPTIONS.transportMode` labels are derived by capitalising the key
  (`Sea`, `Air`, `Road`). Fine for three keys; if the table grows, give it labels like the
  other tables.
