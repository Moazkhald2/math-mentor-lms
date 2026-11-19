import { useState } from 'react'
import LatexRenderer from './LatexRenderer'

export interface KeypadAction {
  label: string
  display?: string
  latex?: string
  insert: string
  cursorOffset?: number
  wrapPrefix?: string
  wrapSuffix?: string
}

interface MathKeypadProps {
  onInsert: (action: KeypadAction) => void
  onBackspace: () => void
  onClear: () => void
  className?: string
}

export const COMMON_ACTIONS: KeypadAction[] = [
  { label: 'a/b', latex: '\\frac{\\Box}{\\Box}', insert: '\\frac{}{}', cursorOffset: 6, wrapPrefix: '\\frac{', wrapSuffix: '}{}' },
  { label: 'x²', latex: 'x^2', insert: '^2', wrapPrefix: '(', wrapSuffix: ')^2' },
  { label: 'xⁿ', latex: 'x^{\\Box}', insert: '^{}', cursorOffset: 2, wrapPrefix: '(', wrapSuffix: ')^{}' },
  { label: '√x', latex: '\\sqrt{\\Box}', insert: '\\sqrt{}', cursorOffset: 6, wrapPrefix: '\\sqrt{', wrapSuffix: '}' },
  { label: 'lim', latex: '\\lim', insert: '\\lim_{x \\to 0} ', cursorOffset: 15 },
  { label: 'x→', latex: 'x \\to', insert: 'x \\to ' },
  { label: '∞', latex: '\\infty', insert: '\\infty' },
  { label: '( )', latex: '(\\Box)', insert: '()', cursorOffset: 1, wrapPrefix: '(', wrapSuffix: ')' },
  { label: '±', latex: '\\pm', insert: '\\pm' },
  { label: 'π', latex: '\\pi', insert: '\\pi' },
]

export const ALGEBRA_ACTIONS: KeypadAction[] = [
  // Fractions & Powers
  { label: 'a/b', latex: '\\frac{\\Box}{\\Box}', insert: '\\frac{}{}', cursorOffset: 6, wrapPrefix: '\\frac{', wrapSuffix: '}{}' },
  { label: 'x²', latex: 'x^2', insert: '^2', wrapPrefix: '(', wrapSuffix: ')^2' },
  { label: 'x³', latex: 'x^3', insert: '^3', wrapPrefix: '(', wrapSuffix: ')^3' },
  { label: 'xⁿ', latex: 'x^{\\Box}', insert: '^{}', cursorOffset: 2, wrapPrefix: '(', wrapSuffix: ')^{}' },
  { label: 'xₙ', latex: 'x_{\\Box}', insert: '_{}', cursorOffset: 2, wrapPrefix: '', wrapSuffix: '_{}' },
  { label: 'eˣ', latex: 'e^{\\Box}', insert: 'e^{}', cursorOffset: 3 },

  // Roots
  { label: '√x', latex: '\\sqrt{\\Box}', insert: '\\sqrt{}', cursorOffset: 6, wrapPrefix: '\\sqrt{', wrapSuffix: '}' },
  { label: '∛x', latex: '\\sqrt[3]{\\Box}', insert: '\\sqrt[3]{}', cursorOffset: 9, wrapPrefix: '\\sqrt[3]{', wrapSuffix: '}' },

  // Grouping
  { label: '( )', latex: '(\\Box)', insert: '()', cursorOffset: 1, wrapPrefix: '(', wrapSuffix: ')' },
  { label: '[ ]', latex: '[\\Box]', insert: '[]', cursorOffset: 1, wrapPrefix: '[', wrapSuffix: ']' },
  { label: '|x|', latex: '|\\Box|', insert: '||', cursorOffset: 1, wrapPrefix: '|', wrapSuffix: '|' },

  // Variables
  { label: 'x', latex: 'x', insert: 'x' },
  { label: 'y', latex: 'y', insert: 'y' },
  { label: 'z', latex: 'z', insert: 'z' },
  { label: 'n', latex: 'n', insert: 'n' },

  // Operators
  { label: '+', latex: '+', insert: ' + ' },
  { label: '-', latex: '-', insert: ' - ' },
  { label: '×', latex: '\\times', insert: ' \\times ' },
  { label: '÷', latex: '\\div', insert: ' \\div ' },
  { label: '±', latex: '\\pm', insert: '\\pm ' },
  { label: '=', latex: '=', insert: ' = ' },
]

export const CALCULUS_ACTIONS: KeypadAction[] = [
  // Limits
  { label: 'lim_{x→0}', latex: '\\lim_{x \\to 0}', insert: '\\lim_{x \\to 0} ' },
  { label: 'lim_{x→∞}', latex: '\\lim_{x \\to \\infty}', insert: '\\lim_{x \\to \\infty} ' },
  { label: 'lim_{x→a}', latex: '\\lim_{x \\to a}', insert: '\\lim_{x \\to a} ' },
  { label: 'x→', latex: 'x \\to', insert: 'x \\to ' },
  { label: '∞', latex: '\\infty', insert: '\\infty' },

  // Derivatives & Integrals
  { label: 'dy/dx', latex: '\\frac{dy}{dx}', insert: '\\frac{dy}{dx}' },
  { label: 'd/dx', latex: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
  { label: "f'(x)", latex: "f'(x)", insert: "f'(x)" },
  { label: '∫', latex: '\\int', insert: '\\int ' },
  { label: '∫_a^b', latex: '\\int_{a}^{b}', insert: '\\int_{a}^{b} ', cursorOffset: 6 },

  // Functions
  { label: 'sin', latex: '\\sin', insert: '\\sin(', cursorOffset: 5, wrapPrefix: '\\sin(', wrapSuffix: ')' },
  { label: 'cos', latex: '\\cos', insert: '\\cos(', cursorOffset: 5, wrapPrefix: '\\cos(', wrapSuffix: ')' },
  { label: 'tan', latex: '\\tan', insert: '\\tan(', cursorOffset: 5, wrapPrefix: '\\tan(', wrapSuffix: ')' },
  { label: 'ln', latex: '\\ln', insert: '\\ln(', cursorOffset: 4, wrapPrefix: '\\ln(', wrapSuffix: ')' },
  { label: 'log', latex: '\\log', insert: '\\log(', cursorOffset: 5, wrapPrefix: '\\log(', wrapSuffix: ')' },
  { label: 'e', latex: 'e', insert: 'e' },
]

export const SYMBOL_ACTIONS: KeypadAction[] = [
  // Relations
  { label: '=', latex: '=', insert: ' = ' },
  { label: '≠', latex: '\\ne', insert: ' \\neq ' },
  { label: '<', latex: '<', insert: ' < ' },
  { label: '>', latex: '>', insert: ' > ' },
  { label: '≤', latex: '\\le', insert: ' \\le ' },
  { label: '≥', latex: '\\ge', insert: ' \\ge ' },
  { label: '≈', latex: '\\approx', insert: ' \\approx ' },

  // Constants & Greek
  { label: 'π', latex: '\\pi', insert: '\\pi' },
  { label: 'θ', latex: '\\theta', insert: '\\theta' },
  { label: '°', latex: '^\\circ', insert: '^\\circ', wrapPrefix: '', wrapSuffix: '^\\circ' },
  { label: 'Δ', latex: '\\Delta', insert: '\\Delta' },
  { label: 'α', latex: '\\alpha', insert: '\\alpha' },
  { label: 'β', latex: '\\beta', insert: '\\beta' },

  // Sets & Logic
  { label: '∈', latex: '\\in', insert: ' \\in ' },
  { label: '∉', latex: '\\notin', insert: ' \\notin ' },
  { label: '∪', latex: '\\cup', insert: ' \\cup ' },
  { label: '∩', latex: '\\cap', insert: ' \\cap ' },
  { label: '∅', latex: '\\emptyset', insert: '\\emptyset' },
]

const NUMPAD_BUTTONS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '0', '.', '(-)'
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
      className={`rounded-2xl border border-border bg-surface shadow-lg select-none p-3.5 transition-all ${className}`}
    >
      {/* Category Tabs & Calculator Controls (DEL / AC) */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('algebra')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'algebra'
                ? 'bg-brand text-white shadow-xs'
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
                ? 'bg-brand text-white shadow-xs'
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
                ? 'bg-brand text-white shadow-xs'
                : 'text-text-muted hover:bg-brand/10 hover:text-text'
            }`}
          >
            Symbols & Sets
          </button>
        </div>

        {/* Standard Calculator Controls: DEL (Delete) and AC (All Clear) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackspace}
            aria-label="Delete"
            title="Delete character (Backspace)"
            className="flex min-w-[52px] items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-600 hover:bg-amber-500/20 active:scale-95 transition shadow-2xs"
          >
            DEL
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="All Clear"
            title="All Clear"
            className="flex min-w-[52px] items-center justify-center rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-extrabold text-danger hover:bg-danger/20 active:scale-95 transition shadow-2xs"
          >
            AC
          </button>
        </div>
      </div>

      {/* Main Grid: Math Result Keys + Numpad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Math Operation Keys (Rendered formatted like real calculator symbols) */}
        <div className="sm:col-span-2 grid grid-cols-4 gap-2 auto-rows-fr">
          {actions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => onInsert(act)}
              aria-label={`Insert ${act.label}`}
              title={`Insert ${act.label}`}
              className="flex min-h-[46px] items-center justify-center rounded-xl border border-border/80 bg-bg hover:border-brand hover:bg-brand/10 text-text font-medium text-base transition active:scale-95 shadow-2xs overflow-hidden px-1"
            >
              {act.latex ? (
                <LatexRenderer content={`$${act.latex}$`} inline />
              ) : (
                <span className="font-serif">{act.display || act.label}</span>
              )}
            </button>
          ))}
        </div>

        {/* Standard Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-3">
          {NUMPAD_BUTTONS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => onInsert({ label: digit, insert: digit === '(-)' ? '-' : digit })}
              aria-label={`Digit ${digit}`}
              className="flex min-h-[46px] items-center justify-center rounded-xl border border-border bg-surface hover:border-brand hover:bg-brand/10 text-ink font-bold text-lg font-mono transition active:scale-95 shadow-2xs"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
