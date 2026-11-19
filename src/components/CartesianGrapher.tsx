import { useState, useRef, useId, useMemo } from 'react'
import {
  type ViewBounds,
  type PlottedPoint,
  type PlottedLine,
  type PlottedFunction,
  type PlottedPolygon,
  type DilationResult,
  type GraphState,
  DEFAULT_VIEW_BOUNDS,
  GRAPH_PALETTE,
  mathToScreen,
  screenToMath,
  snapCoordinate,
  computeLineEquation,
  computeAllIntersections,
  sampleFunctionCurve,
  generateInequalityShading,
  dilatePoints,
  serializeGraphState,
} from '../lib/graphMath'
import MathKeypad, { type KeypadAction } from './MathKeypad'
import { useToast } from '../hooks/useToast'

export interface CartesianGrapherProps {
  initialState?: Partial<GraphState>
  defaultGradeMode?: 'junior' | 'senior'
  onInsertAnswer?: (summary: string) => void
  readOnly?: boolean
  compact?: boolean
  className?: string
  width?: number
  height?: number
}

type SeniorTool = 'point' | 'line' | 'function' | 'inequality' | 'pan'
type JuniorTool = 'point' | 'shape' | 'dilation' | 'pan'

export default function CartesianGrapher({
  initialState,
  defaultGradeMode = 'junior',
  onInsertAnswer,
  readOnly = false,
  compact = false,
  className = '',
  width = 650,
  height = 520,
}: CartesianGrapherProps) {
  const containerId = useId()
  const { toast } = useToast()

  // Grade Mode: Junior (Grades 6-8) vs Senior (Grades 9-12)
  const [gradeMode, setGradeMode] = useState<'junior' | 'senior'>(
    initialState?.gradeMode ?? defaultGradeMode
  )

  const [bounds, setBounds] = useState<ViewBounds>(DEFAULT_VIEW_BOUNDS)
  const [seniorTool, setSeniorTool] = useState<SeniorTool>('point')
  const [juniorTool, setJuniorTool] = useState<JuniorTool>('point')

  const [snapEnabled, setSnapEnabled] = useState(initialState?.snapEnabled ?? true)
  const [snapStep, setSnapStep] = useState<number>(initialState?.snapStep ?? 1)
  const [showIntersections, setShowIntersections] = useState(true)

  // Plotted elements
  const [points, setPoints] = useState<PlottedPoint[]>(initialState?.points ?? [])
  const [lines, setLines] = useState<PlottedLine[]>(initialState?.lines ?? [])
  const [functions, setFunctions] = useState<PlottedFunction[]>(initialState?.functions ?? [])
  const [polygons, setPolygons] = useState<PlottedPolygon[]>(initialState?.polygons ?? [])
  const [dilations, setDilations] = useState<PlottedPolygon[]>(initialState?.dilations ?? [])

  // Junior Mode: Selected vertices to connect into a polygon/line
  const [selectedShapePointIds, setSelectedShapePointIds] = useState<string[]>([])

  // Junior Mode: Dilation settings & result
  const [dilationScaleFactor, setDilationScaleFactor] = useState<number>(1 / 3)
  const [dilationCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [lastDilation, setLastDilation] = useState<DilationResult | null>(null)

  // Senior Mode: Two-point line drawing buffer
  const [lineStartPoint, setLineStartPoint] = useState<PlottedPoint | null>(null)

  // Senior Mode: Function input form & keypad toggle
  const [fnInput, setFnInput] = useState('2x - 1')
  const [ineqSign, setIneqSign] = useState<'<=' | '>=' | '<' | '>'>('<=')
  const [showEquationKeypad, setShowEquationKeypad] = useState(false)

  // Hover cursor state
  const [snappedCursor, setSnappedCursor] = useState<{ x: number; y: number } | null>(null)

  // Pan interaction
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ x: number; y: number; bounds: ViewBounds } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Compute all current intersections between lines
  const intersections = useMemo(() => {
    return computeAllIntersections(lines)
  }, [lines])

  // Current graph state
  const currentState: GraphState = useMemo(
    () => ({
      points,
      lines,
      functions,
      polygons,
      dilations,
      gradeMode,
      snapStep,
      snapEnabled,
    }),
    [points, lines, functions, polygons, dilations, gradeMode, snapStep, snapEnabled]
  )

  // Generate ticks for X and Y axes
  const xTicks = useMemo(() => {
    const ticks: number[] = []
    const step = bounds.xMax - bounds.xMin <= 15 ? 1 : bounds.xMax - bounds.xMin <= 30 ? 2 : 5
    const start = Math.ceil(bounds.xMin / step) * step
    for (let x = start; x <= bounds.xMax; x += step) {
      if (Math.abs(x) > 1e-9) ticks.push(x)
    }
    return ticks
  }, [bounds.xMin, bounds.xMax])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const step = bounds.yMax - bounds.yMin <= 15 ? 1 : bounds.yMax - bounds.yMin <= 30 ? 2 : 5
    const start = Math.ceil(bounds.yMin / step) * step
    for (let y = start; y <= bounds.yMax; y += step) {
      if (Math.abs(y) > 1e-9) ticks.push(y)
    }
    return ticks
  }, [bounds.yMin, bounds.yMax])

  // Coordinate conversion helper
  const getPointerMathCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const math = screenToMath(px, py, bounds, width, height)
    return {
      x: math.x,
      y: math.y,
    }
  }

  // Pointer move: update cursor and snap guide
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      const xSpan = panStartRef.current.bounds.xMax - panStartRef.current.bounds.xMin
      const ySpan = panStartRef.current.bounds.yMax - panStartRef.current.bounds.yMin

      const mathDx = (dx / width) * xSpan
      const mathDy = (dy / height) * ySpan

      setBounds({
        xMin: panStartRef.current.bounds.xMin - mathDx,
        xMax: panStartRef.current.bounds.xMax - mathDx,
        yMin: panStartRef.current.bounds.yMin + mathDy,
        yMax: panStartRef.current.bounds.yMax + mathDy,
      })
      return
    }

    const math = getPointerMathCoords(e)

    if (snapEnabled) {
      const sx = snapCoordinate(math.x, snapStep)
      const sy = snapCoordinate(math.y, snapStep)
      setSnappedCursor({ x: sx, y: sy })
    } else {
      setSnappedCursor({ x: Number(math.x.toFixed(2)), y: Number(math.y.toFixed(2)) })
    }
  }

  // Pointer down: execute tool action
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly) return

    const activeTool = gradeMode === 'junior' ? juniorTool : seniorTool

    if (activeTool === 'pan' || e.button === 1 || e.shiftKey) {
      e.currentTarget.setPointerCapture(e.pointerId)
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        bounds: { ...bounds },
      }
      return
    }

    const math = getPointerMathCoords(e)
    const targetX = snapEnabled ? snapCoordinate(math.x, snapStep) : Number(math.x.toFixed(2))
    const targetY = snapEnabled ? snapCoordinate(math.y, snapStep) : Number(math.y.toFixed(2))

    // 1. Point Plotting (both Junior and Senior)
    if (activeTool === 'point') {
      const existing = points.find(
        (p) => Math.abs(p.x - targetX) < 0.25 && Math.abs(p.y - targetY) < 0.25
      )
      if (existing) return

      const label = String.fromCharCode(65 + (points.length % 26))
      const color = GRAPH_PALETTE[points.length % GRAPH_PALETTE.length]
      setPoints((prev) => [
        ...prev,
        {
          id: `pt-${Date.now()}-${Math.random()}`,
          label,
          x: targetX,
          y: targetY,
          color,
        },
      ])
      return
    }

    // 2. Junior Mode: Shape / Connecting
    if (gradeMode === 'junior' && activeTool === 'shape') {
      // Find clicked point or add new point
      let clickedPt = points.find(
        (p) => Math.abs(p.x - targetX) < 0.35 && Math.abs(p.y - targetY) < 0.35
      )
      if (!clickedPt) {
        const label = String.fromCharCode(65 + (points.length % 26))
        const color = GRAPH_PALETTE[points.length % GRAPH_PALETTE.length]
        clickedPt = {
          id: `pt-${Date.now()}`,
          label,
          x: targetX,
          y: targetY,
          color,
        }
        setPoints((prev) => [...prev, clickedPt!])
      }

      // Toggle selection of this point
      setSelectedShapePointIds((prev) => {
        if (prev.includes(clickedPt!.id)) {
          return prev.filter((id) => id !== clickedPt!.id)
        } else {
          return [...prev, clickedPt!.id]
        }
      })
      return
    }

    // 3. Senior Mode: Line by 2 points
    if (gradeMode === 'senior' && activeTool === 'line') {
      let clickedPt = points.find(
        (p) => Math.abs(p.x - targetX) < 0.35 && Math.abs(p.y - targetY) < 0.35
      )

      if (!clickedPt) {
        const label = String.fromCharCode(65 + (points.length % 26))
        const color = GRAPH_PALETTE[points.length % GRAPH_PALETTE.length]
        clickedPt = {
          id: `pt-${Date.now()}`,
          label,
          x: targetX,
          y: targetY,
          color,
        }
        setPoints((prev) => [...prev, clickedPt!])
      }

      if (!lineStartPoint) {
        setLineStartPoint(clickedPt)
      } else {
        if (lineStartPoint.id !== clickedPt.id) {
          const eq = computeLineEquation(
            { x: lineStartPoint.x, y: lineStartPoint.y },
            { x: clickedPt.x, y: clickedPt.y }
          )
          const color = GRAPH_PALETTE[(lines.length + 1) % GRAPH_PALETTE.length]

          setLines((prev) => [
            ...prev,
            {
              id: `line-${Date.now()}`,
              label: `L${lines.length + 1} (${eq.equation})`,
              point1: { x: lineStartPoint.x, y: lineStartPoint.y },
              point2: { x: clickedPt!.x, y: clickedPt!.y },
              m: eq.m,
              b: eq.b,
              isVertical: eq.isVertical,
              verticalX: eq.verticalX,
              color,
              style: 'solid',
            },
          ])
        }
        setLineStartPoint(null)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanningRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
      isPanningRef.current = false
      panStartRef.current = null
    }
  }

  // Junior Mode: Create polygon/shape from selected points (or all plotted points)
  const handleCreateShape = () => {
    const ptsToUse =
      selectedShapePointIds.length >= 2
        ? points.filter((p) => selectedShapePointIds.includes(p.id))
        : points

    if (ptsToUse.length < 2) {
      toast('Please plot at least 2 points to create a line, angle, or shape!', 'error')
      return
    }

    const labels = ptsToUse.map((p) => p.label).join('')
    const shapeLabel =
      ptsToUse.length === 2
        ? `Segment ${labels}`
        : ptsToUse.length === 3
          ? `Triangle ${labels}`
          : ptsToUse.length === 4
            ? `Quadrilateral ${labels}`
            : `Polygon ${labels}`

    const color = GRAPH_PALETTE[polygons.length % GRAPH_PALETTE.length]
    const newShape: PlottedPolygon = {
      id: `shape-${Date.now()}`,
      label: shapeLabel,
      points: ptsToUse.map((p) => ({ x: p.x, y: p.y, label: p.label })),
      color,
      closed: ptsToUse.length >= 3,
    }

    setPolygons((prev) => [...prev, newShape])
    setSelectedShapePointIds([])
    toast(`Created ${shapeLabel} with ${ptsToUse.length} vertices!`, 'info')
  }

  // Junior Mode: Apply Geometric Dilation ("Before & After")
  const handleApplyDilation = (factor = dilationScaleFactor) => {
    // Target vertices: use latest polygon points, or all plotted points
    const targetPts =
      polygons.length > 0
        ? polygons[polygons.length - 1].points
        : points.length >= 2
          ? points.map((p) => ({ x: p.x, y: p.y, label: p.label }))
          : []

    if (targetPts.length < 2) {
      toast('Plot points or a shape first to apply dilation!', 'error')
      return
    }

    const result = dilatePoints(targetPts, factor, dilationCenter)
    setLastDilation(result)

    const factorStr = factor === 1 / 3 ? '1/3' : factor === 1 / 2 ? '1/2' : factor.toString()
    const dilatedPoly: PlottedPolygon = {
      id: `dil-${Date.now()}`,
      label: `Dilated Shape (k = ${factorStr})`,
      points: result.dilatedPoints,
      color: '#10B981',
      closed: targetPts.length >= 3,
      isDilation: true,
      scaleFactor: factor,
      dilationCenter,
    }

    setDilations([dilatedPoly])
    toast(`Dilated shape by scale factor k = ${factorStr}!`, 'success')
  }

  // Revert / Undo Dilation
  const handleClearDilation = () => {
    setDilations([])
    setLastDilation(null)
    toast('Dilation cleared.', 'info')
  }

  // Senior Mode: Add Function Curve
  const handleAddFunction = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!fnInput.trim()) return

    const color = GRAPH_PALETTE[(functions.length + 2) % GRAPH_PALETTE.length]
    setFunctions((prev) => [
      ...prev,
      {
        id: `fn-${Date.now()}`,
        name: `f${functions.length + 1}(x)`,
        expression: fnInput.trim(),
        color,
        isInequality: seniorTool === 'inequality',
        inequalitySign: seniorTool === 'inequality' ? ineqSign : undefined,
      },
    ])
    setShowEquationKeypad(false)
  }

  // Keypad action on formula input
  const handleKeypadInsert = (action: KeypadAction) => {
    const toInsert = action.latex || action.insert
    setFnInput((prev) => prev + toInsert)
  }

  const handleKeypadBackspace = () => {
    setFnInput((prev) => prev.slice(0, -1))
  }

  const handleKeypadClear = () => {
    setFnInput('')
  }

  // Zoom helpers
  const handleZoom = (factor: number) => {
    const xCenter = (bounds.xMin + bounds.xMax) / 2
    const yCenter = (bounds.yMin + bounds.yMax) / 2
    const xHalf = ((bounds.xMax - bounds.xMin) * factor) / 2
    const yHalf = ((bounds.yMax - bounds.yMin) * factor) / 2

    setBounds({
      xMin: Math.round(xCenter - xHalf),
      xMax: Math.round(xCenter + xHalf),
      yMin: Math.round(yCenter - yHalf),
      yMax: Math.round(yCenter + yHalf),
    })
  }

  const handleResetView = () => {
    setBounds(DEFAULT_VIEW_BOUNDS)
  }

  const handleClearAll = () => {
    setPoints([])
    setLines([])
    setFunctions([])
    setPolygons([])
    setDilations([])
    setLastDilation(null)
    setLineStartPoint(null)
    setSelectedShapePointIds([])
  }

  const handleUndo = () => {
    if (dilations.length > 0) {
      setDilations([])
      setLastDilation(null)
      return
    }
    if (polygons.length > 0) {
      setPolygons((prev) => prev.slice(0, -1))
      return
    }
    if (lineStartPoint) {
      setLineStartPoint(null)
      return
    }
    if (functions.length > 0) {
      setFunctions((prev) => prev.slice(0, -1))
      return
    }
    if (lines.length > 0) {
      setLines((prev) => prev.slice(0, -1))
      return
    }
    if (points.length > 0) {
      setPoints((prev) => prev.slice(0, -1))
    }
  }

  // Origin pixel positions
  const originScreen = mathToScreen(0, 0, bounds, width, height)

  const hasAnyItems =
    points.length > 0 ||
    lines.length > 0 ||
    functions.length > 0 ||
    polygons.length > 0 ||
    dilations.length > 0

  return (
    <div
      role="region"
      aria-label="Cartesian Coordinate Grapher"
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-md select-none ${
        compact ? 'p-2.5 sm:p-3' : 'p-4'
      } ${className}`}
    >
      {/* 1. Grade Mode Selector & Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Mode:
          </span>
          <div className="flex items-center rounded-lg border border-border bg-bg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setGradeMode('junior')
                setJuniorTool('point')
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                gradeMode === 'junior'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span>🎒 Junior (Grades 6–8)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGradeMode('senior')
                setSeniorTool('point')
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                gradeMode === 'senior'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span>🎓 Senior (Grades 9–12)</span>
            </button>
          </div>
        </div>

        {/* Snap & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSnapEnabled((prev) => !prev)}
            title="Toggle Snap to Grid coordinates"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              snapEnabled
                ? 'border border-brand/50 bg-brand/10 text-brand'
                : 'border border-border bg-bg text-text-muted hover:text-text'
            }`}
          >
            <span>🧲 Snap: {snapEnabled ? `On (${snapStep})` : 'Off'}</span>
          </button>

          {snapEnabled && (
            <select
              value={snapStep}
              onChange={(e) => setSnapStep(Number(e.target.value))}
              aria-label="Snap Step"
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs font-semibold text-text outline-none"
            >
              <option value="1">1 unit</option>
              <option value="0.5">0.5 unit</option>
              <option value="0.25">0.25 unit</option>
            </select>
          )}

          {gradeMode === 'senior' && (
            <button
              type="button"
              onClick={() => setShowIntersections((prev) => !prev)}
              title="Toggle showing intersection points"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
                showIntersections
                  ? 'border border-amber-500/50 bg-amber-500/10 text-amber-600'
                  : 'border border-border bg-bg text-text-muted hover:text-text'
              }`}
            >
              <span>🔍 Crossings: {showIntersections ? 'On' : 'Off'}</span>
            </button>
          )}

          {/* Zoom In / Out / Reset */}
          <div className="flex items-center gap-1 border-l border-border/60 pl-2">
            <button
              type="button"
              onClick={() => handleZoom(0.8)}
              aria-label="Zoom In"
              title="Zoom In (+)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg text-xs font-bold hover:border-brand transition"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1.25)}
              aria-label="Zoom Out"
              title="Zoom Out (-)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg text-xs font-bold hover:border-brand transition"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleResetView}
              title="Center View to Origin"
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs font-bold text-text-muted hover:text-text transition"
            >
              Center
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Toolbars by Grade */}
      {gradeMode === 'junior' ? (
        /* Junior Toolbar: Plot Points, Connect Shapes, Dilation Tool */
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg/70 p-2 border border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setJuniorTool('point')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                juniorTool === 'point'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>📍 Plot Points</span>
            </button>

            <button
              type="button"
              onClick={() => setJuniorTool('shape')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                juniorTool === 'shape'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>📐 Connect Shape</span>
            </button>

            <button
              type="button"
              onClick={() => setJuniorTool('dilation')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                juniorTool === 'dilation'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
              }`}
            >
              <span>🔍 Dilation (Scale Factor)</span>
            </button>

            <button
              type="button"
              onClick={() => setJuniorTool('pan')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                juniorTool === 'pan'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>✋ Pan</span>
            </button>
          </div>

          {/* Quick Action for Shapes */}
          {juniorTool === 'shape' && (
            <button
              type="button"
              onClick={handleCreateShape}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-light transition active:scale-95"
            >
              ✓ Connect Plotted Vertices ({selectedShapePointIds.length || points.length})
            </button>
          )}
        </div>
      ) : (
        /* Senior Toolbar: Points, Lines, Functions, Inequalities, Pan */
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg/70 p-2 border border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSeniorTool('point')
                setLineStartPoint(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                seniorTool === 'point'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>📍 Plot Point</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeniorTool('line')
                setLineStartPoint(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                seniorTool === 'line'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>📏 Line by 2 Points</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeniorTool('function')
                setLineStartPoint(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                seniorTool === 'function'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>📈 Function y = f(x)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeniorTool('inequality')
                setLineStartPoint(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                seniorTool === 'inequality'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>🎨 Shaded Inequality</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeniorTool('pan')
                setLineStartPoint(null)
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                seniorTool === 'pan'
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              <span>✋ Pan</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Junior Mode: Dilation Control Panel */}
      {gradeMode === 'junior' && juniorTool === 'dilation' && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                Scale Factor (k):
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'k = 1/3', value: 1 / 3 },
                  { label: 'k = 1/2', value: 0.5 },
                  { label: 'k = 2', value: 2 },
                  { label: 'k = 3', value: 3 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setDilationScaleFactor(item.value)
                      handleApplyDilation(item.value)
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      Math.abs(dilationScaleFactor - item.value) < 1e-4
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-emerald-500/30 bg-surface text-text hover:border-emerald-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyDilation(dilationScaleFactor)}
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
              >
                ✨ Apply Dilation (Before & After)
              </button>

              {dilations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearDilation}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:text-danger transition"
                >
                  Clear Dilation
                </button>
              )}
            </div>
          </div>

          {/* Educational Dilation Transformation Breakdown */}
          {lastDilation && (
            <div className="rounded-lg border border-emerald-500/25 bg-surface p-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  Transformation Rule: (x, y) → ({dilationScaleFactor === 1 / 3 ? '1/3' : dilationScaleFactor}x, {dilationScaleFactor === 1 / 3 ? '1/3' : dilationScaleFactor}y)
                </span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-[11px] text-emerald-800 dark:text-emerald-200 capitalize">
                  {lastDilation.type} (Scale factor {dilationScaleFactor === 1 / 3 ? '1/3' : dilationScaleFactor})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 font-mono">
                {lastDilation.mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-md bg-bg px-2 py-1 border border-border/60"
                  >
                    <span className="text-brand font-bold">
                      {m.original}{m.originalCoords}
                    </span>
                    <span className="text-text-muted">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {m.dilated}{m.dilatedCoords}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Senior Mode: Function & Inequality Formula Input Bar with Math Keypad */}
      {gradeMode === 'senior' &&
        (seniorTool === 'function' || seniorTool === 'inequality') && (
          <div className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand/5 p-2.5">
            <form
              onSubmit={handleAddFunction}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="font-serif text-sm font-bold text-brand">
                {seniorTool === 'inequality' ? 'Inequality:' : 'Equation:'}
              </span>
              <span className="font-serif text-base font-semibold text-text">y</span>

              {seniorTool === 'inequality' ? (
                <select
                  value={ineqSign}
                  onChange={(e) => setIneqSign(e.target.value as any)}
                  aria-label="Inequality Sign"
                  className="rounded-lg border border-brand/40 bg-surface px-2 py-1 font-bold text-text outline-none"
                >
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                  <option value="<">&lt;</option>
                  <option value=">">&gt;</option>
                </select>
              ) : (
                <span className="font-serif text-base font-semibold text-text">=</span>
              )}

              <input
                type="text"
                value={fnInput}
                onChange={(e) => setFnInput(e.target.value)}
                placeholder="e.g. 2x - 3 or x^2 - 4 or \frac{1}{2}x"
                className="flex-1 min-w-[160px] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono font-semibold text-ink outline-none focus:border-brand"
              />

              <button
                type="button"
                onClick={() => setShowEquationKeypad((prev) => !prev)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                  showEquationKeypad
                    ? 'border-brand bg-brand/20 text-brand'
                    : 'border-border bg-surface text-text hover:border-brand'
                }`}
              >
                <span>⌨️</span>
                <span>{showEquationKeypad ? 'Hide Keypad' : 'Math Keypad'}</span>
              </button>

              <button
                type="submit"
                className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-light transition active:scale-95"
              >
                Plot Graph
              </button>
            </form>

            {/* Embedded Math Keypad for Formula Input */}
            {showEquationKeypad && (
              <div className="pt-1.5 border-t border-brand/20">
                <MathKeypad
                  onInsert={handleKeypadInsert}
                  onBackspace={handleKeypadBackspace}
                  onClear={handleKeypadClear}
                />
              </div>
            )}
          </div>
        )}

      {/* 5. Main SVG Graph Paper Area */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-[#FBFDFB] dark:bg-[#151921] shadow-inner flex justify-center">
        {/* Live Coordinate Badge */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2 rounded-lg bg-surface/90 px-2.5 py-1 text-xs font-mono font-bold text-text border border-border/80 shadow-2xs backdrop-blur-xs">
          <span>Coords:</span>
          <span className="text-brand">
            {snappedCursor ? `(${snappedCursor.x}, ${snappedCursor.y})` : '(0, 0)'}
          </span>
        </div>

        {/* Status Prompt */}
        <div className="absolute top-2.5 left-2.5 z-10 rounded-lg bg-surface/90 px-2.5 py-1 text-xs font-semibold text-text-muted border border-border/80 shadow-2xs backdrop-blur-xs">
          {gradeMode === 'junior' && (
            <>
              {juniorTool === 'point' && 'Click grid to plot integer points (A, B, C...)'}
              {juniorTool === 'shape' &&
                'Click points to select vertices → Click "Connect Plotted Vertices"'}
              {juniorTool === 'dilation' &&
                'Choose scale factor k (e.g. 1/3) & click "Apply Dilation"'}
              {juniorTool === 'pan' && 'Drag to move coordinate axes'}
            </>
          )}
          {gradeMode === 'senior' && (
            <>
              {seniorTool === 'point' && 'Click anywhere to plot a point'}
              {seniorTool === 'line' &&
                (!lineStartPoint
                  ? 'Click 1st point for line'
                  : `Point ${lineStartPoint.label} chosen → Click 2nd point`)}
              {seniorTool === 'function' && 'Enter function above & click Plot'}
              {seniorTool === 'inequality' && 'Plot inequality region above'}
              {seniorTool === 'pan' && 'Drag to pan plane'}
            </>
          )}
        </div>

        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="cursor-crosshair touch-none select-none max-w-full"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern
              id={`grid-minor-${containerId}`}
              width={width / (bounds.xMax - bounds.xMin)}
              height={height / (bounds.yMax - bounds.yMin)}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${width / (bounds.xMax - bounds.xMin)} 0 L 0 0 0 ${height / (bounds.yMax - bounds.yMin)}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                className="text-border/60"
              />
            </pattern>
          </defs>

          {/* 1. Minor Grid Lines (Graph Paper effect) */}
          <rect width={width} height={height} fill={`url(#grid-minor-${containerId})`} />

          {/* 2. Major Grid Lines */}
          {xTicks.map((x) => {
            const p = mathToScreen(x, 0, bounds, width, height)
            return (
              <line
                key={`major-x-${x}`}
                x1={p.x}
                y1={0}
                x2={p.x}
                y2={height}
                stroke="currentColor"
                strokeWidth={Math.abs(x) % 5 === 0 ? '1.2' : '0.8'}
                className="text-border/80"
              />
            )
          })}
          {yTicks.map((y) => {
            const p = mathToScreen(0, y, bounds, width, height)
            return (
              <line
                key={`major-y-${y}`}
                x1={0}
                y1={p.y}
                x2={width}
                y2={p.y}
                stroke="currentColor"
                strokeWidth={Math.abs(y) % 5 === 0 ? '1.2' : '0.8'}
                className="text-border/80"
              />
            )
          })}

          {/* 3. Inequality Shading Regions (Linear Programming) */}
          {functions
            .filter((f) => f.isInequality && f.inequalitySign)
            .map((fn) => {
              const mMatch = fn.expression.match(/([+-]?\d*\.?\d*)\s*\*?\s*x/i)
              const bMatch = fn.expression.match(/([+-]\s*\d+\.?\d*)$/)
              let m = 1
              let b = 0
              if (mMatch) {
                const rawM = mMatch[1].replace(/\s+/g, '')
                m = rawM === '-' ? -1 : rawM === '+' || rawM === '' ? 1 : parseFloat(rawM)
              }
              if (bMatch) {
                b = parseFloat(bMatch[1].replace(/\s+/g, ''))
              }

              const shadingPath = generateInequalityShading(
                { id: fn.id, label: fn.name, m, b, color: fn.color },
                fn.inequalitySign!,
                bounds,
                width,
                height
              )

              if (!shadingPath) return null

              return (
                <path
                  key={`shading-${fn.id}`}
                  d={shadingPath}
                  fill={fn.color}
                  fillOpacity="0.18"
                />
              )
            })}

          {/* 4. Cartesian Axes (X and Y with Arrowheads) */}
          <line
            x1={0}
            y1={originScreen.y}
            x2={width}
            y2={originScreen.y}
            stroke="currentColor"
            strokeWidth="2.4"
            className="text-ink"
          />
          <line
            x1={originScreen.x}
            y1={0}
            x2={originScreen.x}
            y2={height}
            stroke="currentColor"
            strokeWidth="2.4"
            className="text-ink"
          />

          {/* Axis Labels (+x, -x, +y, -y) */}
          <text
            x={width - 18}
            y={Math.min(Math.max(originScreen.y - 8, 20), height - 10)}
            fill="currentColor"
            className="text-xs font-serif font-bold text-ink"
          >
            +x
          </text>
          <text
            x={Math.min(Math.max(originScreen.x + 8, 10), width - 30)}
            y={18}
            fill="currentColor"
            className="text-xs font-serif font-bold text-ink"
          >
            +y
          </text>

          {/* Ticks and Numbers on X Axis */}
          {xTicks.map((x) => {
            const p = mathToScreen(x, 0, bounds, width, height)
            return (
              <g key={`xtick-${x}`}>
                <line
                  x1={p.x}
                  y1={originScreen.y - 4}
                  x2={p.x}
                  y2={originScreen.y + 4}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-ink"
                />
                <text
                  x={p.x}
                  y={Math.min(Math.max(originScreen.y + 16, 20), height - 6)}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[10px] font-mono font-semibold text-text-muted"
                >
                  {x}
                </text>
              </g>
            )
          })}

          {/* Ticks and Numbers on Y Axis */}
          {yTicks.map((y) => {
            const p = mathToScreen(0, y, bounds, width, height)
            return (
              <g key={`ytick-${y}`}>
                <line
                  x1={originScreen.x - 4}
                  y1={p.y}
                  x2={originScreen.x + 4}
                  y2={p.y}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-ink"
                />
                <text
                  x={Math.min(Math.max(originScreen.x - 8, 15), width - 15)}
                  y={p.y + 3.5}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[10px] font-mono font-semibold text-text-muted"
                >
                  {y}
                </text>
              </g>
            )
          })}

          {/* Origin Label (0, 0) */}
          <text
            x={originScreen.x - 8}
            y={originScreen.y + 14}
            textAnchor="end"
            fill="currentColor"
            className="text-[11px] font-serif font-bold text-text-muted"
          >
            0
          </text>

          {/* 5. Plotted Shapes / Polygons (Junior Mode: Triangles, Polygons, Angles) */}
          {polygons.map((poly) => {
            const ptsStr = poly.points
              .map((pt) => {
                const s = mathToScreen(pt.x, pt.y, bounds, width, height)
                return `${s.x},${s.y}`
              })
              .join(' ')

            return (
              <g key={poly.id}>
                {poly.closed ? (
                  <polygon
                    points={ptsStr}
                    fill={poly.color}
                    fillOpacity="0.18"
                    stroke={poly.color}
                    strokeWidth="2.6"
                    className="transition-all"
                  />
                ) : (
                  <polyline
                    points={ptsStr}
                    fill="none"
                    stroke={poly.color}
                    strokeWidth="2.6"
                  />
                )}
              </g>
            )
          })}

          {/* 6. Geometric Dilations (Before & After) with Projection Rays */}
          {dilations.map((dil) => {
            const ptsStr = dil.points
              .map((pt) => {
                const s = mathToScreen(pt.x, pt.y, bounds, width, height)
                return `${s.x},${s.y}`
              })
              .join(' ')

            const centerScreen = mathToScreen(
              dil.dilationCenter?.x ?? 0,
              dil.dilationCenter?.y ?? 0,
              bounds,
              width,
              height
            )

            return (
              <g key={dil.id}>
                {/* Dilation projection rays from origin through vertices */}
                {dil.points.map((pt, i) => {
                  const pScreen = mathToScreen(pt.x, pt.y, bounds, width, height)
                  return (
                    <line
                      key={`ray-${i}`}
                      x1={centerScreen.x}
                      y1={centerScreen.y}
                      x2={pScreen.x}
                      y2={pScreen.y}
                      stroke="#10B981"
                      strokeWidth="1.2"
                      strokeDasharray="3,3"
                      opacity="0.8"
                    />
                  )
                })}

                {/* Dilated Polygon / Shape */}
                {dil.closed ? (
                  <polygon
                    points={ptsStr}
                    fill="#10B981"
                    fillOpacity="0.22"
                    stroke="#10B981"
                    strokeWidth="2.8"
                    strokeDasharray="6,4"
                  />
                ) : (
                  <polyline
                    points={ptsStr}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.8"
                    strokeDasharray="6,4"
                  />
                )}

                {/* Dilated Vertices & Prime Labels (A', B', C'...) */}
                {dil.points.map((pt, i) => {
                  const pScreen = mathToScreen(pt.x, pt.y, bounds, width, height)
                  return (
                    <g key={`dil-pt-${i}`}>
                      <circle
                        cx={pScreen.x}
                        cy={pScreen.y}
                        r="6"
                        fill="#10B981"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={pScreen.x + 8}
                        y={pScreen.y - 8}
                        fill="#059669"
                        className="text-xs font-serif font-extrabold filter drop-shadow-xs"
                      >
                        {pt.label}({pt.x}, {pt.y})
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* 7. Plotted Lines */}
          {lines.map((l) => {
            let pStart: { x: number; y: number }
            let pEnd: { x: number; y: number }

            if (l.isVertical && l.verticalX !== undefined) {
              pStart = mathToScreen(l.verticalX, bounds.yMin, bounds, width, height)
              pEnd = mathToScreen(l.verticalX, bounds.yMax, bounds, width, height)
            } else if (l.m !== undefined && l.b !== undefined) {
              const yLeft = l.m * bounds.xMin + l.b
              const yRight = l.m * bounds.xMax + l.b
              pStart = mathToScreen(bounds.xMin, yLeft, bounds, width, height)
              pEnd = mathToScreen(bounds.xMax, yRight, bounds, width, height)
            } else {
              return null
            }

            return (
              <g key={l.id}>
                <line
                  x1={pStart.x}
                  y1={pStart.y}
                  x2={pEnd.x}
                  y2={pEnd.y}
                  stroke={l.color}
                  strokeWidth="2.6"
                  strokeDasharray={l.style === 'dashed' ? '5,5' : undefined}
                />
              </g>
            )
          })}

          {/* 8. Plotted Function Curves */}
          {functions.map((fn) => {
            const path = sampleFunctionCurve(fn.expression, bounds, width, height)
            if (!path) return null
            return (
              <path
                key={fn.id}
                d={path}
                fill="none"
                stroke={fn.color}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {/* 9. Intersection Points Highlight */}
          {showIntersections &&
            intersections.map((intPt) => {
              const p = mathToScreen(intPt.x, intPt.y, bounds, width, height)
              if (
                intPt.x < bounds.xMin ||
                intPt.x > bounds.xMax ||
                intPt.y < bounds.yMin ||
                intPt.y > bounds.yMax
              ) {
                return null
              }

              return (
                <g key={intPt.id} className="transition-transform">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="9"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    className="animate-pulse"
                  />
                  <circle cx={p.x} cy={p.y} r="4.5" fill="#F59E0B" />
                  <rect
                    x={p.x + 8}
                    y={p.y - 20}
                    width={56}
                    height={18}
                    rx="4"
                    fill="currentColor"
                    className="text-surface border border-amber-500/50 shadow-xs"
                  />
                  <text
                    x={p.x + 12}
                    y={p.y - 7}
                    fill="#D97706"
                    className="text-[10px] font-mono font-bold"
                  >
                    ({intPt.x}, {intPt.y})
                  </text>
                </g>
              )
            })}

          {/* 10. Plotted Points (Original Vertices) */}
          {points.map((pt) => {
            const p = mathToScreen(pt.x, pt.y, bounds, width, height)
            const isSelectedForLine = lineStartPoint?.id === pt.id
            const isSelectedForShape = selectedShapePointIds.includes(pt.id)

            return (
              <g key={pt.id} className="cursor-pointer">
                {/* Highlight ring if selected */}
                {(isSelectedForLine || isSelectedForShape) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="13"
                    fill="none"
                    stroke={pt.color}
                    strokeWidth="2.2"
                    strokeDasharray="4,3"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6.5"
                  fill={pt.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-sm transition-transform hover:scale-125"
                />
                <text
                  x={p.x + 8}
                  y={p.y - 8}
                  fill="currentColor"
                  className="text-xs font-serif font-extrabold text-ink filter drop-shadow-xs"
                >
                  {pt.label}({pt.x}, {pt.y})
                </text>
              </g>
            )
          })}

          {/* 11. Ghost Snap Indicator under Cursor */}
          {snappedCursor && !readOnly && seniorTool !== 'pan' && juniorTool !== 'pan' && (
            <circle
              cx={mathToScreen(snappedCursor.x, snappedCursor.y, bounds, width, height).x}
              cy={mathToScreen(snappedCursor.x, snappedCursor.y, bounds, width, height).y}
              r="7"
              fill="none"
              stroke="#0A9396"
              strokeWidth="1.8"
              strokeDasharray="2,2"
              className="opacity-75 pointer-events-none"
            />
          )}
        </svg>
      </div>

      {/* 6. Bottom Panel: Plotted Items, Intersections & Answer Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-2.5">
        {/* Plotted Items Summary / Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
            Items:
          </span>

          {!hasAnyItems && (
            <span className="text-text-muted italic">No points, lines or shapes plotted yet.</span>
          )}

          {points.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{
                borderColor: `${p.color}40`,
                backgroundColor: `${p.color}15`,
                color: p.color,
              }}
            >
              <span>{p.label}({p.x}, {p.y})</span>
              <button
                type="button"
                onClick={() => setPoints((prev) => prev.filter((x) => x.id !== p.id))}
                className="hover:opacity-75 ml-0.5"
                title="Remove point"
              >
                ×
              </button>
            </span>
          ))}

          {polygons.map((poly) => (
            <span
              key={poly.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{
                borderColor: `${poly.color}40`,
                backgroundColor: `${poly.color}15`,
                color: poly.color,
              }}
            >
              <span>{poly.label}</span>
              <button
                type="button"
                onClick={() => setPolygons((prev) => prev.filter((x) => x.id !== poly.id))}
                className="hover:opacity-75 ml-0.5"
                title="Remove shape"
              >
                ×
              </button>
            </span>
          ))}

          {dilations.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs"
            >
              <span>
                {d.label} (k = {d.scaleFactor === 1 / 3 ? '1/3' : d.scaleFactor})
              </span>
              <button
                type="button"
                onClick={handleClearDilation}
                className="hover:opacity-75 ml-0.5"
                title="Remove dilation"
              >
                ×
              </button>
            </span>
          ))}

          {lines.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{
                borderColor: `${l.color}40`,
                backgroundColor: `${l.color}15`,
                color: l.color,
              }}
            >
              <span>{l.label}</span>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                className="hover:opacity-75 ml-0.5"
                title="Remove line"
              >
                ×
              </button>
            </span>
          ))}

          {functions.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{
                borderColor: `${f.color}40`,
                backgroundColor: `${f.color}15`,
                color: f.color,
              }}
            >
              <span>
                {f.name}: y {f.inequalitySign || '='} {f.expression}
              </span>
              <button
                type="button"
                onClick={() => setFunctions((prev) => prev.filter((x) => x.id !== f.id))}
                className="hover:opacity-75 ml-0.5"
                title="Remove function"
              >
                ×
              </button>
            </span>
          ))}

          {gradeMode === 'senior' && intersections.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border border-amber-500/40 bg-amber-500/15 text-amber-600">
              <span>Crossing: {intersections.map((i) => `(${i.x}, ${i.y})`).join(', ')}</span>
            </span>
          )}
        </div>

        {/* Action Buttons: Undo, Clear, and Insert Graph into Answer */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!hasAnyItems}
            className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text disabled:opacity-40 transition"
          >
            ⎌ Undo
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={!hasAnyItems}
            className="rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-40 transition"
          >
            Clear All
          </button>

          {onInsertAnswer && (
            <button
              type="button"
              onClick={() => {
                const summary = serializeGraphState(currentState)
                onInsertAnswer(summary)
                toast('✅ Graph attached to question answer!', 'success')
              }}
              disabled={!hasAnyItems}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-light active:scale-95 disabled:opacity-40 transition"
            >
              <span>📥 Attach Graph to Answer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
