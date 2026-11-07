STATUS: READY

# Build: Marine cargo premium quote app

## Summary
A new app, `apps/marine-cargo-quote/`, with no dependencies. `src/rating.js` holds the
tables and two pure functions: `validate(input)` returns field errors, `quote(input)`
prices a request in integer fils (sum insured = CIF + 10%, rate = base × cargo type ×
route × cover × deductible, minimum premium AED 250, policy fee AED 50, VAT 5%) or
returns a referral for the two referral rules. `src/server.js` is a thin `node:http`
server: static files from `public/` behind an extension allow-list and a containment
check, `GET /api/options`, `POST /api/quote` with a 16 KiB body limit, `GET /api/health`,
security headers on every response, and no request logging. `public/` is one form page
that fills its selects from `/api/options`, shows field errors next to their inputs, and
renders the VAT-inclusive total above the breakdown, or the referral reasons. `AGENTS.md`
now lists the app. A `Dockerfile` makes the app buildable for a Cloud Run preview later;
nothing deploys.

One commit, `Add marine cargo premium quote app`. Files:
- `apps/marine-cargo-quote/package.json` (new)
- `apps/marine-cargo-quote/src/rating.js` (new)
- `apps/marine-cargo-quote/src/server.js` (new)
- `apps/marine-cargo-quote/public/index.html`, `styles.css`, `app.js` (new)
- `apps/marine-cargo-quote/test/rating.test.js`, `server.test.js` (new)
- `apps/marine-cargo-quote/Dockerfile` (new)
- `AGENTS.md`

## Acceptance criteria
1. [x] `npm test` passes: 15 tests, 0 failures. `node --check src/*.js` prints nothing.
2. [x] `bash factory/checks.sh` exits 0 (`== apps/marine-cargo-quote`, then the test summary).
3. [x] Worked example: the `node -e` command prints `3517.5`. `test/rating.test.js` asserts
   every field: `sumInsured 1100000`, `rate 0.003`, `riskPremium 3300`, `netPremium 3300`,
   `policyFee 50`, `vat 167.5`, `total 3517.5`, `minimumApplied false`.
4. [x] Minimum premium: `quote({cargoValue:10000, …gcc, icc_c, standard})` returns
   `riskPremium 18.34`, `minimumApplied true`, `netPremium 250`, `vat 15`, `total 315`
   (checked by test and by hand with `node -e`).
5. [x] Referral: 60,000,000 → `referral: true`, one reason ending "needs an underwriter.",
   no `total`; 50,000,000 is priced. Hazardous by air → referral; hazardous by sea priced.
6. [x] `validate({cargoValue:-5, transportMode:'camel', route:'asia'})` returns exactly
   `cargoType, cargoValue, coverage, deductible, transportMode`.
7. [x] Against `PORT=5110 npm start`: the worked example POST returns 200 with
   `"total":3517.5`; `"route":"moon"` returns 400 with `fields.route` = `Choose one of: gcc,
   asia, europe, americas, africa.`; `{not json` returns 400 `Body must be valid JSON.`;
   a 20 KB body returns 413 `Request body too large.`; `GET /api/quote` returns 405 with
   `Allow: POST`.
8. [x] `curl -sI localhost:5110/` shows `Content-Type: text/html; charset=utf-8`,
   `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'self';
   frame-ancestors 'none'`. `--path-as-is localhost:5110/../package.json` prints 404.
9. [x] In a browser at 1200px and 390px: the form renders with all six fields; submitting
   the worked example shows **AED 3,517.50** as "Total payable" with the seven breakdown
   lines under it and a collapsed "How the rate was built"; clearing the cargo value and
   submitting shows "Enter the cargo value in AED as a number." under that field with a red
   border; the fine print reads "Indicative only. A bindable quotation is subject to
   underwriting and the full policy wording." At 390px the grid collapses to one column and
   nothing overflows.
10. [x] `AGENTS.md` `## Apps` lists `apps/marine-cargo-quote/` with job 001 and port 5101.
11. [x] `git diff main --stat` lists only `AGENTS.md` and files under
    `apps/marine-cargo-quote/`. `package.json` has no dependency fields.

## Validation
- `cd apps/marine-cargo-quote && npm test`: pass (15/15).
- `node --check src/*.js`: pass.
- `bash factory/checks.sh`: pass (exit 0).
- `curl` checks against `PORT=5110 npm start` (AC 7, 8): pass; server stopped afterwards.
- Browser checks at desktop and phone width (AC 9): pass.
- `git status --porcelain`: empty.

## Log
### Round 1
- Wrote `src/rating.js` first, with the tables exported and a `validate` / `quote` pair,
  doing all money in integer fils so the breakdown always sums to the total.
- Tests for the rating module, then the server, then the server itself. The 413 path
  originally destroyed the socket before the response was written, which made `fetch`
  fail in the test; it now drains the body and replies.
- Built the form page with no inline script (the CSP forbids it); selects are filled from
  `/api/options` so the labels live in one place.
- Added the `Dockerfile` (requirement 9) and the `AGENTS.md` entry (requirement 8).
- No browser automation CLI was available, so AC 9 was checked by opening the page in a
  browser at both widths.
