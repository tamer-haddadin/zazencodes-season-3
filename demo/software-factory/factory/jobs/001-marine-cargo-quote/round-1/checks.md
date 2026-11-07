GATE: PASS
COMMIT: f1a74480e8792ad0263aac13bc96a36bb878f60b

`factory/checks.sh` exited 0 in 0s.

```
== apps/marine-cargo-quote
✔ worked example: AED 1,000,000 general cargo by sea to Asia, ICC (A), no deductible (0.704118ms)
✔ the breakdown always adds up to the total (0.962287ms)
✔ small shipments pay the minimum premium (0.226806ms)
✔ every rating factor moves the premium in the expected direction (0.136651ms)
✔ large or unusual risks are referred instead of priced (10.20199ms)
✔ validate reports every bad field and nothing else (0.597644ms)
✔ validate rejects non-numeric values and non-objects (0.412801ms)
✔ GET / serves the quote form with security headers (18.992687ms)
✔ static assets are served and the public folder cannot be escaped (12.404333ms)
✔ GET /api/options lists the choices the form offers (3.967402ms)
✔ POST /api/quote prices a valid request (5.597481ms)
✔ POST /api/quote returns a referral for risks it cannot price (11.6924ms)
✔ POST /api/quote rejects bad input with field errors (1.699696ms)
✔ POST /api/quote rejects malformed and oversized bodies (4.334911ms)
✔ other methods and unknown routes are refused (2.943444ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 134.240716
```
