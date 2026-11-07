# AGENTS.md

Repo instructions for every agent that works here, including the factory's
spec-writer, builder, reviewers and approver. Nothing in `.claude/` is
repo-specific; it all comes from this file.

## What this repo is

Internal micro-apps for a UAE insurtech: marine cargo, general liability and
claims tooling. Each app is small, self-contained and stands on its own under
`apps/<name>/`. Customers and brokers use some of them directly, so they must
be plain, fast and correct about money.

## Layout

```
AGENTS.md                this file
apps/<name>/             one micro-app per folder (see "App conventions")
factory/                 the software factory: runner, backlog, dashboard, job folders
.claude/                 factory skill and agents
```

## Toolchain

- Node 20 or newer (22 is what the apps are developed on). No other runtime.
- Python 3.10+ is only needed for `factory/bin/factory` and the dashboard server.
- There is no package manager step: apps use the Node standard library only.
  Adding a dependency is a decision for a human, so the approver escalates it.

## App conventions

Every `apps/<name>/` has:

- `package.json` with `"type": "module"`, `"engines": { "node": ">=20" }` and two
  scripts: `npm test` (runs `node --test`) and `npm start` (starts the server on
  `$PORT`, with a fixed default port noted in the app's `src/server.js`).
- `src/` for the code, split into a pure module with the business rules (no
  I/O, fully unit-tested) and a thin `server.js` built on `node:http`.
- `public/` for the browser side: one `index.html`, one stylesheet, one script.
  No inline scripts; the server sends a `default-src 'self'` CSP.
- `test/` with `*.test.js` files using `node:test` and `node:assert/strict`.
  Tests start servers on port 0, never on a fixed port.

Code style: ES modules, 2-space indent, no semicolons, single quotes, trailing
commas on multi-line literals. Comments explain intent and constraints, not
what the code does. Match the neighbouring code.

## Money and insurance rules

- Currency is AED. Amounts are shown with two decimals (fils). Do arithmetic in
  integer fils and convert at the edge, so breakdowns add up to totals.
- UAE VAT on general insurance is 5%, applied to premium plus fees, and shown as
  its own line. Totals are always VAT-inclusive and labelled as such.
- Rating tables (base rates, relativities, minimum premiums, fees, referral
  limits) are indicative demo values. Changing one is a pricing decision: the
  factory's approver must escalate it to a human.
- Quotes are indicative, never bindable. Copy must say so.
- Anything that cannot be priced automatically is a referral to an underwriter,
  with the reasons listed, never a silent fallback.
- Never log request bodies, quote inputs or anything that could describe a
  customer or a shipment. Validate all input server-side and return field-level
  errors.

## Validation commands

Run from an app folder:

```bash
npm test                 # unit and HTTP tests, must pass
node --check src/*.js    # syntax check
PORT=5101 npm start      # dev server for manual checks
```

`factory/checks.sh` runs the tests of every app and is what the factory's gate
executes. Keep it green.

## Docs to update with a change

- A new app: add it to the list below.
- A new rating input or table: update the app's `README.md` if it has one, and
  mention the change in the spec's Assumptions so the approver can escalate it.

## Apps

- `apps/marine-cargo-quote/`: indicative single-transit marine cargo premium
  quote (job 001). Default dev port 5101.
