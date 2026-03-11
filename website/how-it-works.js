// website/how-it-works.js
// Interactive AST walkthrough visualization engine for the How It Works page.
// SECURITY: No innerHTML anywhere. All DOM manipulation uses safe methods only.

import { tokenize, parse, compile } from './bonsai.bundle.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 200
const NODE_HEIGHT = 32
const NODE_PAD_X = 14
const NODE_GAP_X = 20
const LEVEL_HEIGHT = 80
const MAX_DEPTH = 8
const EVAL_STEP_MS = 600
const SVG_NS = 'http://www.w3.org/2000/svg'

// ─── AST Helper Functions ────────────────────────────────────────────────────

function nodeCategory(node) {
  switch (node.type) {
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'UndefinedLiteral':
      return 'literal'
    case 'BinaryExpression':
    case 'UnaryExpression':
      return 'operator'
    case 'Identifier':
      return 'identifier'
    case 'PipeExpression':
    case 'CallExpression':
      return 'pipe'
    case 'ConditionalExpression':
      return 'control'
    case 'MemberExpression':
    case 'OptionalMemberExpression':
    case 'LambdaAccessor':
    case 'LambdaExpression':
      return 'member'
    default:
      return 'literal'
  }
}

function nodeLabel(node) {
  switch (node.type) {
    case 'NumberLiteral':
      return String(node.value)
    case 'StringLiteral':
      return `"${node.value}"`
    case 'BooleanLiteral':
      return String(node.value)
    case 'NullLiteral':
      return 'null'
    case 'UndefinedLiteral':
      return 'undefined'
    case 'Identifier':
      return node.name
    case 'BinaryExpression':
      return node.operator
    case 'UnaryExpression':
      return node.operator
    case 'ConditionalExpression':
      return '? :'
    case 'MemberExpression':
      return node.computed ? '[]' : '.'
    case 'OptionalMemberExpression':
      return node.computed ? '?.[]' : '?.'
    case 'PipeExpression':
      return '|>'
    case 'CallExpression': {
      const callee = node.callee
      if (callee.type === 'Identifier') return `${callee.name}()`
      return 'call()'
    }
    case 'ArrayLiteral':
      return '[...]'
    case 'ObjectLiteral':
      return '{...}'
    case 'TemplateLiteral':
      return '`...`'
    case 'SpreadElement':
      return '...'
    case 'LambdaAccessor':
      return `.${node.property}`
    case 'LambdaExpression':
      return 'lambda'
    default:
      return node.type
  }
}

function nodeChildren(node) {
  switch (node.type) {
    case 'BinaryExpression':
      return [node.left, node.right]
    case 'UnaryExpression':
      return [node.operand]
    case 'ConditionalExpression':
      return [node.test, node.consequent, node.alternate]
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return node.computed ? [node.object, node.property] : [node.object]
    case 'PipeExpression':
      return [node.input, node.transform]
    case 'CallExpression':
      return [node.callee, ...node.args]
    case 'ArrayLiteral':
      return [...node.elements]
    case 'ObjectLiteral':
      return node.properties.flatMap(p => [p.key, p.value])
    case 'TemplateLiteral':
      return [...node.parts]
    case 'SpreadElement':
      return [node.argument]
    case 'LambdaExpression':
      return [node.body]
    default:
      return []
  }
}

// ─── Tree Layout Algorithm ───────────────────────────────────────────────────

function measureText(text) {
  return text.length * 7.5 + NODE_PAD_X * 2
}

function layoutTree(ast, maxDepth = MAX_DEPTH) {
  const nodes = []
  const edges = []
  let idCounter = 0

  function buildLayout(node, depth) {
    if (depth > maxDepth) {
      const truncNode = {
        id: idCounter++,
        label: '...',
        category: 'literal',
        astNode: node,
        depth,
        children: [],
        width: measureText('...'),
        x: 0,
        y: 0,
      }
      nodes.push(truncNode)
      return truncNode
    }

    const label = nodeLabel(node)
    const category = nodeCategory(node)
    const childAstNodes = nodeChildren(node)

    const layoutNode = {
      id: idCounter++,
      label,
      category,
      astNode: node,
      depth,
      children: [],
      width: measureText(label),
      x: 0,
      y: 0,
    }
    nodes.push(layoutNode)

    const childLayouts = childAstNodes.map(child => buildLayout(child, depth + 1))
    layoutNode.children = childLayouts

    for (const child of childLayouts) {
      edges.push({ from: layoutNode, to: child })
    }

    // Width = max(own text width, sum of children widths + gaps)
    if (childLayouts.length > 0) {
      const childrenTotalWidth =
        childLayouts.reduce((sum, c) => sum + c.width, 0) +
        (childLayouts.length - 1) * NODE_GAP_X
      layoutNode.width = Math.max(layoutNode.width, childrenTotalWidth)
    }

    return layoutNode
  }

  function position(node, xStart) {
    node.y = node.depth * LEVEL_HEIGHT + 20

    if (node.children.length === 0) {
      node.x = xStart + node.width / 2
      return
    }

    // Position children left-to-right
    let childX = xStart
    for (const child of node.children) {
      // Each child's allocated space = child.width
      position(child, childX)
      childX += child.width + NODE_GAP_X
    }

    // Parent center = midpoint of first and last child centers
    const first = node.children[0]
    const last = node.children[node.children.length - 1]
    node.x = (first.x + last.x) / 2
  }

  const root = buildLayout(ast, 0)
  position(root, 0)

  const totalWidth = Math.max(root.width, 200)
  const maxNodeDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  const totalHeight = maxNodeDepth * LEVEL_HEIGHT + 20 + NODE_HEIGHT + 20

  return { nodes, edges, root, totalWidth, totalHeight }
}

// ─── SVG Rendering ───────────────────────────────────────────────────────────

function renderTree(svgEl, layout, options = {}) {
  const { animated, sourceEl, sourceText } = options
  const { nodes, edges, totalWidth, totalHeight } = layout

  svgEl.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
  svgEl.setAttribute('width', String(totalWidth))
  svgEl.setAttribute('height', String(totalHeight))
  svgEl.setAttribute('role', 'img')
  svgEl.setAttribute('aria-label', 'Abstract syntax tree visualization')

  svgEl.replaceChildren()

  // Draw edges first (behind nodes)
  for (const edge of edges) {
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(edge.from.x))
    line.setAttribute('y1', String(edge.from.y + NODE_HEIGHT / 2))
    line.setAttribute('x2', String(edge.to.x))
    line.setAttribute('y2', String(edge.to.y - NODE_HEIGHT / 2))
    line.setAttribute('class', 'hiw-edge')
    svgEl.appendChild(line)
  }

  // Draw nodes
  for (const node of nodes) {
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('class', `hiw-node hiw-node-${node.category}`)
    g.setAttribute('data-node-id', String(node.id))
    g.setAttribute('role', 'img')
    g.setAttribute('aria-label', `${node.category} node: ${node.label}`)
    g.setAttribute(
      'transform',
      `translate(${node.x - node.width / 2}, ${node.y - NODE_HEIGHT / 2})`
    )

    if (animated) {
      g.style.opacity = '0'
    }

    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('width', String(node.width))
    rect.setAttribute('height', String(NODE_HEIGHT))
    rect.setAttribute('rx', '6')
    g.appendChild(rect)

    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('x', String(node.width / 2))
    text.setAttribute('y', String(NODE_HEIGHT / 2))
    text.textContent = node.label
    g.appendChild(text)

    // Value overlay for evaluation animation
    const valueText = document.createElementNS(SVG_NS, 'text')
    valueText.setAttribute('class', 'hiw-node-value')
    valueText.setAttribute('x', String(node.width / 2))
    valueText.setAttribute('y', String(NODE_HEIGHT + 14))
    g.appendChild(valueText)

    // Source highlight interaction (hover on desktop, tap on mobile)
    if (sourceEl && sourceText != null && node.astNode) {
      const astNode = node.astNode
      if (typeof astNode.start === 'number' && typeof astNode.end === 'number') {
        g.addEventListener('mouseenter', () => {
          g.classList.add('highlighted')
          highlightSource(sourceEl, sourceText, astNode.start, astNode.end)
        })
        g.addEventListener('mouseleave', () => {
          g.classList.remove('highlighted')
          highlightSource(sourceEl, sourceText, -1, -1)
        })
        g.addEventListener('click', (e) => {
          e.stopPropagation()
          // Clear previous highlight
          const prev = svgEl.querySelector('.hiw-node.highlighted')
          if (prev && prev !== g) {
            prev.classList.remove('highlighted')
          }
          // Toggle this node
          const wasHighlighted = g.classList.toggle('highlighted')
          if (wasHighlighted) {
            highlightSource(sourceEl, sourceText, astNode.start, astNode.end)
          } else {
            highlightSource(sourceEl, sourceText, -1, -1)
          }
        })
      }
    }

    svgEl.appendChild(g)
  }

  // Tap outside a node to clear highlight (mobile)
  if (sourceEl && sourceText != null) {
    svgEl.addEventListener('click', () => {
      const prev = svgEl.querySelector('.hiw-node.highlighted')
      if (prev) {
        prev.classList.remove('highlighted')
        highlightSource(sourceEl, sourceText, -1, -1)
      }
    })
  }

  if (animated) {
    animateTreeIn(svgEl, layout)
  }
}

function highlightSource(el, source, start, end) {
  el.replaceChildren()

  if (start < 0 || end <= start) {
    el.textContent = source
    return
  }

  const before = source.slice(0, start)
  const highlighted = source.slice(start, end)
  const after = source.slice(end)

  if (before) {
    el.appendChild(document.createTextNode(before))
  }

  const span = document.createElement('span')
  span.className = 'hiw-hl'
  span.textContent = highlighted
  el.appendChild(span)

  if (after) {
    el.appendChild(document.createTextNode(after))
  }
}

function animateTreeIn(svgEl, layout) {
  const { nodes } = layout

  // Group nodes by depth
  const byDepth = new Map()
  for (const node of nodes) {
    if (!byDepth.has(node.depth)) byDepth.set(node.depth, [])
    byDepth.get(node.depth).push(node)
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b)

  for (const depth of depths) {
    const delay = depth * 150
    setTimeout(() => {
      const depthNodes = byDepth.get(depth)
      for (const node of depthNodes) {
        const g = svgEl.querySelector(`[data-node-id="${node.id}"]`)
        if (g) g.style.opacity = '1'
      }
    }, delay)
  }
}

// ─── Tokenization Display ────────────────────────────────────────────────────

function tokenTypeClass(type) {
  switch (type) {
    case 'Number':
      return 'hiw-token-type-number'
    case 'String':
      return 'hiw-token-type-string'
    case 'Boolean':
      return 'hiw-token-type-boolean'
    case 'Operator':
      return 'hiw-token-type-operator'
    case 'Identifier':
      return 'hiw-token-type-identifier'
    case 'Punctuation':
      return 'hiw-token-type-punctuation'
    case 'Pipe':
      return 'hiw-token-type-pipe'
    case 'OptionalChain':
      return 'hiw-token-type-operator'
    case 'NullishCoalescing':
      return 'hiw-token-type-operator'
    case 'Spread':
      return 'hiw-token-type-punctuation'
    case 'Null':
      return 'hiw-token-type-boolean'
    case 'Undefined':
      return 'hiw-token-type-boolean'
    case 'TemplateLiteral':
      return 'hiw-token-type-string'
    default:
      return 'hiw-token-type-punctuation'
  }
}

function renderTokens(containerEl, source) {
  containerEl.replaceChildren()

  let tokens
  try {
    tokens = tokenize(source)
  } catch (err) {
    return { error: err }
  }

  // Filter out EOF tokens
  const visible = tokens.filter(t => t.type !== 'EOF')

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  visible.forEach((token, i) => {
    const div = document.createElement('div')
    div.className = `hiw-token ${tokenTypeClass(token.type)}`

    const valueSpan = document.createElement('span')
    valueSpan.className = 'hiw-token-value'
    valueSpan.textContent = token.value || token.type
    div.appendChild(valueSpan)

    const typeSpan = document.createElement('span')
    typeSpan.className = 'hiw-token-type'
    typeSpan.textContent = token.type
    div.appendChild(typeSpan)

    if (reduced) {
      containerEl.appendChild(div)
    } else {
      div.style.animationDelay = `${i * 80}ms`
      containerEl.appendChild(div)
    }
  })

  containerEl.setAttribute(
    'aria-label',
    `${visible.length} token${visible.length !== 1 ? 's' : ''}: ${visible.map(t => t.value || t.type).join(', ')}`
  )

  return {}
}

// ─── Evaluation Stepper ──────────────────────────────────────────────────────

function buildEvalSequence(ast) {
  const sequence = []

  function walk(node) {
    switch (node.type) {
      case 'NumberLiteral':
        sequence.push({ node, value: node.value })
        break
      case 'StringLiteral':
        sequence.push({ node, value: node.value })
        break
      case 'BooleanLiteral':
        sequence.push({ node, value: node.value })
        break
      case 'NullLiteral':
        sequence.push({ node, value: null })
        break
      case 'BinaryExpression': {
        walk(node.left)
        walk(node.right)
        const leftStep = sequence.filter(s => s.node === node.left).at(-1)
        const rightStep = sequence.filter(s => s.node === node.right).at(-1)
        const leftVal = leftStep ? leftStep.value : undefined
        const rightVal = rightStep ? rightStep.value : undefined
        const result = evalBinaryOp(node.operator, leftVal, rightVal)
        sequence.push({ node, value: result })
        break
      }
      case 'UnaryExpression': {
        walk(node.operand)
        const operandStep = sequence.filter(s => s.node === node.operand).at(-1)
        const operandVal = operandStep ? operandStep.value : undefined
        let result
        if (node.operator === '!' && typeof operandVal === 'boolean') {
          result = !operandVal
        } else if (node.operator === '-' && typeof operandVal === 'number') {
          result = -operandVal
        } else if (node.operator === '+') {
          result = Number(operandVal)
        } else {
          result = undefined
        }
        sequence.push({ node, value: result })
        break
      }
      case 'ConditionalExpression': {
        walk(node.test)
        walk(node.consequent)
        walk(node.alternate)
        const testStep = sequence.filter(s => s.node === node.test).at(-1)
        const testVal = testStep ? testStep.value : undefined
        const consequentStep = sequence.filter(s => s.node === node.consequent).at(-1)
        const alternateStep = sequence.filter(s => s.node === node.alternate).at(-1)
        const result = testVal
          ? (consequentStep ? consequentStep.value : undefined)
          : (alternateStep ? alternateStep.value : undefined)
        sequence.push({ node, value: result })
        break
      }
      default:
        sequence.push({ node, value: undefined })
        break
    }
  }

  walk(ast)
  return sequence
}

function evalBinaryOp(op, left, right) {
  switch (op) {
    case '+': return left + right
    case '-': return left - right
    case '*': return left * right
    case '/': return left / right
    case '%': return left % right
    case '**': return left ** right
    case '<': return left < right
    case '>': return left > right
    case '<=': return left <= right
    case '>=': return left >= right
    case '==': return left === right
    case '!=': return left !== right
    case '&&': return left && right
    case '||': return left || right
    default: return undefined
  }
}

function formatValue(v) {
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  }
}

// ─── Section: Tokenization ───────────────────────────────────────────────────

function initTokenSection() {
  const input = document.getElementById('token-input')
  const display = document.getElementById('token-display')
  const errorEl = document.getElementById('token-error')

  if (!input || !display) return

  function update() {
    const source = input.value

    errorEl.hidden = true
    errorEl.replaceChildren()

    const result = renderTokens(display, source)
    if (result && result.error) {
      errorEl.textContent = result.error.message || String(result.error)
      errorEl.hidden = false
    }
  }

  input.addEventListener('input', debounce(update, DEBOUNCE_MS))
  update()
}

// ─── Section: AST Tree ───────────────────────────────────────────────────────

function initTreeSection() {
  const input = document.getElementById('tree-input')
  const svgEl = document.getElementById('tree-svg')
  const sourceEl = document.getElementById('tree-source')

  if (!input || !svgEl) return

  function update() {
    const source = input.value.trim()
    if (!source) {
      svgEl.replaceChildren()
      if (sourceEl) sourceEl.replaceChildren()
      return
    }

    let ast
    try {
      ast = parse(source)
    } catch (_err) {
      return
    }

    if (sourceEl) {
      sourceEl.textContent = source
    }

    const layout = layoutTree(ast)
    renderTree(svgEl, layout, {
      animated: true,
      sourceEl: sourceEl || null,
      sourceText: sourceEl ? source : null,
    })
  }

  input.addEventListener('input', debounce(update, DEBOUNCE_MS))
  update()
}

// ─── Section: Evaluation Stepper ─────────────────────────────────────────────

function initEvalSection() {
  const input = document.getElementById('eval-input')
  const svgEl = document.getElementById('eval-tree-svg')
  const playBtn = document.getElementById('eval-play-btn')
  const resultEl = document.getElementById('eval-result')
  const presets = document.getElementById('eval-presets')

  if (!input || !svgEl || !playBtn) return

  let currentLayout = null
  let currentAst = null
  let evalInterval = null

  function updateTree() {
    const source = input.value.trim()
    if (!source) {
      svgEl.replaceChildren()
      currentAst = null
      return
    }

    let ast
    try {
      ast = parse(source)
    } catch (_err) {
      return
    }

    currentAst = ast
    currentLayout = layoutTree(ast)
    renderTree(svgEl, currentLayout, { animated: false })

    if (resultEl) {
      resultEl.replaceChildren()
    }
  }

  function runEvalAnimation() {
    if (!currentLayout || !currentAst) return

    // Re-render clean tree (uses same AST objects as currentLayout)
    renderTree(svgEl, currentLayout, { animated: false })
    if (resultEl) resultEl.replaceChildren()

    playBtn.disabled = true

    const sequence = buildEvalSequence(currentAst)
    let stepIndex = 0

    // Map from AST node to layout node id
    function findNodeId(astNode) {
      for (const n of currentLayout.nodes) {
        if (n.astNode === astNode) return n.id
      }
      return null
    }

    // Dim all nodes before starting
    const allNodeEls = svgEl.querySelectorAll('.hiw-node')
    for (const el of allNodeEls) {
      el.classList.add('eval-dimmed')
    }

    if (evalInterval) clearInterval(evalInterval)

    evalInterval = setInterval(() => {
      if (stepIndex >= sequence.length) {
        clearInterval(evalInterval)
        evalInterval = null
        playBtn.disabled = false

        // Show final result
        const lastStep = sequence[sequence.length - 1]
        if (lastStep && lastStep.value !== undefined && resultEl) {
          resultEl.textContent = `= ${formatValue(lastStep.value)}`
        }
        return
      }

      const step = sequence[stepIndex]
      stepIndex++

      const nodeId = findNodeId(step.node)
      if (nodeId === null) return

      const gEl = svgEl.querySelector(`[data-node-id="${nodeId}"]`)
      if (!gEl) return

      gEl.classList.remove('eval-dimmed')
      gEl.classList.add('evaluated')

      if (step.value !== undefined) {
        const valueText = gEl.querySelector('.hiw-node-value')
        if (valueText) {
          valueText.textContent = formatValue(step.value)
          valueText.classList.add('visible')
        }
      }
    }, EVAL_STEP_MS)
  }

  input.addEventListener('input', debounce(updateTree, DEBOUNCE_MS))
  playBtn.addEventListener('click', runEvalAnimation)

  if (presets) {
    presets.addEventListener('change', () => {
      if (presets.value) {
        input.value = presets.value
        updateTree()
        presets.value = ''
      }
    })
  }

  updateTree()
}

// ─── Section: Advanced (Real Expressions) ────────────────────────────────────

function initAdvancedSection() {
  const input = document.getElementById('advanced-input')
  const presets = document.getElementById('advanced-presets')
  const svgEl = document.getElementById('advanced-tree-svg')

  if (!input || !svgEl) return

  function update() {
    const source = input.value.trim()
    if (!source) {
      svgEl.replaceChildren()
      return
    }

    let ast
    try {
      ast = parse(source)
    } catch (_err) {
      return
    }

    const layout = layoutTree(ast)
    renderTree(svgEl, layout, { animated: true })
  }

  input.addEventListener('input', debounce(update, DEBOUNCE_MS))

  if (presets) {
    presets.addEventListener('change', () => {
      if (presets.value) {
        input.value = presets.value
        update()
        // Reset dropdown
        presets.value = ''
      }
    })
  }

  update()
}

// ─── Section: Optimization ───────────────────────────────────────────────────

function initOptSection() {
  const input = document.getElementById('opt-input')
  const runBtn = document.getElementById('opt-run-btn')
  const beforeSvg = document.getElementById('opt-before-svg')
  const afterSvg = document.getElementById('opt-after-svg')
  const messageEl = document.getElementById('opt-message')

  if (!input || !runBtn || !beforeSvg || !afterSvg) return

  function updateBefore() {
    const source = input.value.trim()
    if (!source) {
      beforeSvg.replaceChildren()
      return
    }

    let ast
    try {
      ast = parse(source)
    } catch (_err) {
      return
    }

    const layout = layoutTree(ast)
    renderTree(beforeSvg, layout, { animated: false })
  }

  function runOptimization() {
    const source = input.value.trim()
    if (!source) return

    let ast
    try {
      ast = parse(source)
    } catch (_err) {
      return
    }

    let optimized
    try {
      optimized = compile(ast)
    } catch (_err) {
      return
    }

    const beforeLayout = layoutTree(ast)
    const afterLayout = layoutTree(optimized)

    renderTree(beforeSvg, beforeLayout, { animated: false })
    renderTree(afterSvg, afterLayout, { animated: true })

    if (messageEl) {
      const beforeCount = beforeLayout.nodes.length
      const afterCount = afterLayout.nodes.length
      messageEl.replaceChildren()

      if (afterCount < beforeCount) {
        const reduced = beforeCount - afterCount
        messageEl.textContent = `Optimized: ${beforeCount} nodes reduced to ${afterCount} (saved ${reduced} node${reduced !== 1 ? 's' : ''})`
      } else {
        messageEl.textContent = 'Already optimal -- no constant sub-expressions to fold'
      }
    }
  }

  input.addEventListener('input', debounce(() => {
    updateBefore()
    if (afterSvg) afterSvg.replaceChildren()
    if (messageEl) messageEl.replaceChildren()
  }, DEBOUNCE_MS))

  runBtn.addEventListener('click', runOptimization)
  updateBefore()
}

// ─── Scroll Reveal ───────────────────────────────────────────────────────────

function initScrollReveal() {
  const sections = document.querySelectorAll('.hiw-section')

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sections.forEach(section => section.classList.add('visible'))
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15 }
  )

  sections.forEach(section => observer.observe(section))
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal()
  initTokenSection()
  initTreeSection()
  initEvalSection()
  initAdvancedSection()
  initOptSection()
})
