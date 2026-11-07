/**
 * Marine cargo premium rating.
 *
 * Pure functions, no I/O. Money is handled in fils (1 AED = 100 fils) as
 * integers so the breakdown always adds up to the total; `quote()` converts
 * back to AED with two decimals at the end.
 *
 * The rate tables below are indicative demo values, not an underwriting
 * guide. A real deployment loads them from the rating team's approved sheet.
 */

export const CURRENCY = 'AED'
export const VAT_RATE = 0.05 // UAE standard rate on general insurance
export const CIF_UPLIFT = 1.1 // market practice: sum insured = CIF value + 10%
export const MINIMUM_PREMIUM_AED = 250
export const POLICY_FEE_AED = 50
export const REFERRAL_LIMIT_AED = 50_000_000

export const BASE_RATES = {
  sea: 0.003,
  air: 0.002,
  road: 0.004,
}

export const CARGO_TYPES = {
  general: { label: 'General merchandise', factor: 1.0 },
  fragile: { label: 'Fragile goods', factor: 1.25 },
  perishable: { label: 'Perishable goods', factor: 1.4 },
  hazardous: { label: 'Hazardous goods', factor: 1.6 },
}

export const ROUTES = {
  gcc: { label: 'Within the GCC', factor: 0.9 },
  asia: { label: 'Asia', factor: 1.0 },
  europe: { label: 'Europe', factor: 1.0 },
  americas: { label: 'Americas', factor: 1.1 },
  africa: { label: 'Africa', factor: 1.2 },
}

export const COVERAGES = {
  icc_a: { label: 'ICC (A) - all risks', factor: 1.0 },
  icc_b: { label: 'ICC (B) - named perils', factor: 0.8 },
  icc_c: { label: 'ICC (C) - major casualties', factor: 0.65 },
}

export const DEDUCTIBLES = {
  none: { label: 'No deductible', amountAed: 0, factor: 1.0 },
  standard: { label: 'AED 2,500 per claim', amountAed: 2500, factor: 0.95 },
  high: { label: 'AED 10,000 per claim', amountAed: 10000, factor: 0.9 },
}

const FIELDS = {
  cargoType: CARGO_TYPES,
  transportMode: BASE_RATES,
  route: ROUTES,
  coverage: COVERAGES,
  deductible: DEDUCTIBLES,
}

/**
 * Checks a quote request. Returns an object of field -> message; it is empty
 * when the input is valid. Unknown fields are ignored.
 */
export function validate(input) {
  const errors = {}
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { input: 'Expected a JSON object.' }
  }
  const value = input.cargoValue
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.cargoValue = 'Enter the cargo value in AED as a number.'
  } else if (value <= 0) {
    errors.cargoValue = 'The cargo value must be greater than zero.'
  }
  for (const [field, table] of Object.entries(FIELDS)) {
    const choice = input[field]
    if (typeof choice !== 'string' || !Object.hasOwn(table, choice)) {
      errors[field] = `Choose one of: ${Object.keys(table).join(', ')}.`
    }
  }
  return errors
}

function toFils(aed) {
  return Math.round(aed * 100)
}

function toAed(fils) {
  return fils / 100
}

/**
 * Prices a valid request. Throws if `validate()` would report errors.
 *
 * Returns either a bindable quote with a full breakdown, or
 * `{ referral: true, reasons }` when the risk must go to an underwriter.
 */
export function quote(input) {
  const errors = validate(input)
  if (Object.keys(errors).length) {
    throw new Error(`Invalid quote request: ${JSON.stringify(errors)}`)
  }

  const reasons = []
  if (input.cargoValue > REFERRAL_LIMIT_AED) {
    reasons.push(`Cargo value above AED ${REFERRAL_LIMIT_AED.toLocaleString('en-US')} needs an underwriter.`)
  }
  if (input.cargoType === 'hazardous' && input.transportMode === 'air') {
    reasons.push('Hazardous goods by air need an underwriter.')
  }
  if (reasons.length) {
    return { currency: CURRENCY, referral: true, reasons }
  }

  const factors = {
    base: BASE_RATES[input.transportMode],
    cargoType: CARGO_TYPES[input.cargoType].factor,
    route: ROUTES[input.route].factor,
    coverage: COVERAGES[input.coverage].factor,
    deductible: DEDUCTIBLES[input.deductible].factor,
  }
  const rate = factors.base * factors.cargoType * factors.route * factors.coverage * factors.deductible

  const sumInsuredFils = toFils(input.cargoValue * CIF_UPLIFT)
  const riskPremiumFils = Math.round(sumInsuredFils * rate)
  const minimumFils = toFils(MINIMUM_PREMIUM_AED)
  const netPremiumFils = Math.max(riskPremiumFils, minimumFils)
  const policyFeeFils = toFils(POLICY_FEE_AED)
  const vatFils = Math.round((netPremiumFils + policyFeeFils) * VAT_RATE)
  const totalFils = netPremiumFils + policyFeeFils + vatFils

  return {
    currency: CURRENCY,
    referral: false,
    sumInsured: toAed(sumInsuredFils),
    rate,
    factors,
    riskPremium: toAed(riskPremiumFils),
    minimumApplied: netPremiumFils > riskPremiumFils,
    netPremium: toAed(netPremiumFils),
    policyFee: toAed(policyFeeFils),
    vat: toAed(vatFils),
    total: toAed(totalFils),
    deductibleAed: DEDUCTIBLES[input.deductible].amountAed,
  }
}
