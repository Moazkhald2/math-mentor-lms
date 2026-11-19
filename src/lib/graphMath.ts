/**
 * Core mathematical engine for the Cartesian Coordinate Grapher
 * Handles coordinates, snapping, line calculations, function evaluation,
 * intersections, and inequality shading regions.
 */

export interface ViewBounds {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export interface PlottedPoint {
  id: string
  label: string
  x: number
  y: number
  color: string
}

export interface PlottedPolygon {
  id: string
  label: string
  points: { x: number; y: number; label?: string }[]
  color: string
  closed?: boolean
  isDilation?: boolean
  scaleFactor?: number
  dilationCenter?: { x: number; y: number }
  originalId?: string
}

export interface PlottedLine {
  id: string
  label: string
  point1?: { x: number; y: number }
  point2?: { x: number; y: number }
  m?: number
  b?: number
  isVertical?: boolean
  verticalX?: number
  color: string
  style?: 'solid' | 'dashed'
}

export interface PlottedFunction {
  id: string
  name: string
  expression: string
  color: string
  isInequality?: boolean
  inequalitySign?: '<=' | '>=' | '<' | '>'
}

export interface IntersectionPoint {
  id: string
  x: number
  y: number
  label: string
  source1: string
  source2: string
}

export interface GraphState {
  points: PlottedPoint[]
  lines: PlottedLine[]
  functions: PlottedFunction[]
  polygons?: PlottedPolygon[]
  dilations?: PlottedPolygon[]
  gradeMode?: 'junior' | 'senior'
  snapStep: number
  snapEnabled: boolean
}

export const DEFAULT_VIEW_BOUNDS: ViewBounds = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
}

export const GRAPH_PALETTE = [
  '#0A9396', // Brand Teal
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#EF4444', // Red
]

/**
 * Transforms math coordinate (x, y) to SVG screen pixel (px, py)
 */
export function mathToScreen(
  x: number,
  y: number,
  bounds: ViewBounds,
  width: number,
  height: number
): { x: number; y: number } {
  const xSpan = bounds.xMax - bounds.xMin
  const ySpan = bounds.yMax - bounds.yMin

  const px = ((x - bounds.xMin) / xSpan) * width
  const py = ((bounds.yMax - y) / ySpan) * height

  return { x: px, y: py }
}

/**
 * Transforms SVG screen pixel (px, py) to math coordinate (x, y)
 */
export function screenToMath(
  px: number,
  py: number,
  bounds: ViewBounds,
  width: number,
  height: number
): { x: number; y: number } {
  const xSpan = bounds.xMax - bounds.xMin
  const ySpan = bounds.yMax - bounds.yMin

  const x = bounds.xMin + (px / width) * xSpan
  const y = bounds.yMax - (py / height) * ySpan

  return { x, y }
}

/**
 * Snaps a value to the nearest step (e.g. 1, 0.5, 0.25)
 */
export function snapCoordinate(value: number, step = 1): number {
  if (step <= 0) return value
  const snapped = Math.round(value / step) * step
  return Math.abs(snapped) < 1e-10 ? 0 : Number(snapped.toFixed(4))
}

/**
 * Computes slope m and intercept b from two points
 */
export function computeLineEquation(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): {
  m?: number
  b?: number
  isVertical: boolean
  verticalX?: number
  equation: string
} {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  if (Math.abs(dx) < 1e-9) {
    const vx = Number(p1.x.toFixed(4))
    return {
      isVertical: true,
      verticalX: vx,
      equation: `x = ${vx}`,
    }
  }

  const mRaw = dy / dx
  const m = Math.abs(mRaw) < 1e-9 ? 0 : Number(mRaw.toFixed(4))
  const bRaw = p1.y - m * p1.x
  const b = Math.abs(bRaw) < 1e-9 ? 0 : Number(bRaw.toFixed(4))

  let equation = 'y = '
  if (m === 0) {
    equation += `${b}`
  } else {
    const mStr = m === 1 ? 'x' : m === -1 ? '-x' : `${m}x`
    if (b === 0) {
      equation += mStr
    } else if (b > 0) {
      equation += `${mStr} + ${b}`
    } else {
      equation += `${mStr} - ${Math.abs(b)}`
    }
  }

  return {
    m,
    b,
    isVertical: false,
    equation,
  }
}

/**
 * Finds intersection point between two linear lines
 */
export function findLineIntersection(
  l1: PlottedLine,
  l2: PlottedLine
): { x: number; y: number } | null {
  // Case 1: Both vertical
  if (l1.isVertical && l2.isVertical) return null

  // Case 2: l1 is vertical, l2 is normal
  if (l1.isVertical && !l2.isVertical && l2.m !== undefined && l2.b !== undefined) {
    const x = l1.verticalX ?? 0
    const y = l2.m * x + l2.b
    return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }
  }

  // Case 3: l2 is vertical, l1 is normal
  if (l2.isVertical && !l1.isVertical && l1.m !== undefined && l1.b !== undefined) {
    const x = l2.verticalX ?? 0
    const y = l1.m * x + l1.b
    return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }
  }

  // Case 4: Both are non-vertical lines
  if (
    l1.m !== undefined &&
    l1.b !== undefined &&
    l2.m !== undefined &&
    l2.b !== undefined
  ) {
    const dm = l1.m - l2.m
    // Parallel lines
    if (Math.abs(dm) < 1e-9) return null

    const x = (l2.b - l1.b) / dm
    const y = l1.m * x + l1.b

    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    }
  }

  return null
}

/**
 * Computes all pairwise intersection points among a list of lines
 */
export function computeAllIntersections(lines: PlottedLine[]): IntersectionPoint[] {
  const result: IntersectionPoint[] = []

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const pt = findLineIntersection(lines[i], lines[j])
      if (pt) {
        // Check duplicate intersections
        const isDuplicate = result.some(
          (existing) =>
            Math.abs(existing.x - pt.x) < 0.05 && Math.abs(existing.y - pt.y) < 0.05
        )
        if (!isDuplicate) {
          result.push({
            id: `int-${lines[i].id}-${lines[j].id}`,
            x: pt.x,
            y: pt.y,
            label: `(${pt.x}, ${pt.y})`,
            source1: lines[i].label,
            source2: lines[j].label,
          })
        }
      }
    }
  }

  return result
}

/**
 * Normalizes LaTeX math expressions (from keypad or text) to evaluatable JS math strings:
 * e.g. "\frac{1}{3}x" -> "((1)/(3))*x"
 * "\frac{x^2}{4}" -> "(((x**2))/(4))"
 * "\sqrt{x + 1}" -> "Math.sqrt(x + 1)"
 */
export function normalizeLatexMathExpression(latex: string): string {
  if (!latex) return ''
  let s = latex.trim()

  // Replace \frac{a}{b} -> ((a)/(b)) recursively
  let prev = ''
  while (s !== prev && /\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    prev = s
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))')
  }

  // Replace \sqrt[n]{x} -> (x**(1/n))
  s = s.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '(($2)**(1/($1)))')
  // Replace \sqrt{x} -> Math.sqrt($1)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'Math.sqrt($1)')

  // Replace powers: x^{2} -> x**(2)
  s = s.replace(/\^\{([^{}]+)\}/g, '**($1)')

  // Replace operators & symbols
  s = s.replace(/\\cdot/g, '*')
  s = s.replace(/\\times/g, '*')
  s = s.replace(/\\div/g, '/')
  s = s.replace(/\\pi/g, 'Math.PI')
  s = s.replace(/\\sin/g, 'Math.sin')
  s = s.replace(/\\cos/g, 'Math.cos')
  s = s.replace(/\\tan/g, 'Math.tan')
  s = s.replace(/\\ln/g, 'Math.log')
  s = s.replace(/\\log/g, 'Math.log10')

  // Remove any remaining backslashes
  s = s.replace(/\\/g, '')

  // Insert multiplication between closing paren and variable or number: e.g. ((1)/(3))x -> ((1)/(3))*x
  s = s.replace(/\)([a-zA-Z0-9(])/g, ')*$1')

  return s
}

export interface DilationMapping {
  original: string
  originalCoords: string
  dilated: string
  dilatedCoords: string
}

export interface DilationResult {
  dilatedPoints: { x: number; y: number; label: string }[]
  mappings: DilationMapping[]
  type: 'reduction' | 'enlargement' | 'congruent'
  scaleFactor: number
  center: { x: number; y: number }
}

/**
 * Applies geometric dilation to a set of 2D points given a scale factor k
 * centered at a reference point (default: origin (0, 0)).
 * Formula: x' = cx + k * (x - cx), y' = cy + k * (y - cy)
 */
export function dilatePoints(
  points: { x: number; y: number; label?: string }[],
  scaleFactor: number,
  center: { x: number; y: number } = { x: 0, y: 0 }
): DilationResult {
  const dilatedPoints = points.map((p, idx) => {
    const rawX = center.x + scaleFactor * (p.x - center.x)
    const rawY = center.y + scaleFactor * (p.y - center.y)
    const x = Number(rawX.toFixed(3))
    const y = Number(rawY.toFixed(3))
    const baseLabel = p.label || String.fromCharCode(65 + idx)
    const label = `${baseLabel}'`
    return { x, y, label }
  })

  const mappings: DilationMapping[] = points.map((p, idx) => {
    const baseLabel = p.label || String.fromCharCode(65 + idx)
    const d = dilatedPoints[idx]
    return {
      original: baseLabel,
      originalCoords: `(${p.x}, ${p.y})`,
      dilated: d.label,
      dilatedCoords: `(${d.x}, ${d.y})`,
    }
  })

  const type =
    Math.abs(Math.abs(scaleFactor) - 1) < 1e-6
      ? 'congruent'
      : Math.abs(scaleFactor) < 1
        ? 'reduction'
        : 'enlargement'

  return {
    dilatedPoints,
    mappings,
    type,
    scaleFactor,
    center,
  }
}

/**
 * Parses and evaluates simple math expressions:
 * e.g. "2x + 1", "-0.5x + 3", "x^2 - 4", "\frac{1}{2}x", "1/x", "x"
 */
export function evaluateMathExpression(expr: string, x: number): number | null {
  if (!expr || !expr.trim()) return null

  // 1. Normalize LaTeX if present
  let clean = normalizeLatexMathExpression(expr)

  // 2. Normalize expression syntax
  clean = clean
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    // Replace implicit multiplication: e.g. 2x -> 2*x, 3(x) -> 3*(x), )x -> )*x
    .replace(/(\d)x/g, '$1*x')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)x/g, ')*x')
    .replace(/\)\(/g, ')*(')
    // Replace powers: x^2 -> (x**2)
    .replace(/\^/g, '**')
    // Support common functions
    .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
    .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)')
    .replace(/sin\(([^)]+)\)/g, 'Math.sin($1)')
    .replace(/cos\(([^)]+)\)/g, 'Math.cos($1)')
    .replace(/tan\(([^)]+)\)/g, 'Math.tan($1)')

  // Remove "y=" or "f(x)=" if provided
  clean = clean.replace(/^(y|f\(x\))\s*=\s*/, '')

  try {
    // Sandboxed arithmetic evaluator with x injected
    // Limit allowed characters to prevent arbitrary code injection
    if (!/^[0-9x+\-*/%().MathsqrtabsintanlogP*]+$/.test(clean)) {
      return null
    }

    const fn = new Function('x', `return (${clean});`)
    const result = fn(x)
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return null
    }
    return result
  } catch {
    return null
  }
}

/**
 * Samples a function expression across the view bounds for SVG polyline rendering
 */
export function sampleFunctionCurve(
  expression: string,
  bounds: ViewBounds,
  width: number,
  height: number,
  samples = 160
): string {
  const points: { x: number; y: number }[] = []
  const step = (bounds.xMax - bounds.xMin) / samples

  for (let i = 0; i <= samples; i++) {
    const x = bounds.xMin + i * step
    const y = evaluateMathExpression(expression, x)

    if (y !== null && y >= bounds.yMin - 5 && y <= bounds.yMax + 5) {
      const screenPt = mathToScreen(x, y, bounds, width, height)
      points.push(screenPt)
    }
  }

  if (points.length < 2) return ''

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`
  }

  return path
}

/**
 * Generates an SVG polygon path for inequality shading (e.g. y <= mx + b or y >= mx + b)
 */
export function generateInequalityShading(
  line: PlottedLine,
  sign: '<=' | '>=' | '<' | '>',
  bounds: ViewBounds,
  width: number,
  height: number
): string {
  if (line.isVertical && line.verticalX !== undefined) {
    const xVal = line.verticalX
    const ptTop = mathToScreen(xVal, bounds.yMax, bounds, width, height)
    const ptBottom = mathToScreen(xVal, bounds.yMin, bounds, width, height)

    if (sign === '<=' || sign === '<') {
      // Shade left (x <= xVal)
      const leftTop = mathToScreen(bounds.xMin, bounds.yMax, bounds, width, height)
      const leftBottom = mathToScreen(bounds.xMin, bounds.yMin, bounds, width, height)
      return `M ${ptTop.x} ${ptTop.y} L ${leftTop.x} ${leftTop.y} L ${leftBottom.x} ${leftBottom.y} L ${ptBottom.x} ${ptBottom.y} Z`
    } else {
      // Shade right (x >= xVal)
      const rightTop = mathToScreen(bounds.xMax, bounds.yMax, bounds, width, height)
      const rightBottom = mathToScreen(bounds.xMax, bounds.yMin, bounds, width, height)
      return `M ${ptTop.x} ${ptTop.y} L ${rightTop.x} ${rightTop.y} L ${rightBottom.x} ${rightBottom.y} L ${ptBottom.x} ${ptBottom.y} Z`
    }
  }

  if (line.m !== undefined && line.b !== undefined) {
    const yLeft = line.m * bounds.xMin + line.b
    const yRight = line.m * bounds.xMax + line.b

    const ptLeft = mathToScreen(bounds.xMin, yLeft, bounds, width, height)
    const ptRight = mathToScreen(bounds.xMax, yRight, bounds, width, height)

    if (sign === '<=' || sign === '<') {
      // Shade downwards (below line)
      const cornerBottomRight = mathToScreen(bounds.xMax, bounds.yMin, bounds, width, height)
      const cornerBottomLeft = mathToScreen(bounds.xMin, bounds.yMin, bounds, width, height)
      return `M ${ptLeft.x} ${ptLeft.y} L ${ptRight.x} ${ptRight.y} L ${cornerBottomRight.x} ${cornerBottomRight.y} L ${cornerBottomLeft.x} ${cornerBottomLeft.y} Z`
    } else {
      // Shade upwards (above line)
      const cornerTopRight = mathToScreen(bounds.xMax, bounds.yMax, bounds, width, height)
      const cornerTopLeft = mathToScreen(bounds.xMin, bounds.yMax, bounds, width, height)
      return `M ${ptLeft.x} ${ptLeft.y} L ${ptRight.x} ${ptRight.y} L ${cornerTopRight.x} ${cornerTopRight.y} L ${cornerTopLeft.x} ${cornerTopLeft.y} Z`
    }
  }

  return ''
}

/**
 * Serializes the student's graph into a clean mathematical answer string
 */
export function serializeGraphState(state: GraphState): string {
  const parts: string[] = []

  if (state.points.length > 0) {
    const ptList = state.points.map((p) => `${p.label}(${p.x}, ${p.y})`).join(', ')
    parts.push(`Points: ${ptList}`)
  }

  if (state.lines.length > 0) {
    const lineList = state.lines.map((l) => `${l.label} [${computeLineEquation(l.point1 || { x: 0, y: l.b || 0 }, l.point2 || { x: 1, y: (l.m || 0) + (l.b || 0) }).equation}]`).join(', ')
    parts.push(`Lines: ${lineList}`)
  }

  if (state.polygons && state.polygons.length > 0) {
    const polyList = state.polygons
      .map((poly) => {
        const pts = poly.points.map((p) => `${p.label || ''}(${p.x}, ${p.y})`).join(', ')
        return `${poly.label} [${pts}]`
      })
      .join(', ')
    parts.push(`Shapes: ${polyList}`)
  }

  if (state.dilations && state.dilations.length > 0) {
    const dilList = state.dilations
      .map((d) => {
        const pts = d.points.map((p) => `${p.label || ''}(${p.x}, ${p.y})`).join(', ')
        return `${d.label} (k=${d.scaleFactor}) [${pts}]`
      })
      .join(', ')
    parts.push(`Dilations: ${dilList}`)
  }

  if (state.functions.length > 0) {
    const fnList = state.functions.map((f) => `${f.name}: ${f.expression}`).join(', ')
    parts.push(`Functions: ${fnList}`)
  }

  const intersections = computeAllIntersections(state.lines)
  if (intersections.length > 0) {
    const intList = intersections.map((i) => `(${i.x}, ${i.y})`).join(', ')
    parts.push(`Intersections: ${intList}`)
  }

  return parts.join(' | ')
}
