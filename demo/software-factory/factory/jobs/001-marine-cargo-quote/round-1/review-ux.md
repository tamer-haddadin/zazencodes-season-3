VERDICT: PASS

## Findings
None.

## Notes
- Flow: a visitor lands on one page, fills six fields (five already have sensible
  defaults), presses "Get quote" and gets the total first with the breakdown under it. A
  bad field shows its message directly beneath the input and the result card hides, so
  there is no stale number next to an error. A referral replaces the price with a heading,
  the reasons and what happens next. No dead ends.
- States: the button reads "Calculating…" and disables while the request is in flight;
  network failure and an options-load failure each get a plain-language form-level
  message. The result card has `aria-live="polite"` and errors have `role="alert"`.
- Money: every amount is `AED x,xxx.xx` via `Intl.NumberFormat`; VAT (5%) and the policy
  fee are their own lines; the total is labelled "Total payable" and the lede says amounts
  include 5% VAT. The fine print carries the indicative-only wording.
- Copy: short and plain. ICC options carry a gloss ("all risks", "named perils", "major
  casualties"); the cargo value hint explains CIF and the +10%. The deductible select
  spells out the amounts.
- Accessibility: real `<label for>` on every control, `aria-invalid` toggled with the
  error, visible focus rings, a native `<details>` for the factor breakdown, logical tab
  order top to bottom.
- Mobile at 390px: the grid collapses to one column, the button goes full width, nothing
  overflows (checked by the builder's screenshot and by reading the stylesheet's
  `max-width: 520px` rule).
- Taste, not blocking: "Deductible per claim: AED 0.00" when no deductible is chosen reads
  a little odd; "None" would be friendlier. A later job could also keep the last inputs in
  the URL so brokers can share a quote.
