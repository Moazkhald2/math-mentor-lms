import { useState, useRef, useEffect } from 'react'
import {
  parseMathTemplate,
  formatMathTemplate,
  type TemplateType,
  type TemplateState,
} from '../lib/mathTemplates'
import LatexRenderer from './LatexRenderer'

interface VisualMathEditorProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  onActiveFieldRef?: (ref: HTMLInputElement | null) => void
}

export default function VisualMathEditor({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Type your answer...',
  onActiveFieldRef,
}: VisualMathEditorProps) {
  const [state, setState] = useState<TemplateState>(() => parseMathTemplate(value))
  const [activeField, setActiveField] = useState<string>('num')

  const numRef = useRef<HTMLInputElement>(null)
  const denRef = useRef<HTMLInputElement>(null)
  const baseRef = useRef<HTMLInputElement>(null)
  const expRef = useRef<HTMLInputElement>(null)
  const radRef = useRef<HTMLInputElement>(null)
  const appRef = useRef<HTMLInputElement>(null)
  const exprRef = useRef<HTMLInputElement>(null)
  const rawRef = useRef<HTMLInputElement>(null)

  // Keep internal state in sync with external value prop
  useEffect(() => {
    const parsed = parseMathTemplate(value)
    setState((prev) => {
      // If the template is identical and formatted value equals value, retain state
      const currentFormatted = formatMathTemplate(prev)
      if (currentFormatted === value) return prev
      return parsed
    })
  }, [value])

  // Report active input element ref to parent for keypad insertions
  const updateActiveRef = (field: string) => {
    setActiveField(field)
    if (!onActiveFieldRef) return

    switch (field) {
      case 'num':
        onActiveFieldRef(numRef.current)
        break
      case 'den':
        onActiveFieldRef(denRef.current)
        break
      case 'base':
        onActiveFieldRef(baseRef.current)
        break
      case 'exp':
        onActiveFieldRef(expRef.current)
        break
      case 'radicand':
        onActiveFieldRef(radRef.current)
        break
      case 'approaches':
        onActiveFieldRef(appRef.current)
        break
      case 'expr':
        onActiveFieldRef(exprRef.current)
        break
      case 'raw':
      default:
        onActiveFieldRef(rawRef.current)
        break
    }
  }

  const handleStateChange = (updates: Partial<TemplateState>) => {
    if (disabled) return
    const nextState = { ...state, ...updates }
    setState(nextState)
    const formatted = formatMathTemplate(nextState)
    onChange(formatted)
  }

  const handleTemplateSwitch = (newTemplate: TemplateType) => {
    if (disabled) return
    const updates: Partial<TemplateState> = { template: newTemplate }

    // Smart migration of values when switching templates
    if (newTemplate === 'fraction' && !state.num) {
      updates.num = state.raw || state.base || state.radicand || ''
      updates.den = state.den || ''
      setTimeout(() => {
        numRef.current?.focus()
        updateActiveRef('num')
      }, 50)
    } else if (newTemplate === 'power' && !state.base) {
      updates.base = state.raw || state.num || 'x'
      updates.exp = state.exp || ''
      setTimeout(() => {
        expRef.current?.focus()
        updateActiveRef('exp')
      }, 50)
    } else if (newTemplate === 'root' && !state.radicand) {
      updates.radicand = state.raw || state.num || ''
      setTimeout(() => {
        radRef.current?.focus()
        updateActiveRef('radicand')
      }, 50)
    } else if (newTemplate === 'limit') {
      updates.approaches = state.approaches || '0'
      updates.expr = state.raw || state.num || ''
      setTimeout(() => {
        exprRef.current?.focus()
        updateActiveRef('expr')
      }, 50)
    } else if (newTemplate === 'expression') {
      updates.raw = formatMathTemplate(state)
      setTimeout(() => {
        rawRef.current?.focus()
        updateActiveRef('raw')
      }, 50)
    }

    handleStateChange(updates)
  }

  const currentFormatted = formatMathTemplate(state)

  return (
    <div
      role="region"
      aria-label="Visual Math Editor"
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-4 ${className}`}
    >
      {/* Template Selector Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted mr-1">
          Format:
        </span>
        <button
          type="button"
          onClick={() => handleTemplateSwitch('fraction')}
          aria-label="Format as Fraction"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            state.template === 'fraction'
              ? 'bg-brand text-white shadow-xs'
              : 'border border-border bg-bg text-text hover:border-brand'
          }`}
        >
          <span className="font-serif font-bold text-sm">a/b</span>
          <span>Fraction</span>
        </button>

        <button
          type="button"
          onClick={() => handleTemplateSwitch('power')}
          aria-label="Format as Power"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            state.template === 'power'
              ? 'bg-brand text-white shadow-xs'
              : 'border border-border bg-bg text-text hover:border-brand'
          }`}
        >
          <span className="font-serif font-bold text-sm">xⁿ</span>
          <span>Power</span>
        </button>

        <button
          type="button"
          onClick={() => handleTemplateSwitch('root')}
          aria-label="Format as Root"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            state.template === 'root'
              ? 'bg-brand text-white shadow-xs'
              : 'border border-border bg-bg text-text hover:border-brand'
          }`}
        >
          <span className="font-serif font-bold text-sm">√x</span>
          <span>Root</span>
        </button>

        <button
          type="button"
          onClick={() => handleTemplateSwitch('limit')}
          aria-label="Format as Limit"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            state.template === 'limit'
              ? 'bg-brand text-white shadow-xs'
              : 'border border-border bg-bg text-text hover:border-brand'
          }`}
        >
          <span className="font-serif font-bold text-sm">lim</span>
          <span>Limit</span>
        </button>

        <button
          type="button"
          onClick={() => handleTemplateSwitch('expression')}
          aria-label="Format as Single Expression"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            state.template === 'expression'
              ? 'bg-brand text-white shadow-xs'
              : 'border border-border bg-bg text-text hover:border-brand'
          }`}
        >
          <span>✍️ Single Expression</span>
        </button>
      </div>

      {/* Visual Calculator Display Screen */}
      <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-border/80 bg-bg/50 p-6 shadow-inner">
        {/* 1. FRACTION DISPLAY */}
        {state.template === 'fraction' && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            {/* Numerator Box */}
            <div className="flex items-center">
              <input
                ref={numRef}
                type="text"
                value={state.num}
                onChange={(e) => handleStateChange({ num: e.target.value })}
                onFocus={() => updateActiveRef('num')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                    e.preventDefault()
                    denRef.current?.focus()
                    updateActiveRef('den')
                  }
                }}
                disabled={disabled}
                placeholder="Numerator (البسط)"
                aria-label="Numerator"
                className={`min-w-[130px] max-w-[280px] rounded-lg border-2 border-dashed px-3 py-2 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                  activeField === 'num'
                    ? 'border-brand bg-surface shadow-xs ring-2 ring-brand/20'
                    : 'border-border/80 bg-surface/70 hover:border-border'
                }`}
              />
            </div>

            {/* Fraction Dividing Line */}
            <div className="h-[3.5px] w-full min-w-[150px] max-w-[320px] rounded-full bg-ink/70 my-1" />

            {/* Denominator Box */}
            <div className="flex items-center">
              <input
                ref={denRef}
                type="text"
                value={state.den}
                onChange={(e) => handleStateChange({ den: e.target.value })}
                onFocus={() => updateActiveRef('den')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                    e.preventDefault()
                    numRef.current?.focus()
                    updateActiveRef('num')
                  }
                }}
                disabled={disabled}
                placeholder="Denominator (المقام)"
                aria-label="Denominator"
                className={`min-w-[130px] max-w-[280px] rounded-lg border-2 border-dashed px-3 py-2 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                  activeField === 'den'
                    ? 'border-brand bg-surface shadow-xs ring-2 ring-brand/20'
                    : 'border-border/80 bg-surface/70 hover:border-border'
                }`}
              />
            </div>
          </div>
        )}

        {/* 2. POWER DISPLAY */}
        {state.template === 'power' && (
          <div className="flex items-end justify-center gap-2 py-2">
            {/* Base Box */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-semibold text-text-muted">Base (الأساس)</span>
              <input
                ref={baseRef}
                type="text"
                value={state.base}
                onChange={(e) => handleStateChange({ base: e.target.value })}
                onFocus={() => updateActiveRef('base')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
                    e.preventDefault()
                    expRef.current?.focus()
                    updateActiveRef('exp')
                  }
                }}
                disabled={disabled}
                placeholder="x"
                aria-label="Base"
                className={`w-28 rounded-lg border-2 border-dashed px-3 py-2 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                  activeField === 'base'
                    ? 'border-brand bg-surface ring-2 ring-brand/20'
                    : 'border-border/80 bg-surface/70'
                }`}
              />
            </div>

            {/* Exponent Box */}
            <div className="flex flex-col items-center gap-1 -translate-y-4">
              <span className="text-[11px] font-semibold text-text-muted">Power (الأس)</span>
              <input
                ref={expRef}
                type="text"
                value={state.exp}
                onChange={(e) => handleStateChange({ exp: e.target.value })}
                onFocus={() => updateActiveRef('exp')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
                    e.preventDefault()
                    baseRef.current?.focus()
                    updateActiveRef('base')
                  }
                }}
                disabled={disabled}
                placeholder="2"
                aria-label="Exponent"
                className={`w-20 rounded-lg border-2 border-dashed px-2.5 py-1.5 text-center text-base font-bold font-mono text-ink outline-none transition ${
                  activeField === 'exp'
                    ? 'border-brand bg-surface ring-2 ring-brand/20'
                    : 'border-border/80 bg-surface/70'
                }`}
              />
            </div>
          </div>
        )}

        {/* 3. ROOT DISPLAY */}
        {state.template === 'root' && (
          <div className="flex items-center justify-center gap-1.5 py-2">
            <span className="font-serif text-4xl text-ink font-light select-none">√</span>
            <div className="border-t-2 border-ink pt-1 pl-1">
              <input
                ref={radRef}
                type="text"
                value={state.radicand}
                onChange={(e) => handleStateChange({ radicand: e.target.value })}
                onFocus={() => updateActiveRef('radicand')}
                disabled={disabled}
                placeholder="Radicand (داخل الجذر)"
                aria-label="Radicand"
                className={`min-w-[160px] max-w-[280px] rounded-lg border-2 border-dashed px-3 py-2 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                  activeField === 'radicand'
                    ? 'border-brand bg-surface ring-2 ring-brand/20'
                    : 'border-border/80 bg-surface/70'
                }`}
              />
            </div>
          </div>
        )}

        {/* 4. LIMIT DISPLAY */}
        {state.template === 'limit' && (
          <div className="flex items-center justify-center gap-3 py-2">
            {/* Limit Operator with Subscript */}
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl font-bold text-ink italic">lim</span>
              <div className="flex items-center gap-1 text-xs font-semibold text-text-muted mt-0.5">
                <span>x →</span>
                <input
                  ref={appRef}
                  type="text"
                  value={state.approaches}
                  onChange={(e) => handleStateChange({ approaches: e.target.value })}
                  onFocus={() => updateActiveRef('approaches')}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
                      e.preventDefault()
                      exprRef.current?.focus()
                      updateActiveRef('expr')
                    }
                  }}
                  disabled={disabled}
                  placeholder="0"
                  aria-label="Approaches"
                  className={`w-14 rounded border border-dashed px-1.5 py-0.5 text-center text-xs font-bold font-mono text-ink outline-none ${
                    activeField === 'approaches'
                      ? 'border-brand bg-surface ring-1 ring-brand/20'
                      : 'border-border bg-surface/70'
                  }`}
                />
              </div>
            </div>

            {/* Expression Box */}
            <input
              ref={exprRef}
              type="text"
              value={state.expr}
              onChange={(e) => handleStateChange({ expr: e.target.value })}
              onFocus={() => updateActiveRef('expr')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
                  e.preventDefault()
                  appRef.current?.focus()
                  updateActiveRef('approaches')
                }
              }}
              disabled={disabled}
              placeholder="f(x) (الدالة)"
              aria-label="Limit Expression"
              className={`min-w-[160px] max-w-[280px] rounded-lg border-2 border-dashed px-3 py-2 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                activeField === 'expr'
                  ? 'border-brand bg-surface ring-2 ring-brand/20'
                  : 'border-border/80 bg-surface/70'
              }`}
            />
          </div>
        )}

        {/* 5. GENERAL EXPRESSION DISPLAY */}
        {state.template === 'expression' && (
          <div className="w-full max-w-md py-2">
            <input
              ref={rawRef}
              type="text"
              value={state.raw}
              onChange={(e) => handleStateChange({ raw: e.target.value })}
              onFocus={() => updateActiveRef('raw')}
              disabled={disabled}
              placeholder={placeholder || 'Type your answer...'}
              aria-label="Math Expression"
              className={`w-full rounded-xl border-2 border-dashed px-4 py-3 text-center text-xl font-bold font-mono text-ink outline-none transition ${
                activeField === 'raw'
                  ? 'border-brand bg-surface ring-2 ring-brand/20'
                  : 'border-border/80 bg-surface/70'
              }`}
            />
          </div>
        )}
      </div>

      {/* Live Formatted Output Preview */}
      {currentFormatted && (
        <div className="flex items-center justify-between rounded-xl border border-brand/25 bg-brand/5 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Formatted Output:
            </span>
            <span className="font-serif text-base text-text">
              <LatexRenderer content={`$${currentFormatted}$`} inline />
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleStateChange({ num: '', den: '', base: 'x', exp: '', radicand: '', approaches: '0', expr: '', raw: '' })}
            className="text-xs text-text-muted hover:text-danger transition"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
