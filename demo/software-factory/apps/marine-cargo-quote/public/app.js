const form = document.getElementById('quote-form')
const result = document.getElementById('result')
const submit = document.getElementById('submit')
const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 })
const percent = (rate) => `${(rate * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%`

function fillSelect(name, table) {
  const select = form.elements[name]
  for (const [value, { label }] of Object.entries(table)) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    select.append(option)
  }
}

async function loadOptions() {
  const res = await fetch('/api/options')
  const options = await res.json()
  for (const name of ['transportMode', 'cargoType', 'route', 'coverage', 'deductible']) {
    fillSelect(name, options[name])
  }
}

function showErrors(fields = {}, formMessage = '') {
  for (const el of form.querySelectorAll('[data-error-for]')) {
    const name = el.dataset.errorFor
    const message = name === 'form' ? formMessage : fields[name] || ''
    el.textContent = message
    const input = form.elements[name]
    if (input) {
      input.setAttribute('aria-invalid', message ? 'true' : 'false')
    }
  }
}

function row(label, value, cls = '') {
  return `<div class="row ${cls}"><dt>${label}</dt><dd>${value}</dd></div>`
}

function renderQuote(q) {
  if (q.referral) {
    result.innerHTML = `
      <h2>Referred to an underwriter</h2>
      <p>We can't price this shipment automatically.</p>
      <ul>${q.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>
      <p class="hint">An underwriter will review the request and come back with terms.</p>`
    return
  }
  const factors = [
    ['Base rate', percent(q.factors.base)],
    ['Cargo type', `x ${q.factors.cargoType}`],
    ['Route', `x ${q.factors.route}`],
    ['Cover', `x ${q.factors.coverage}`],
    ['Deductible', `x ${q.factors.deductible}`],
  ]
  result.innerHTML = `
    <h2>Indicative premium</h2>
    <p class="total"><span>Total payable</span><strong>${aed.format(q.total)}</strong></p>
    <dl class="breakdown">
      ${row('Sum insured (CIF + 10%)', aed.format(q.sumInsured))}
      ${row('Applied rate', percent(q.rate))}
      ${row('Risk premium', aed.format(q.riskPremium))}
      ${q.minimumApplied ? row('Minimum premium applied', aed.format(q.netPremium), 'note') : ''}
      ${row('Net premium', aed.format(q.netPremium))}
      ${row('Policy fee', aed.format(q.policyFee))}
      ${row('VAT (5%)', aed.format(q.vat))}
      ${row('Deductible per claim', aed.format(q.deductibleAed))}
    </dl>
    <details>
      <summary>How the rate was built</summary>
      <dl class="breakdown small">${factors.map(([k, v]) => row(k, v)).join('')}</dl>
    </details>`
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  showErrors()
  const data = Object.fromEntries(new FormData(form))
  const payload = { ...data, cargoValue: data.cargoValue === '' ? undefined : Number(data.cargoValue) }
  submit.disabled = true
  submit.textContent = 'Calculating…'
  try {
    const res = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) {
      showErrors(body.fields, body.fields ? '' : body.error)
      result.hidden = true
      return
    }
    renderQuote(body)
    result.hidden = false
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch {
    showErrors({}, 'We could not reach the quote service. Try again.')
  } finally {
    submit.disabled = false
    submit.textContent = 'Get quote'
  }
})

loadOptions().catch(() => showErrors({}, 'We could not load the form options. Reload the page.'))
