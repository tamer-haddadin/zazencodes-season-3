# Marine cargo premium quote app

> Feature: Marine cargo premium quote micro-app: a form for cargo value, transport mode, cargo type, route, ICC cover and deductible that returns an indicative AED premium with a VAT-inclusive breakdown

## Context

The repo has no apps yet: `apps/` does not exist and the `## Apps` list in
`AGENTS.md` reads `(none yet)`. This job creates the first one, so there is no
sibling to mirror; the structure comes from the "App conventions" section of
`AGENTS.md`:

- `apps/marine-cargo-quote/package.json` with `"type": "module"`,
  `"engines": { "node": ">=20" }`, `npm test` → `node --test`, `npm start` →
  `node src/server.js`. No dependencies.
- `src/rating.js`: the pure rating module (no I/O), fully unit-tested.
- `src/server.js`: a thin `node:http` server with a `default-src 'self'` CSP.
- `public/index.html`, `public/styles.css`, `public/app.js`: the form. No
  inline scripts.
- `test/*.test.js` with `node:test` and `node:assert/strict`, servers on port 0.

The money rules in `AGENTS.md` apply in full: AED, integer fils arithmetic,
5% VAT as its own line, VAT-inclusive totals, indicative-only wording, referral
instead of silent fallback, no logging of quote inputs.

`factory/checks.sh` runs `node --check src/*.js` and `npm test` in every
`apps/*/`, so the new app is gated automatically.

## Requirements

1. **Inputs.** A quote request is a JSON object with six fields:
   `cargoValue` (number, AED, > 0), `transportMode` (`sea` | `air` | `road`),
   `cargoType` (`general` | `fragile` | `perishable` | `hazardous`), `route`
   (`gcc` | `asia` | `europe` | `americas` | `africa`), `coverage` (`icc_a` |
   `icc_b` | `icc_c`) and `deductible` (`none` | `standard` | `high`).
   `validate(input)` returns `{ field: message }` for every bad field and `{}`
   when valid; a non-object input returns `{ input: ... }`.
2. **Rating formula**, in `src/rating.js`, with the tables exported so the
   server and tests share them:
   - Sum insured = `cargoValue` × 1.10 (CIF + 10%).
   - Rate = base rate by transport mode (sea 0.30%, air 0.20%, road 0.40%) ×
     cargo type factor (general 1.00, fragile 1.25, perishable 1.40, hazardous
     1.60) × route factor (gcc 0.90, asia 1.00, europe 1.00, americas 1.10,
     africa 1.20) × cover factor (ICC (A) 1.00, ICC (B) 0.80, ICC (C) 0.65) ×
     deductible factor (none 1.00, standard AED 2,500 0.95, high AED 10,000
     0.90).
   - Risk premium = sum insured × rate; net premium = max(risk premium,
     minimum premium AED 250); policy fee AED 50; VAT = 5% of (net premium +
     fee); total = net premium + fee + VAT.
   - All amounts are computed in integer fils with `Math.round` and returned in
     AED with at most two decimals, so `netPremium + policyFee + vat === total`
     to the fil.
3. **Referral.** When `cargoValue` > AED 50,000,000, or `cargoType` is
   `hazardous` and `transportMode` is `air`, `quote()` returns
   `{ currency: 'AED', referral: true, reasons: [...] }` with one plain-English
   reason per rule and no amounts.
4. **Quote shape.** Otherwise `quote()` returns `currency`, `referral: false`,
   `sumInsured`, `rate`, `factors` (base, cargoType, route, coverage,
   deductible), `riskPremium`, `minimumApplied`, `netPremium`, `policyFee`,
   `vat`, `total` and `deductibleAed`. It throws if `validate()` reports errors.
5. **HTTP.** `src/server.js` exports `createServer()` and, when run directly,
   listens on `$PORT` (default 5101):
   - `GET /` serves `public/index.html`; `GET /<file>` serves `public/` files
     by an allow-list of extensions (html, css, js, svg) and never a path
     outside `public/`.
   - `GET /api/options` returns the tables with labels, for the form.
   - `POST /api/quote` reads a JSON body of at most 16 KiB; replies 400 with
     `{ error, fields }` for validation errors or malformed JSON, 413 when the
     body is too large, 405 with an `Allow: POST` header for other methods, and
     200 with the quote otherwise.
   - `GET /api/health` returns `{ ok: true }`. Unknown paths return 404 JSON.
   - Every response carries `X-Content-Type-Options: nosniff`,
     `Referrer-Policy: no-referrer` and
     `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`.
   - Nothing about a request body is logged.
6. **Form.** `public/index.html` is a single page: a cargo value input and five
   selects filled from `/api/options`, a submit button, field-level error
   lines tied to their inputs, a result card with the VAT-inclusive total
   first and the breakdown lines under it, a referral state listing the
   reasons, and fine print saying the quote is indicative only. Works at phone
   width. Visible focus styles and `aria-live` on the result.
7. **Tests.** `test/rating.test.js` covers the worked example, the breakdown
   summing to the total, the minimum premium, every factor's direction, both
   referral rules and validation. `test/server.test.js` starts the server on
   port 0 and covers the HTML and headers, static-file containment, options,
   a priced quote, a referral, field errors, malformed and oversized bodies,
   and method/path handling.
8. **Docs.** Replace `- (none yet)` under `## Apps` in `AGENTS.md` with an entry
   for `apps/marine-cargo-quote/` that names the job and the default port.
9. **Cloud Run readiness, no deploy.** Add a `Dockerfile` (`node:22-alpine`,
   runs `node src/server.js` as `node`, exposes 8080) so a later integration can
   build a preview revision. Nothing in this job deploys anything.

## Acceptance criteria

1. `cd apps/marine-cargo-quote && npm test` passes with no failures, and
   `node --check src/*.js` prints nothing.
2. `bash factory/checks.sh` from the project folder exits 0.
3. Worked example: with
   `{ cargoValue: 1000000, transportMode: 'sea', cargoType: 'general', route: 'asia', coverage: 'icc_a', deductible: 'none' }`,
   `quote()` returns `sumInsured 1100000`, `rate 0.003`, `riskPremium 3300`,
   `netPremium 3300`, `policyFee 50`, `vat 167.5`, `total 3517.5`,
   `minimumApplied false`. Verified by a test and by
   `node -e "import('./src/rating.js').then(m => console.log(m.quote({cargoValue:1000000,transportMode:'sea',cargoType:'general',route:'asia',coverage:'icc_a',deductible:'none'}).total))"`
   printing `3517.5`.
4. Minimum premium: `cargoValue 10000, route 'gcc', coverage 'icc_c', deductible 'standard'`
   (sea, general) gives `riskPremium` below 250, `minimumApplied true`,
   `netPremium 250`, `vat 15`, `total 315`.
5. `cargoValue 60000000` returns `referral: true` with one reason mentioning
   an underwriter and no `total`; `cargoValue 50000000` is priced. Hazardous
   by air returns a referral; hazardous by sea is priced.
6. `validate({ cargoValue: -5, transportMode: 'camel', route: 'asia' })` returns
   errors for exactly `cargoValue`, `transportMode`, `cargoType`, `coverage`
   and `deductible`.
7. With the server on a port, `curl -s -X POST localhost:$PORT/api/quote -H 'content-type: application/json' -d '<worked example>'`
   returns 200 with `"total":3517.5`; a body with `"route":"moon"` returns 400
   with `fields.route`; `{not json` returns 400; a 20 KB body returns 413;
   `GET /api/quote` returns 405 with `Allow: POST`.
8. `curl -sI localhost:$PORT/` shows `text/html`, `nosniff` and the CSP header.
   `curl -s -o /dev/null -w '%{http_code}' localhost:$PORT/../package.json`
   prints 404.
9. Opening `/` in a browser at desktop and phone width shows the form; a
   submission with the worked example shows **AED 3,517.50** as the total with
   the breakdown lines (sum insured, rate, risk premium, net premium, policy
   fee, VAT (5%), deductible) under it; an empty cargo value shows an error
   under that field; the fine print says the quote is indicative only.
10. `AGENTS.md` lists `apps/marine-cargo-quote/` under `## Apps`.
11. `git diff main --stat` touches only `apps/marine-cargo-quote/**` and
    `AGENTS.md`; `package.json` has no `dependencies` or `devDependencies`.

## Out of scope

- Saving quotes, customer details, or any persistence.
- Authentication, rate limiting, or a quote reference number.
- Multi-leg routes, storage extensions, war and strikes clauses, or
  per-conveyance limits.
- Arabic copy (a separate backlog item).
- Deploying anywhere, or any CI configuration.
- A shared design system; this is the first app, so its stylesheet becomes the
  reference for later ones.

## Assumptions

- **The rate tables, minimum premium, policy fee and referral limits above are
  indicative demo values.** They make the worked example come out to round
  numbers and follow the shape of a typical cargo tariff; an underwriter must
  replace them. This is a pricing decision for the approver to escalate.
- **Sum insured is CIF + 10%.** Common market practice for cargo cover; the
  form explains it in a hint.
- **VAT is 5% on premium plus fee.** UAE standard rate on general insurance,
  shown as its own line and included in the total.
- **Referral rules are the two above.** Enough to show the path; real rules
  would come from the underwriting guide.
- **No rate limit.** The app is internal-facing for now and the body limit
  bounds the cost of a request; noted for the security reviewer.
- **Labels are English only** and avoid jargon where possible; ICC options
  carry a short gloss in their label.
