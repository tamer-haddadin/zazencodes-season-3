GATE: PASS
COMMIT: f1a74480e8792ad0263aac13bc96a36bb878f60b

`factory/checks.sh` exited 0 in 0s, after syncing with main.

```
== apps/marine-cargo-quote
✔ worked example: AED 1,000,000 general cargo by sea to Asia, ICC (A), no deductible (0.714145ms)
✔ the breakdown always adds up to the total (1.255446ms)
✔ small shipments pay the minimum premium (0.228069ms)
✔ every rating factor moves the premium in the expected direction (0.133823ms)
✔ large or unusual risks are referred instead of priced (10.199325ms)
✔ validate reports every bad field and nothing else (0.560418ms)
✔ validate rejects non-numeric values and non-objects (0.363776ms)
✔ GET / serves the quote form with security headers (19.579538ms)
✔ static assets are served and the public folder cannot be escaped (9.515314ms)
✔ GET /api/options lists the choices the form offers (2.116198ms)
✔ POST /api/quote prices a valid request (5.505841ms)
✔ POST /api/quote returns a referral for risks it cannot price (11.918153ms)
✔ POST /api/quote rejects bad input with field errors (1.673316ms)
✔ POST /api/quote rejects malformed and oversized bodies (4.738042ms)
✔ other methods and unknown routes are refused (3.22338ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 136.669051
```
