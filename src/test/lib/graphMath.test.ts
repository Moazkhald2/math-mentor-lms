import { describe, it, expect } from 'vitest'
import {
  mathToScreen,
  screenToMath,
  snapCoordinate,
  computeLineEquation,
  findLineIntersection,
  computeAllIntersections,
  evaluateMathExpression,
  normalizeLatexMathExpression,
  dilatePoints,
  serializeGraphState,
  type ViewBounds,
  type PlottedLine,
  type GraphState,
} from '../../lib/graphMath'

describe('graphMath utility functions', () => {
  const bounds: ViewBounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
  const width = 600
  const height = 600

  it('converts between math and screen coordinates accurately', () => {
    // Origin (0,0) in symmetric -10..10 bounds should be center (300, 300)
    const screenCenter = mathToScreen(0, 0, bounds, width, height)
    expect(screenCenter.x).toBeCloseTo(300)
    expect(screenCenter.y).toBeCloseTo(300)

    // Round-trip back to math coordinates
    const mathCoord = screenToMath(screenCenter.x, screenCenter.y, bounds, width, height)
    expect(mathCoord.x).toBeCloseTo(0)
    expect(mathCoord.y).toBeCloseTo(0)
  })

  it('snaps coordinates to grid accurately', () => {
    // Integer snap (step = 1)
    expect(snapCoordinate(2.1, 1)).toBe(2)
    expect(snapCoordinate(2.8, 1)).toBe(3)
    expect(snapCoordinate(-3.4, 1)).toBe(-3)
    expect(snapCoordinate(-3.7, 1)).toBe(-4)

    // Half-step snap (step = 0.5)
    expect(snapCoordinate(2.15, 0.5)).toBe(2)
    expect(snapCoordinate(2.35, 0.5)).toBe(2.5)
    expect(snapCoordinate(2.78, 0.5)).toBe(3)
  })

  it('computes line equations correctly for various slopes and intercepts', () => {
    // Standard line through (0, 1) and (2, 5) -> m = 2, b = 1 -> y = 2x + 1
    const line1 = computeLineEquation({ x: 0, y: 1 }, { x: 2, y: 5 })
    expect(line1.isVertical).toBe(false)
    expect(line1.m).toBe(2)
    expect(line1.b).toBe(1)
    expect(line1.equation).toBe('y = 2x + 1')

    // Horizontal line through (0, 3) and (4, 3) -> y = 3
    const horizontal = computeLineEquation({ x: 0, y: 3 }, { x: 4, y: 3 })
    expect(horizontal.m).toBe(0)
    expect(horizontal.b).toBe(3)
    expect(horizontal.equation).toBe('y = 3')

    // Vertical line through (2, -1) and (2, 5) -> x = 2
    const vertical = computeLineEquation({ x: 2, y: -1 }, { x: 2, y: 5 })
    expect(vertical.isVertical).toBe(true)
    expect(vertical.verticalX).toBe(2)
    expect(vertical.equation).toBe('x = 2')
  })

  it('calculates intersection points between lines and vertical axes', () => {
    // Line 1: y = 2x + 1
    const l1: PlottedLine = {
      id: 'l1',
      label: 'L1',
      m: 2,
      b: 1,
      color: '#0A9396',
    }
    // Line 2: y = -x + 4
    const l2: PlottedLine = {
      id: 'l2',
      label: 'L2',
      m: -1,
      b: 4,
      color: '#3B82F6',
    }

    // 2x + 1 = -x + 4 -> 3x = 3 -> x = 1, y = 3
    const intersection = findLineIntersection(l1, l2)
    expect(intersection).not.toBeNull()
    expect(intersection?.x).toBe(1)
    expect(intersection?.y).toBe(3)

    // Parallel lines: y = 2x + 1 and y = 2x - 5 -> no intersection
    const parallel: PlottedLine = {
      id: 'l3',
      label: 'L3',
      m: 2,
      b: -5,
      color: '#8B5CF6',
    }
    expect(findLineIntersection(l1, parallel)).toBeNull()

    // Vertical line x = 3 with y = 2x + 1 -> (3, 7)
    const vert: PlottedLine = {
      id: 'l4',
      label: 'L4',
      isVertical: true,
      verticalX: 3,
      color: '#EC4899',
    }
    const vertInt = findLineIntersection(l1, vert)
    expect(vertInt).not.toBeNull()
    expect(vertInt?.x).toBe(3)
    expect(vertInt?.y).toBe(7)
  })

  it('computes all pairwise intersections for linear optimization / system of equations', () => {
    const lines: PlottedLine[] = [
      { id: '1', label: 'y = 2x', m: 2, b: 0, color: 'blue' },
      { id: '2', label: 'y = -x + 3', m: -1, b: 3, color: 'red' },
      { id: '3', label: 'x = 2', isVertical: true, verticalX: 2, color: 'green' },
    ]

    const allInts = computeAllIntersections(lines)
    // 3 lines have 3 pairwise intersections
    expect(allInts.length).toBe(3)
    // Intersection of y=2x and y=-x+3 -> (1, 2)
    expect(allInts.some((i) => i.x === 1 && i.y === 2)).toBe(true)
    // Intersection of y=2x and x=2 -> (2, 4)
    expect(allInts.some((i) => i.x === 2 && i.y === 4)).toBe(true)
    // Intersection of y=-x+3 and x=2 -> (2, 1)
    expect(allInts.some((i) => i.x === 2 && i.y === 1)).toBe(true)
  })

  it('safely evaluates math expressions with implicit multiplication and powers', () => {
    expect(evaluateMathExpression('2x + 3', 4)).toBe(11)
    expect(evaluateMathExpression('-x + 5', 2)).toBe(3)
    expect(evaluateMathExpression('x^2 - 4', 3)).toBe(5)
    expect(evaluateMathExpression('2(x - 1)', 5)).toBe(8)
    expect(evaluateMathExpression('sqrt(x)', 9)).toBe(3)
    expect(evaluateMathExpression('1/x', 2)).toBe(0.5)

    // Invalid / unsafe inputs return null
    expect(evaluateMathExpression('alert(1)', 1)).toBeNull()
    expect(evaluateMathExpression('process.exit()', 1)).toBeNull()
  })

  it('serializes graph state into readable math answer string', () => {
    const state: GraphState = {
      points: [
        { id: 'p1', label: 'A', x: 2, y: 3, color: 'blue' },
        { id: 'p2', label: 'B', x: -1, y: 0, color: 'red' },
      ],
      lines: [
        {
          id: 'l1',
          label: 'Line 1',
          point1: { x: 0, y: 1 },
          point2: { x: 1, y: 2 },
          m: 1,
          b: 1,
          color: 'blue',
        },
      ],
      functions: [{ id: 'f1', name: 'f(x)', expression: 'x^2', color: 'purple' }],
      snapStep: 1,
      snapEnabled: true,
    }

    const serialized = serializeGraphState(state)
    expect(serialized).toContain('Points: A(2, 3), B(-1, 0)')
    expect(serialized).toContain('Line 1')
    expect(serialized).toContain('Functions: f(x): x^2')
  })

  it('normalizes LaTeX fractions and powers for mathematical evaluation', () => {
    expect(normalizeLatexMathExpression('\\frac{1}{3}x')).toBe('((1)/(3))*x')
    expect(normalizeLatexMathExpression('x^{2} - 1')).toBe('x**(2) - 1')
    expect(normalizeLatexMathExpression('\\sqrt{x}')).toBe('Math.sqrt(x)')

    // Evaluating normalized expressions with LaTeX
    expect(evaluateMathExpression('\\frac{1}{2}x + 1', 4)).toBe(3)
    expect(evaluateMathExpression('\\frac{1}{3}x', 9)).toBe(3)
  })

  it('correctly calculates geometric dilations (Before & After) by scale factor k = 1/3', () => {
    // Triangle A(3, 6), B(6, 3), C(0, 0) dilated by factor 1/3 centered at (0, 0)
    const originalPoints = [
      { x: 3, y: 6, label: 'A' },
      { x: 6, y: 3, label: 'B' },
      { x: 0, y: 0, label: 'C' },
    ]

    const dilation = dilatePoints(originalPoints, 1 / 3, { x: 0, y: 0 })
    expect(dilation.type).toBe('reduction')
    expect(dilation.dilatedPoints.length).toBe(3)

    // A'(1, 2)
    expect(dilation.dilatedPoints[0].x).toBeCloseTo(1)
    expect(dilation.dilatedPoints[0].y).toBeCloseTo(2)
    expect(dilation.dilatedPoints[0].label).toBe("A'")

    // B'(2, 1)
    expect(dilation.dilatedPoints[1].x).toBeCloseTo(2)
    expect(dilation.dilatedPoints[1].y).toBeCloseTo(1)
    expect(dilation.dilatedPoints[1].label).toBe("B'")

    // C'(0, 0)
    expect(dilation.dilatedPoints[2].x).toBeCloseTo(0)
    expect(dilation.dilatedPoints[2].y).toBeCloseTo(0)
    expect(dilation.dilatedPoints[2].label).toBe("C'")

    // Dilation mapping strings
    expect(dilation.mappings[0].originalCoords).toBe('(3, 6)')
    expect(dilation.mappings[0].dilatedCoords).toBe('(1, 2)')
  })

  it('serializes shapes and dilations into answer string', () => {
    const state: GraphState = {
      points: [
        { id: '1', label: 'A', x: 3, y: 6, color: 'blue' },
        { id: '2', label: 'B', x: 6, y: 3, color: 'blue' },
      ],
      lines: [],
      functions: [],
      polygons: [
        {
          id: 'poly-1',
          label: 'Triangle ABC',
          points: [
            { x: 3, y: 6, label: 'A' },
            { x: 6, y: 3, label: 'B' },
          ],
          color: '#3B82F6',
          closed: true,
        },
      ],
      dilations: [
        {
          id: 'dil-1',
          label: "Dilated Triangle A'B'C'",
          points: [
            { x: 1, y: 2, label: "A'" },
            { x: 2, y: 1, label: "B'" },
          ],
          color: '#10B981',
          closed: true,
          scaleFactor: 1 / 3,
        },
      ],
      snapStep: 1,
      snapEnabled: true,
    }

    const summary = serializeGraphState(state)
    expect(summary).toContain('Shapes: Triangle ABC [A(3, 6), B(6, 3)]')
    expect(summary).toContain("Dilations: Dilated Triangle A'B'C' (k=0.3333333333333333) [A'(1, 2), B'(2, 1)]")
  })
})
