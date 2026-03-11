import { bonsai } from './bonsai.bundle.js'
import { strings, arrays, math, types, dates } from './stdlib.bundle.js'

const expr = bonsai()
expr.use(strings)
expr.use(arrays)
expr.use(math)
expr.use(types)
expr.use(dates)

const input = document.getElementById('quick-expr')
const result = document.getElementById('quick-result')
const copyBtn = document.getElementById('copy-install')
const installText = document.getElementById('install-text')
const contextView = document.getElementById('quick-context')
const openLink = document.getElementById('quick-open-link')
const presetButtons = document.querySelectorAll('.quick-preset')

const presets = {
  cleanup: {
    expression: 'name |> trim |> upper',
    context: { name: '  hello world  ' },
  },
  rules: {
    expression: 'order.total >= 100 ? "free" : "paid"',
    context: {
      order: { total: 149 },
    },
  },
  filters: {
    expression: 'users |> filter(.age >= 18) |> map(.name)',
    context: {
      users: [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 15 },
        { name: 'Charlie', age: 30 },
      ],
    },
  },
  templates: {
    expression: '`Hello ${name |> upper}, welcome back!`',
    context: {
      name: 'Dana',
    },
  },
}

let currentContext = presets.cleanup.context

function renderContext() {
  if (!contextView) return
  const keys = Object.keys(currentContext)
  contextView.textContent = keys.length === 0
    ? 'No context needed for this example.'
    : JSON.stringify(currentContext, null, 2)
}

function updatePlaygroundLink() {
  if (!openLink) return
  const params = new URLSearchParams({
    expr: input.value,
    ctx: JSON.stringify(currentContext),
  })
  openLink.href = `./playground?${params.toString()}`
}

function evaluate() {
  const expression = input.value.trim()
  if (!expression) {
    result.textContent = ''
    result.className = 'quick-try-result'
    updatePlaygroundLink()
    return
  }
  try {
    const value = expr.evaluateSync(expression, currentContext)
    result.className = 'quick-try-result'
    if (typeof value === 'string') {
      result.textContent = `"${value}"`
    } else if (value === null) {
      result.textContent = 'null'
    } else if (typeof value === 'object') {
      result.textContent = JSON.stringify(value, null, 2)
    } else {
      result.textContent = String(value)
    }
  } catch (e) {
    result.textContent = e.message
    result.className = 'quick-try-result quick-try-error'
  }

  updatePlaygroundLink()
}

function loadPreset(name) {
  const preset = presets[name]
  if (!preset) return

  currentContext = preset.context
  input.value = preset.expression
  renderContext()
  for (const button of presetButtons) {
    button.classList.toggle('active', button.dataset.preset === name)
  }
  evaluate()
}

let timer
input.addEventListener('input', () => {
  clearTimeout(timer)
  timer = setTimeout(evaluate, 200)
})

for (const button of presetButtons) {
  button.addEventListener('click', () => {
    const name = button.dataset.preset
    if (name) loadPreset(name)
  })
}

// Copy install command
if (copyBtn && installText) {
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(installText.textContent).then(() => {
      copyBtn.textContent = '\u2713'
      setTimeout(() => { copyBtn.textContent = '\u2398' }, 1500)
    })
  })
}

loadPreset('cleanup')
