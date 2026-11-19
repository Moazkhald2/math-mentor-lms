import { useState, useRef, useEffect } from 'react'

export default function Scratchpad() {
  const [isOpen, setIsOpen] = useState(false)
  const [isTransparent, setIsTransparent] = useState(false)
  const [color, setColor] = useState('#0A9396')
  const [lineWidth, setLineWidth] = useState(3)
  const [isEraser, setIsEraser] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<ImageData[]>([])

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const coords = getCanvasCoordinates(e)
    lastPointRef.current = coords

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx) {
      // Save state for undo
      historyRef.current.push(ctx.getImageData(0, 0, canvas!.width, canvas!.height))
      if (historyRef.current.length > 20) historyRef.current.shift()

      ctx.beginPath()
      ctx.arc(coords.x, coords.y, lineWidth / 2, 0, Math.PI * 2)
      ctx.fillStyle = isEraser ? '#ffffff' : color
      ctx.fill()
    }
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const coords = getCanvasCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.strokeStyle = isEraser ? '#ffffff' : color
    ctx.lineWidth = isEraser ? lineWidth * 4 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPointRef.current = coords
  }

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  const undo = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas && historyRef.current.length > 0) {
      const prev = historyRef.current.pop()
      if (prev) ctx.putImageData(prev, 0, 0)
    }
  }

  // Setup canvas resolution
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill initial background white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [isOpen])

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-white"
        aria-label="Open Scratchpad"
      >
        <span>✏️</span>
        <span>Scratchpad</span>
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl border border-border bg-surface shadow-2xl transition-opacity duration-200 ${
        isTransparent ? 'opacity-40 hover:opacity-100' : 'opacity-100'
      }`}
      style={{ width: 'min(500px, 94vw)', height: 'min(460px, 75vh)' }}
    >
      {/* Scratchpad Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-light/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text">✏️ Math Scratchpad</span>
          <button
            type="button"
            onClick={() => setIsTransparent(prev => !prev)}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border transition ${
              isTransparent ? 'border-brand bg-brand/20 text-brand' : 'border-border text-text-muted hover:text-text'
            }`}
            title="Toggle transparency to see questions underneath"
          >
            {isTransparent ? 'Ghost Mode: ON' : 'Ghost Mode'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            className="rounded border border-border px-2 py-0.5 text-text-muted hover:bg-surface hover:text-text"
            title="Undo stroke"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded border border-border px-2 py-0.5 text-danger hover:bg-danger/10"
            title="Clear all"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="ml-1 rounded px-2 py-0.5 font-bold text-text-muted hover:bg-surface hover:text-text"
            aria-label="Close scratchpad"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div className="relative flex-1 bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="h-full w-full cursor-crosshair touch-none"
        />
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2 text-xs">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {[
            { name: 'Teal', hex: '#0A9396' },
            { name: 'Black', hex: '#1D2D44' },
            { name: 'Blue', hex: '#0077B6' },
            { name: 'Red', hex: '#E63946' },
          ].map(c => (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                setColor(c.hex)
                setIsEraser(false)
              }}
              style={{ backgroundColor: c.hex }}
              className={`h-5 w-5 rounded-full border transition-transform ${
                !isEraser && color === c.hex ? 'scale-125 border-text shadow-sm' : 'border-transparent hover:scale-110'
              }`}
              title={c.name}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsEraser(prev => !prev)}
            className={`ml-1 rounded border px-2 py-0.5 font-semibold transition ${
              isEraser ? 'border-danger bg-danger/10 text-danger' : 'border-border text-text-muted hover:text-text'
            }`}
          >
            Eraser
          </button>
        </div>

        {/* Stroke thickness */}
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <span>Width:</span>
          {[2, 4, 6].map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              className={`rounded px-1.5 py-0.5 font-bold ${
                lineWidth === w ? 'bg-brand text-white' : 'border border-border text-text-muted hover:text-text'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
