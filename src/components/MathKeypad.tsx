import { useState } from 'react'

export interface KeypadAction {
  label: string
  display?: string
  latex?: string
  insert: string
  cursorOffset?: number // where to put cursor relative to start of insert
  wrapPrefix?: string   // if text selected, wrap with this prefix
  wrapSuffix?: string   // and this suffix
  category?: 'algebra' | 'calculus' | 'symbols' | 'common'
}

interface MathKeypadProps {
  onInsert: (action: KeypadAction) => void
  onBackspace: () => void
  onClear: () => void
  className?: string
}

export const COMMON_ACTIONS: KeypadAction[] = [
  { label: 'a/b', display: 'a/b', insert: '\\frac{}{}', cursorOffset: 6, wrapPrefix: '\\frac{', wrapSuffix: '}{}' },
  { label: 'x²', display: 'x²', insert: '^2', wrapPrefix: '(', wrapSuffix: ')^2' },
  { label: 'xⁿ', display: 'xⁿ', insert: '^{}', cursorOffset: 2, wrapPrefix: '(', wrapSuffix: ')^{}' },
  { label: '√x', display: '√x', insert: '\\sqrt{}', cursorOffset: 6, wrapPrefix: '\\sqrt{', wrapSuffix: '}' },
  { label: 'lim', display: 'lim', insert: '\\lim_{x \\to 0} ', cursorOffset: 15 },
  { label: 'x→', display: 'x→', insert: 'x \\to ' },
  { label: '∞', display: '∞', insert: '\\infty' },
  { label: '( )', display: '( )', insert: '()', cursorOffset: 1, wrapPrefix: '(', wrapSuffix: ')' },
  { label: '±', display: '±', insert: '\\pm' },
  { label: 'π', display: 'π', insert: '\\pi' },
]

export const ALGEBRA_ACTIONS: KeypadAction[] = [
  // Fractions & Powers
  { label: 'a/b', display: 'a/b', insert: '\\frac{}{}', cursorOffset: 6, wrapPrefix: '\\frac{', wrapSuffix: '}{}' },
  { label: '/', display: '÷', insert: ' / ' },
  { label: 'x²', display: 'x²', insert: '^2', wrapPrefix: '(', wrapSuffix: ')^2' },
  { label: 'x³', display: 'x³', insert: '^3', wrapPrefix: '(', wrapSuffix: ')^3' },
  { label: 'xⁿ', display: 'xⁿ', insert: '^{}', cursorOffset: 2, wrapPrefix: '(', wrapSuffix: ')^{}' },
  { label: 'xₙ', display: 'xₙ', insert: '_{}', cursorOffset: 2, wrapPrefix: '', wrapSuffix: '_{}' },
  { label: 'eˣ', display: 'eˣ', insert: 'e^{}', cursorOffset: 3 },

  // Roots
  { label: '√x', display: '√x', insert: '\\sqrt{}', cursorOffset: 6, wrapPrefix: '\\sqrt{', wrapSuffix: '}' },
  { label: '∛x', display: '∛x', insert: '\\sqrt[3]{}', cursorOffset: 9, wrapPrefix: '\\sqrt[3]{', wrapSuffix: '}' },

  // Grouping
  { label: '( )', display: '( )', insert: '()', cursorOffset: 1, wrapPrefix: '(', wrapSuffix: ')' },
  { label: '[ ]', display: '[ ]', insert: '[]', cursorOffset: 1, wrapPrefix: '[', wrapSuffix: ']' },
  { label: '|x|', display: '|x|', insert: '||', cursorOffset: 1, wrapPrefix: '|', wrapSuffix: '|' },

  // Variables
  { label: 'x', display: 'x', insert: 'x' },
  { label: 'y', display: 'y', insert: 'y' },
  { label: 'z', display: 'z', insert: 'z' },
  { label: 'n', display: 'n', insert: 'n' },
  { label: 't', display: 't', insert: 't' },

  // Operators
  { label: '+', display: '+', insert: ' + ' },
  { label: '-', display: '-', insert: ' - ' },
  { label: '×', display: '×', insert: ' \\times ' },
  { label: '÷', display: '÷', insert: ' \\div ' },
  { label: '±', display: '±', insert: '\\pm ' },
  { label: '=', display: '=', insert: ' = ' },
]

export const CALCULUS_ACTIONS: KeypadAction[] = [
  // Limits
  { label: 'lim_{x→0}', display: 'lim x→0', insert: '\\lim_{x \\to 0} ' },
  { label: 'lim_{x→∞}', display: 'lim x→∞', insert: '\\lim_{x \\to \\infty} ' },
  { label: 'lim_{x→a}', display: 'lim x→a', insert: '\\lim_{x \\to a} ' },
  { label: 'x→', display: 'x→', insert: 'x \\to ' },
  { label: '∞', display: '∞', insert: '\\infty' },

  // Derivatives & Integrals
  { label: 'dy/dx', display: 'dy/dx', insert: '\\frac{dy}{dx}' },
  { label: 'd/dx', display: 'd/dx', insert: '\\frac{d}{dx}' },
  { label: "f'(x)", display: "f'(x)", insert: "f'(x)" },
  { label: '∫', display: '∫', insert: '\\int ' },
  { label: '∫_a^b', display: '∫ₐᵇ', insert: '\\int_{a}^{b} ', cursorOffset: 6 },

  // Functions
  { label: 'sin', display: 'sin', insert: '\\sin(' , cursorOffset: 5, wrapPrefix: '\\sin(', wrapSuffix: ')' },
  { label: 'cos', display: 'cos', insert: '\\cos(' , cursorOffset: 5, wrapPrefix: '\\cos(', wrapSuffix: ')' },
  { label: 'tan', display: 'tan', insert: '\\tan(' , cursorOffset: 5, wrapPrefix: '\\tan(', wrapSuffix: ')' },
  { label: 'ln', display: 'ln', insert: '\\ln(' , cursorOffset: 4, wrapPrefix: '\\ln(', wrapSuffix: ')' },
  { label: 'log', display: 'log', insert: '\\log(' , cursorOffset: 5, wrapPrefix: '\\log(', wrapSuffix: ')' },
  { label: 'e', display: 'e', insert: 'e' },
]

export const SYMBOL_ACTIONS: KeypadAction[] = [
  // Relations
  { label: '=', display: '=', insert: ' = ' },
  { label: '≠', display: '≠', insert: ' \\neq ' },
  { label: '<', display: '<', insert: ' < ' },
  { label: '>', display: '>', insert: ' > ' },
  { label: '≤', display: '≤', insert: ' \\le ' },
  { label: '≥', display: '≥', insert: ' \\ge ' },
  { label: '≈', display: '≈', insert: ' \\approx ' },

  // Constants & Greek
  { label: 'π', display: 'π', insert: '\\pi' },
  { label: 'θ', display: 'θ', insert: '\\theta' },
  { label: '°', display: '°', insert: '^\\circ', wrapPrefix: '', wrapSuffix: '^\\circ' },
  { label: 'Δ', display: 'Δ', insert: '\\Delta' },
  { label: 'α', display: 'α', insert: '\\alpha' },
  { label: 'β', display: 'β', insert: '\\beta' },

  // Sets & Logic
  { label: '∈', display: '∈', insert: ' \\in ' },
  { label: '∉', display: '∉', insert: ' \\notin ' },
  { label: '∪', display: '∪', insert: ' \\cup ' },
  { label: '∩', display: '∩', insert: ' \\cap ' },
  { label: '∅', display: '∅', insert: '\\emptyset' },
]

const NUMPAD_BUTTONS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '0', '.', '-'
]

export default function MathKeypad({ onInsert, onBackspace, onClear, className = '' }: MathKeypadProps) {
  const [activeTab, setActiveTab] = useState<'algebra' | 'calculus' | 'symbols'>('algebra')

  const actions =
    activeTab === 'algebra'
      ? ALGEBRA_ACTIONS
      : activeTab === 'calculus'
        ? CALCULUS_ACTIONS
        : SYMBOL_ACTIONS

  return (
    <div
      role="region"
      aria-label="Math Keypad"
      className={`rounded-xl border border-border bg-surface shadow-lg select-none p-3 transition-all ${className}`}
    >
      {/* Category Tabs */}
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('algebra')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'algebra'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:bg-brand/10 hover:text-text'
            }`}
          >
            Algebra & Powers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calculus')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'calculus'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:bg-brand/10 hover:text-text'
            }`}
          >
            Calculus & Limits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('symbols')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'symbols'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:bg-brand/10 hover:text-text'
            }`}
          >
            Symbols
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            title="Backspace"
            className="flex items-center justify-center rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted hover:border-danger hover:bg-danger/10 hover:text-danger active:scale-95 transition"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear All"
            title="Clear All"
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted hover:border-danger hover:bg-danger/10 hover:text-danger active:scale-95 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main Grid: Math Symbols + Numpad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Math Operation Buttons (Span 2 cols on tablet/desktop) */}
        <div className="sm:col-span-2 grid grid-cols-4 gap-1.5 auto-rows-fr">
          {actions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => onInsert(act)}
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-border/70 bg-bg hover:border-brand hover:bg-brand/10 text-text font-medium text-sm transition active:scale-95 shadow-2xs"
            >
              {act.display || act.label}
            </button>
          ))}
        </div>

        {/* Numeric Numpad */}
        <div className="grid grid-cols-3 gap-1.5 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-3">
          {NUMPAD_BUTTONS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => onInsert({ label: digit, insert: digit })}
              className="flex min-h-[38px] items-center justify-center rounded-lg border border-border bg-surface hover:border-brand hover:bg-brand/10 text-ink font-semibold text-sm transition active:scale-95 shadow-2xs"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
