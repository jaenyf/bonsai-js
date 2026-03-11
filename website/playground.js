import { bonsai } from './bonsai.bundle.js'
import { strings, arrays, math, types, dates } from './stdlib.bundle.js'

// Initialize evaluator with all stdlib plugins
const expr = bonsai()
expr.use(strings)
expr.use(arrays)
expr.use(math)
expr.use(types)
expr.use(dates)

// ── Example presets ──────────────────────────────────────────
// Each example stores context as structured vars: [{ name, value }]
const examples = {
  hello: {
    expression: '"hello" |> upper',
    vars: [],
  },
  filtering: {
    expression: 'users |> filter(.age >= 18) |> map(.name)',
    vars: [
      { name: 'users', value: '[{ "name": "Alice", "age": 25 }, { "name": "Bob", "age": 15 }]' },
    ],
  },
  'null-safety': {
    expression: 'user?.profile?.avatar ?? "default.png"',
    vars: [{ name: 'user', value: 'null' }],
  },
  math: {
    expression: '[10, 20, 30] |> sum',
    vars: [],
  },
  templates: {
    expression: '`Hello ${name}!`',
    vars: [{ name: 'name', value: '"world"' }],
  },
  methods: {
    expression: '"hello world".slice(0, 5) |> upper',
    vars: [],
  },
}

// ── DOM refs ─────────────────────────────────────────────────
const exprInput = document.getElementById('expr-input')
const exprHighlight = document.getElementById('expr-highlight')
const ctxVarsEl = document.getElementById('ctx-vars')
const ctxEmptyEl = document.getElementById('ctx-empty')
const resultOutput = document.getElementById('result-output')
const errorOutput = document.getElementById('error-output')
const resultType = document.getElementById('result-type')
const pills = document.querySelectorAll('.example-pill')
const toggles = document.querySelectorAll('.result-toggle')
const copyBtn = document.getElementById('copy-install')
const installText = document.getElementById('install-text')
const shareBtn = document.getElementById('share-btn')
const ctxAddBtn = document.getElementById('ctx-add')
const ctxEmptyAdd = document.getElementById('ctx-empty-add')
const ctxInlineAdd = document.getElementById('ctx-inline-add')
const ctxWrap = document.getElementById('ctx-wrap')

let currentMode = 'result'

// ── Context variable state ───────────────────────────────────
// Each entry: { id, name, value } where value is a raw string like '"hello"' or '42'
let ctxVars = []
let nextVarId = 1

function addVar(name = '', value = '', focus = false) {
  const v = { id: nextVarId++, name, value }
  ctxVars.push(v)
  renderVars()
  if (focus) {
    const row = ctxVarsEl.querySelector(`[data-id="${v.id}"]`)
    if (row) row.querySelector('.ctx-row-name').focus()
  }
  return v
}

function removeVar(id) {
  ctxVars = ctxVars.filter((v) => v.id !== id)
  renderVars()
  scheduleEvaluate()
}

function detectType(raw) {
  const s = raw.trim()
  if (s === '' || s === 'undefined') return 'null'
  if (s === 'null') return 'null'
  if (s === 'true' || s === 'false') return 'boolean'
  if (/^-?\d+(\.\d+)?$/.test(s)) return 'number'
  if (s.startsWith('"') || s.startsWith("'")) return 'string'
  if (s.startsWith('[')) return 'array'
  if (s.startsWith('{')) return 'object'
  return 'string'
}

function renderVars() {
  ctxVarsEl.innerHTML = ''
  const empty = ctxVars.length === 0
  ctxWrap.classList.toggle('is-empty', empty)
  // Let CSS handle visibility via .is-empty; only set inline style when not empty
  ctxEmptyEl.style.display = empty ? '' : 'none'

  for (const v of ctxVars) {
    const row = document.createElement('div')
    row.className = 'ctx-row'
    row.dataset.id = v.id

    const nameInput = document.createElement('input')
    nameInput.className = 'ctx-row-name'
    nameInput.type = 'text'
    nameInput.placeholder = 'name'
    nameInput.value = v.name
    nameInput.spellcheck = false

    const sep = document.createElement('span')
    sep.className = 'ctx-row-sep'
    sep.textContent = '='

    const valueInput = document.createElement('input')
    valueInput.className = 'ctx-row-value'
    valueInput.type = 'text'
    valueInput.placeholder = 'value (e.g. "hello", 42, [1,2,3])'
    valueInput.value = v.value
    valueInput.spellcheck = false

    const typeBadge = document.createElement('span')
    const t = detectType(v.value)
    typeBadge.className = `ctx-row-type ctx-type-${t}`
    typeBadge.textContent = t

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'ctx-row-delete'
    deleteBtn.title = 'Remove variable'
    deleteBtn.innerHTML = '&times;'

    nameInput.addEventListener('input', () => {
      v.name = nameInput.value
      scheduleEvaluate()
      updateHighlight()
    })

    valueInput.addEventListener('input', () => {
      v.value = valueInput.value
      const nt = detectType(v.value)
      typeBadge.className = `ctx-row-type ctx-type-${nt}`
      typeBadge.textContent = nt
      scheduleEvaluate()
    })

    deleteBtn.addEventListener('click', () => removeVar(v.id))

    row.append(nameInput, sep, valueInput, typeBadge, deleteBtn)
    ctxVarsEl.appendChild(row)
  }
}

function buildContext() {
  const ctx = {}
  for (const v of ctxVars) {
    const name = v.name.trim()
    if (!name) continue
    try {
      ctx[name] = JSON.parse(v.value)
    } catch {
      // treat as string literal if not valid JSON
      ctx[name] = v.value
    }
  }
  return ctx
}

// ── Expression highlighting ──────────────────────────────────
function updateHighlight() {
  const text = exprInput.value
  const varNames = ctxVars.map((v) => v.name.trim()).filter(Boolean)

  if (varNames.length === 0) {
    exprHighlight.innerHTML = escapeHtml(text)
    return
  }

  // Build regex matching whole-word variable names
  const escaped = varNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g')

  let result = ''
  let last = 0
  for (const match of text.matchAll(re)) {
    result += escapeHtml(text.slice(last, match.index))
    result += `<span class="hl-var">${escapeHtml(match[0])}</span>`
    last = match.index + match[0].length
  }
  result += escapeHtml(text.slice(last))
  exprHighlight.innerHTML = result
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Sync highlight scroll with textarea
exprInput.addEventListener('scroll', () => {
  exprHighlight.scrollTop = exprInput.scrollTop
  exprHighlight.scrollLeft = exprInput.scrollLeft
})

// ── Evaluate ─────────────────────────────────────────────────
function evaluate() {
  const expression = exprInput.value.trim()

  errorOutput.style.display = 'none'
  resultType.textContent = ''

  if (!expression) {
    resultOutput.innerHTML = ''
    return
  }

  const context = buildContext()

  if (currentMode === 'ast') {
    try {
      const compiled = expr.compile(expression)
      resultOutput.innerHTML = highlightJson(JSON.stringify(compiled.ast, null, 2))
      resultType.textContent = 'AST'
    } catch (e) {
      errorOutput.textContent = e.message
      errorOutput.style.display = 'block'
      resultOutput.innerHTML = ''
    }
    return
  }

  try {
    const result = expr.evaluateSync(expression, context)
    const type = getType(result)
    resultType.textContent = type
    resultOutput.innerHTML = formatResultRich(result)
  } catch (e) {
    errorOutput.textContent = e.message
    errorOutput.style.display = 'block'
    resultOutput.innerHTML = ''
    resultType.textContent = ''
  }
}

function getType(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

// ── Rich result formatting with color-coded syntax ───────────
function formatResultRich(value) {
  return colorize(value, 0)
}

function colorize(value, depth) {
  if (value === null) return '<span class="r-null">null</span>'
  if (value === undefined) return '<span class="r-null">undefined</span>'

  if (typeof value === 'string') {
    return `<span class="r-string">"${escapeHtml(value)}"</span>`
  }
  if (typeof value === 'number') {
    return `<span class="r-number">${value}</span>`
  }
  if (typeof value === 'boolean') {
    return `<span class="r-boolean">${value}</span>`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="r-bracket">[]</span>'
    const indent = '  '.repeat(depth + 1)
    const close = '  '.repeat(depth)
    const items = value.map((item) => `${indent}${colorize(item, depth + 1)}`)
    return `<span class="r-bracket">[</span>\n${items.join('<span class="r-punct">,</span>\n')}\n${close}<span class="r-bracket">]</span>`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '<span class="r-bracket">{}</span>'
    const indent = '  '.repeat(depth + 1)
    const close = '  '.repeat(depth)
    const entries = keys.map(
      (k) =>
        `${indent}<span class="r-key">"${escapeHtml(k)}"</span><span class="r-punct">:</span> ${colorize(value[k], depth + 1)}`,
    )
    return `<span class="r-bracket">{</span>\n${entries.join('<span class="r-punct">,</span>\n')}\n${close}<span class="r-bracket">}</span>`
  }

  return escapeHtml(String(value))
}

function highlightJson(json) {
  return json
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="r-key">"$1"</span>')
    .replace(/"([^"]*)"/g, '<span class="r-string">"$1"</span>')
    .replace(/\b(\d+)\b/g, '<span class="r-number">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="r-boolean">$1</span>')
    .replace(/\bnull\b/g, '<span class="r-null">null</span>')
}

// ── Debounce ─────────────────────────────────────────────────
let timer
function scheduleEvaluate() {
  clearTimeout(timer)
  timer = setTimeout(evaluate, 150)
}

// ── Event listeners ──────────────────────────────────────────
exprInput.addEventListener('input', () => {
  updateHighlight()
  scheduleEvaluate()
})

// Add var buttons
ctxAddBtn.addEventListener('click', () => addVar('', '', true))
ctxEmptyAdd.addEventListener('click', () => addVar('', '', true))
ctxInlineAdd.addEventListener('click', () => addVar('', '', true))

// Example pills
for (const pill of pills) {
  pill.addEventListener('click', () => {
    const key = pill.dataset.example
    const example = examples[key]
    if (!example) return

    for (const p of pills) p.classList.remove('active')
    pill.classList.add('active')

    exprInput.value = example.expression
    ctxVars = []
    nextVarId = 1
    for (const v of example.vars) {
      ctxVars.push({ id: nextVarId++, name: v.name, value: v.value })
    }
    renderVars()
    updateHighlight()
    evaluate()
  })
}

// Result/AST toggle
for (const toggle of toggles) {
  toggle.addEventListener('click', () => {
    currentMode = toggle.dataset.mode
    for (const t of toggles) t.classList.remove('active')
    toggle.classList.add('active')
    evaluate()
  })
}

// Copy install command
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(installText.textContent).then(() => {
    copyBtn.textContent = '\u2713'
    setTimeout(() => {
      copyBtn.textContent = '\u2398'
    }, 1500)
  })
})

// Share button
shareBtn.addEventListener('click', () => {
  const expression = encodeURIComponent(exprInput.value)
  const ctx = encodeURIComponent(JSON.stringify(buildContext()))
  const url = `${location.origin}${location.pathname}#playground?expr=${expression}&ctx=${ctx}`
  navigator.clipboard.writeText(url).then(() => {
    shareBtn.classList.add('copied')
    shareBtn.querySelector('span').textContent = 'Copied!'
    setTimeout(() => {
      shareBtn.classList.remove('copied')
      shareBtn.querySelector('span').textContent = 'Share'
    }, 2000)
  })
})

// ── Load from URL params (for "Try it" links from docs) ──────
function loadFromUrl() {
  const hash = location.hash
  if (!hash.includes('playground?')) return false

  const params = new URLSearchParams(hash.split('?')[1])
  const paramExpr = params.get('expr')
  const paramCtx = params.get('ctx')

  if (!paramExpr) return false

  exprInput.value = decodeURIComponent(paramExpr)

  // Parse context into vars
  ctxVars = []
  nextVarId = 1
  if (paramCtx) {
    try {
      const parsed = JSON.parse(decodeURIComponent(paramCtx))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          ctxVars.push({ id: nextVarId++, name: k, value: JSON.stringify(v) })
        }
      }
    } catch {
      // ignore bad ctx
    }
  }

  renderVars()

  // Clear active pills
  for (const p of pills) p.classList.remove('active')

  // Scroll playground into view
  const playgroundSection = document.getElementById('playground')
  if (playgroundSection) {
    setTimeout(() => playgroundSection.scrollIntoView({ behavior: 'smooth' }), 200)
  }

  return true
}

// ── Init ─────────────────────────────────────────────────────
if (!loadFromUrl()) {
  renderVars()
}
updateHighlight()
evaluate()
