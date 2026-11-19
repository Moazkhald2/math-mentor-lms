import { useState, useRef, useId, useMemo } from 'react'
import {
  type ViewBounds,
  type PlottedPoint,
  type PlottedLine,
  type PlottedFunction,
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
  serializeGraphState,
} from '../lib/graphMath'

interface CartesianGrapherProps {
  initialState?: Partial<GraphState>
  onInsertAnswer?: (summary: string) => void
  readOnly?: boolean
  className?: string
  width?: number
  height?: number
}

type ActiveTool = 'point' | 'line' | 'function' | 'inequality' | 'pan'

export default function CartesianGrapher({
  initialState,
  onInsertAnswer,
  readOnly = false,
  className = '',
  width = 650,
  height = 550,
}: CartesianGrapherProps) {
  const containerId = useId()

  const [bounds, setBounds] = useState<ViewBounds>(DEFAULT_VIEW_BOUNDS)
  const [activeTool, setActiveTool] = useState<ActiveTool>('point')
  const [snapEnabled, setSnapEnabled] = useState(initialState?.snapEnabled ?? true)
  const [snapStep, setSnapStep] = useState<number>(initialState?.snapStep ?? 1)
  const [showIntersections, setShowIntersections] = useState(true)

  // Plotted elements
  const [points, setPoints] = useState<PlottedPoint[]>(initialState?.points ?? [])
  const [lines, setLines] = useState<PlottedLine[]>(initialState?.lines ?? [])
  const [functions, setFunctions] = useState<PlottedFunction[]>(initialState?.functions ?? [])

  // Two-point line drawing buffer
  const [lineStartPoint, setLineStartPoint] = useState<PlottedPoint | null>(null)

  // Function input form
  const [fnInput, setFnInput] = useState('2x - 1')
  const [ineqSign, setIneqSign] = useState<'<=' | '>=' | '<' | '>'>('<=')

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
  const currentState: GraphState = useMemo(() => ({
    points,
    lines,
    functions,
    snapStep,
    snapEnabled,
  }), [points, lines, functions, snapStep, snapEnabled])

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

    if (activeTool === 'point') {
      // Check if point already exists at this location
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
    } else if (activeTool === 'line') {
      // Find or create point 1
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

  // Add Function Curve
  const handleAddFunction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fnInput.trim()) return

    const color = GRAPH_PALETTE[(functions.length + 2) % GRAPH_PALETTE.length]
    setFunctions((prev) => [
      ...prev,
      {
        id: `fn-${Date.now()}`,
        name: `f${functions.length + 1}(x)`,
        expression: fnInput.trim(),
        color,
        isInequality: activeTool === 'inequality',
        inequalitySign: activeTool === 'inequality' ? ineqSign : undefined,
      },
    ])
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
    setLineStartPoint(null)
  }

  const handleUndo = () => {
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

  // Pixel positions of X and Y axes
  const originScreen = mathToScreen(0, 0, bounds, width, height)

  return (
    <div
      role="region"
      aria-label="Cartesian Coordinate Grapher"
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-md select-none ${className}`}
    >
      {/* Top Toolbar: Mode, Snapping, Zoom, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        {/* Left: Interactive Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTool('point')
              setLineStartPoint(null)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTool === 'point'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-bg text-text hover:border-brand'
            }`}
          >
            <span>📍 Plot Point</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('line')
              setLineStartPoint(null)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTool === 'line'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-bg text-text hover:border-brand'
            }`}
          >
            <span>📏 Line by 2 Points</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('function')
              setLineStartPoint(null)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTool === 'function'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-bg text-text hover:border-brand'
            }`}
          >
            <span>📈 Function y = f(x)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('inequality')
              setLineStartPoint(null)
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTool === 'inequality'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-bg text-text hover:border-brand'
            }`}
          >
            <span>🎨 Shaded Inequality</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('pan')
              setLineStartPoint(null)
            }}
            title="Pan Plane (drag to move axes)"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTool === 'pan'
                ? 'bg-brand text-white shadow-xs'
                : 'border border-border bg-bg text-text hover:border-brand'
            }`}
          >
            <span>✋ Pan</span>
          </button>
        </div>

        {/* Right: Snap, Zoom & Reset */}
        <div className="flex items-center gap-1.5">
          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setSnapEnabled((prev) => !prev)}
            title="Toggle Snap to Grid coordinates"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
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

          {/* Intersection Points toggle */}
          <button
            type="button"
            onClick={() => setShowIntersections((prev) => !prev)}
            title="Toggle showing intersection points"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
              showIntersections
                ? 'border border-amber-500/50 bg-amber-500/10 text-amber-600'
                : 'border border-border bg-bg text-text-muted hover:text-text'
            }`}
          >
            <span>🔍 Crossings: {showIntersections ? 'On' : 'Off'}</span>
          </button>

          {/* Zoom In / Out / Center */}
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
              title="Reset View to (-10 to 10)"
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs font-bold text-text-muted hover:text-text transition"
            >
              Center
            </button>
          </div>
        </div>
      </div>

      {/* Function / Inequality Formula Input Bar */}
      {(activeTool === 'function' || activeTool === 'inequality') && (
        <form
          onSubmit={handleAddFunction}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 p-2.5"
        >
          <span className="font-serif text-sm font-bold text-brand">
            {activeTool === 'inequality' ? 'Inequality:' : 'Equation:'}
          </span>
          <span className="font-serif text-base font-semibold text-text">y</span>

          {activeTool === 'inequality' ? (
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
            placeholder="e.g. 2x - 3 or x^2 - 4"
            className="flex-1 min-w-[160px] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono font-semibold text-ink outline-none focus:border-brand"
          />

          <button
            type="submit"
            className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-light transition active:scale-95"
          >
            Plot Graph
          </button>
        </form>
      )}

      {/* Main SVG Graph Paper Area */}
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
          {activeTool === 'point' && 'Click anywhere to plot a point'}
          {activeTool === 'line' &&
            (!lineStartPoint
              ? 'Click 1st point for line'
              : `Point ${lineStartPoint.label} chosen → Click 2nd point`)}
          {activeTool === 'function' && 'Enter function above & click Plot'}
          {activeTool === 'inequality' && 'Plot inequality region above'}
          {activeTool === 'pan' && 'Drag to pan plane'}
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

          {/* 3. Inequality Shading Regions (Linear Programming / Feasible Regions) */}
          {functions
            .filter((f) => f.isInequality && f.inequalitySign)
            .map((fn) => {
              // Parse simple linear functions for shading
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
          {/* X Axis */}
          <line
            x1={0}
            y1={originScreen.y}
            x2={width}
            y2={originScreen.y}
            stroke="currentColor"
            strokeWidth="2.4"
            className="text-ink"
          />
          {/* Y Axis */}
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

          {/* 5. Plotted Lines */}
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

          {/* 6. Plotted Function Curves */}
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

          {/* 7. Intersection Points Highlight */}
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
                  {/* Outer pulsing ring */}
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
                  {/* Inner dot */}
                  <circle cx={p.x} cy={p.y} r="4.5" fill="#F59E0B" />
                  {/* Label */}
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

          {/* 8. Plotted Points */}
          {points.map((pt) => {
            const p = mathToScreen(pt.x, pt.y, bounds, width, height)
            const isSelected = lineStartPoint?.id === pt.id
            return (
              <g key={pt.id} className="cursor-pointer">
                {/* Highlight ring if selected for line */}
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="none"
                    stroke={pt.color}
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    className="animate-spin"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill={pt.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-sm transition-transform hover:scale-125"
                />
                {/* Point Label: e.g. A(2, 3) */}
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

          {/* 9. Ghost Snap Indicator under Cursor */}
          {snappedCursor && !readOnly && activeTool !== 'pan' && (
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

      {/* Bottom Panel: Plotted Items, Intersections & Answer Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-3">
        {/* Plotted Items Summary / Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
            Items:
          </span>

          {points.length === 0 && lines.length === 0 && functions.length === 0 && (
            <span className="text-text-muted italic">No points or lines plotted yet.</span>
          )}

          {points.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{ borderColor: `${p.color}40`, backgroundColor: `${p.color}15`, color: p.color }}
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

          {lines.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono font-bold text-[11px] border shadow-2xs"
              style={{ borderColor: `${l.color}40`, backgroundColor: `${l.color}15`, color: l.color }}
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
              style={{ borderColor: `${f.color}40`, backgroundColor: `${f.color}15`, color: f.color }}
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

          {intersections.length > 0 && (
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
            disabled={points.length === 0 && lines.length === 0 && functions.length === 0}
            className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text disabled:opacity-40 transition"
          >
            ⎌ Undo
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={points.length === 0 && lines.length === 0 && functions.length === 0}
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
              }}
              disabled={points.length === 0 && lines.length === 0 && functions.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-light active:scale-95 disabled:opacity-40 transition"
            >
              <span>📥 Use Graph as Answer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
