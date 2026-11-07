VERDICT: PASS

## Findings
None.

## Notes
- Input: `validate()` runs on every `POST /api/quote` before `quote()`; unknown fields are
  ignored, `cargoValue` must be a finite number > 0, and each choice field is checked with
  `Object.hasOwn` against its table, so a prototype-polluting key like `__proto__` is
  rejected. Bodies are capped at 16 KiB by both `Content-Length` and streamed size, and the
  413 is sent over the open connection rather than by destroying the socket.
- Customer data: nothing about a request is logged. The only `console.log` is the listen
  message. No persistence, no outbound calls.
- Static files: `serveStatic` resolves against `PUBLIC_DIR`, requires the resolved path to
  start with `PUBLIC_DIR + '/'`, and only serves `.html/.css/.js/.svg`, so `/../package.json`
  and `/%2e%2e/package.json` are 404 (covered by a test). `nosniff`, `no-referrer` and a
  `default-src 'self'; frame-ancestors 'none'` CSP go on every response, including errors.
- XSS: the page has no inline script. `app.js` builds the result with template strings, but
  every interpolated value is a number formatted by `Intl.NumberFormat`, a label from the
  server's own tables, or a referral reason the server composes from constants. No user
  string is ever placed in the DOM. If a later job echoes user input (a reference, a name),
  it must use `textContent`.
- Money: all arithmetic is in integer fils with `Math.round`; the client never sends a price.
  Referral rules are enforced in `quote()` on the server.
- Abuse: no rate limit. The spec puts it out of scope and the body limit bounds request cost,
  so this is a note, not a finding. Add one before exposing the app publicly.
- Secrets and dependencies: none. `package.json` has no dependency fields; the `Dockerfile`
  pins `node:22-alpine` and runs as `node`.
