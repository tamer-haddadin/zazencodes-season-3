import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MINIMUM_PREMIUM_AED, POLICY_FEE_AED, quote, validate } from '../src/rating.js'

const base = {
  cargoValue: 1_000_000,
  transportMode: 'sea',
  cargoType: 'general',
  route: 'asia',
  coverage: 'icc_a',
  deductible: 'none',
}

test('worked example: AED 1,000,000 general cargo by sea to Asia, ICC (A), no deductible', () => {
  const q = quote(base)
  assert.equal(q.referral, false)
  assert.equal(q.currency, 'AED')
  assert.equal(q.sumInsured, 1_100_000)
  assert.equal(q.rate, 0.003)
  assert.equal(q.riskPremium, 3300)
  assert.equal(q.minimumApplied, false)
  assert.equal(q.netPremium, 3300)
  assert.equal(q.policyFee, 50)
  assert.equal(q.vat, 167.5)
  assert.equal(q.total, 3517.5)
})

test('the breakdown always adds up to the total', () => {
  for (const cargoValue of [1234.56, 99_999.99, 7_777_777]) {
    for (const coverage of ['icc_a', 'icc_b', 'icc_c']) {
      const q = quote({ ...base, cargoValue, coverage, cargoType: 'fragile', deductible: 'standard' })
      assert.equal(Math.round((q.netPremium + q.policyFee + q.vat) * 100), Math.round(q.total * 100))
      assert.equal(q.total, Number(q.total.toFixed(2)))
    }
  }
})

test('small shipments pay the minimum premium', () => {
  const q = quote({ ...base, cargoValue: 10_000, route: 'gcc', coverage: 'icc_c', deductible: 'standard' })
  assert.equal(q.sumInsured, 11_000)
  assert.ok(q.riskPremium < MINIMUM_PREMIUM_AED)
  assert.equal(q.minimumApplied, true)
  assert.equal(q.netPremium, MINIMUM_PREMIUM_AED)
  assert.equal(q.policyFee, POLICY_FEE_AED)
  assert.equal(q.vat, 15)
  assert.equal(q.total, 315)
})

test('every rating factor moves the premium in the expected direction', () => {
  const sea = quote(base).netPremium
  assert.ok(quote({ ...base, transportMode: 'air' }).netPremium < sea)
  assert.ok(quote({ ...base, transportMode: 'road' }).netPremium > sea)
  assert.ok(quote({ ...base, cargoType: 'hazardous' }).netPremium > sea)
  assert.ok(quote({ ...base, route: 'gcc' }).netPremium < sea)
  assert.ok(quote({ ...base, route: 'africa' }).netPremium > sea)
  assert.ok(quote({ ...base, coverage: 'icc_c' }).netPremium < quote({ ...base, coverage: 'icc_b' }).netPremium)
  assert.ok(quote({ ...base, deductible: 'high' }).netPremium < quote({ ...base, deductible: 'standard' }).netPremium)
})

test('large or unusual risks are referred instead of priced', () => {
  const big = quote({ ...base, cargoValue: 60_000_000 })
  assert.equal(big.referral, true)
  assert.equal(big.reasons.length, 1)
  assert.match(big.reasons[0], /underwriter/)
  assert.equal(big.total, undefined)

  const hazmatAir = quote({ ...base, cargoType: 'hazardous', transportMode: 'air' })
  assert.equal(hazmatAir.referral, true)
  assert.match(hazmatAir.reasons[0], /Hazardous goods by air/)

  assert.equal(quote({ ...base, cargoValue: 50_000_000 }).referral, false)
})

test('validate reports every bad field and nothing else', () => {
  assert.deepEqual(validate(base), {})
  const errors = validate({ cargoValue: -5, transportMode: 'camel', route: 'asia' })
  assert.deepEqual(Object.keys(errors).sort(), ['cargoType', 'cargoValue', 'coverage', 'deductible', 'transportMode'])
  assert.match(errors.cargoValue, /greater than zero/)
  assert.match(errors.transportMode, /sea, air, road/)
})

test('validate rejects non-numeric values and non-objects', () => {
  assert.match(validate({ ...base, cargoValue: '1000' }).cargoValue, /as a number/)
  assert.match(validate({ ...base, cargoValue: Infinity }).cargoValue, /as a number/)
  assert.deepEqual(validate(null), { input: 'Expected a JSON object.' })
  assert.deepEqual(validate([base]), { input: 'Expected a JSON object.' })
  assert.throws(() => quote({ ...base, cargoValue: 0 }), /Invalid quote request/)
})
