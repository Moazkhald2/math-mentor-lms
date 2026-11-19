import { useState } from 'react'
import CartesianGrapher from '../components/CartesianGrapher'
import { type GraphState } from '../lib/graphMath'

export default function GrapherPage() {
  const [graphState, setGraphState] = useState<Partial<GraphState>>({
    points: [
      { id: 'p1', label: 'A', x: 2, y: 3, color: '#0A9396' },
      { id: 'p2', label: 'B', x: -2, y: -1, color: '#3B82F6' },
    ],
    lines: [
      {
        id: 'l1',
        label: 'L1 (y = x + 1)',
        point1: { x: 2, y: 3 },
        point2: { x: -2, y: -1 },
        m: 1,
        b: 1,
        color: '#0A9396',
        style: 'solid',
      },
      {
        id: 'l2',
        label: 'L2 (y = -x + 3)',
        point1: { x: 0, y: 3 },
        point2: { x: 3, y: 0 },
        m: -1,
        b: 3,
        color: '#EC4899',
        style: 'solid',
      },
    ],
    functions: [],
    snapStep: 1,
    snapEnabled: true,
  })

  // Quick preset loader
  const loadPreset = (preset: 'system' | 'optimization' | 'parabola') => {
    if (preset === 'system') {
      setGraphState({
        points: [],
        lines: [
          { id: 'l1', label: 'y = 2x - 1', m: 2, b: -1, color: '#0A9396', style: 'solid' },
          { id: 'l2', label: 'y = -x + 5', m: -1, b: 5, color: '#3B82F6', style: 'solid' },
        ],
        functions: [],
        snapStep: 1,
        snapEnabled: true,
      })
    } else if (preset === 'optimization') {
      setGraphState({
        points: [
          { id: 'v1', label: 'O', x: 0, y: 0, color: '#10B981' },
          { id: 'v2', label: 'P1', x: 0, y: 4, color: '#10B981' },
          { id: 'v3', label: 'P2', x: 3, y: 2, color: '#10B981' },
          { id: 'v4', label: 'P3', x: 4, y: 0, color: '#10B981' },
        ],
        lines: [
          { id: 'l1', label: 'y <= -0.67x + 4', m: -0.667, b: 4, color: '#3B82F6', style: 'solid' },
          { id: 'l2', label: 'y <= -2x + 8', m: -2, b: 8, color: '#8B5CF6', style: 'solid' },
          { id: 'axis-x', label: 'y >= 0', m: 0, b: 0, color: '#0A9396', style: 'solid' },
          { id: 'axis-y', label: 'x >= 0', isVertical: true, verticalX: 0, color: '#0A9396', style: 'solid' },
        ],
        functions: [
          { id: 'f1', name: 'Feasible Region 1', expression: '-0.67x + 4', color: '#3B82F6', isInequality: true, inequalitySign: '<=' },
          { id: 'f2', name: 'Feasible Region 2', expression: '-2x + 8', color: '#8B5CF6', isInequality: true, inequalitySign: '<=' },
        ],
        snapStep: 1,
        snapEnabled: true,
      })
    } else if (preset === 'parabola') {
      setGraphState({
        points: [],
        lines: [
          { id: 'l1', label: 'y = x - 2', m: 1, b: -2, color: '#3B82F6', style: 'solid' },
        ],
        functions: [
          { id: 'fn1', name: 'y = x² - 4', expression: 'x^2 - 4', color: '#0A9396' },
        ],
        snapStep: 1,
        snapEnabled: true,
      })
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📈</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Digital Graph Paper & Grapher
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Interactive Cartesian coordinate plane: plot points with snapping, draw lines and functions, find intersection points, and model linear optimization.
          </p>
        </div>

        {/* Quick Example Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs font-bold text-text-muted mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('system')}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text hover:border-brand transition"
          >
            System of Equations
          </button>
          <button
            type="button"
            onClick={() => loadPreset('optimization')}
            className="rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand/20 transition"
          >
            Linear Optimization
          </button>
          <button
            type="button"
            onClick={() => loadPreset('parabola')}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text hover:border-brand transition"
          >
            Parabola & Line
          </button>
        </div>
      </div>

      {/* Main Grapher Component */}
      <div className="flex justify-center">
        <CartesianGrapher
          key={JSON.stringify(graphState)}
          initialState={graphState}
          width={760}
          height={560}
          className="w-full max-w-4xl"
        />
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1.5">
          <div className="text-lg">🧲 Snap to Grid</div>
          <p className="text-xs text-text-muted">
            Points automatically snap to clean whole or half integers ($1, 0.5, 0.25$) on the grid paper, eliminating clumsy mouse misalignment.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1.5">
          <div className="text-lg">🔍 Intersection Points</div>
          <p className="text-xs text-text-muted">
            The grapher automatically calculates and highlights exact crossing coordinates $(x, y)$ between intersecting lines and curves in real time.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1.5">
          <div className="text-lg">🎨 Linear Optimization</div>
          <p className="text-xs text-text-muted">
            Plot inequalities like $y \le 2x + 1$ or $x \ge 0$ with semi-transparent shading to visualize the feasible region and corner vertices.
          </p>
        </div>
      </div>
    </div>
  )
}
