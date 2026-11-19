import { useState } from 'react'
import LatexRenderer from './LatexRenderer'

export interface KeypadAction {
  label: string
  display?: string
  displayLatex?: string
  latex?: string
  insert: string
  wrapPrefix?: string
  wrapSuffix?: string
  cursorOffset?: number
}

interface MathKeypadProps {
  onInsert: (action: KeypadAction) => void
  onBackspace: () => void
  onClear: () => void
  className?: string
}

export const COMMON_ACTIONS: KeypadAction[] = [
  { label: 'a/b', displayLatex: '\\frac{\\Box}{\\Box}', latex: '\\frac{#?}{#?}', insert: '\\frac{}{}' },
  { label: 'x²', displayLatex: 'x^2', latex: '^2', insert: '^2' },
  { label: 'xⁿ', displayLatex: 'x^{\\Box}', latex: '^{#?}', insert: '^{}' },
  { label: '√x', displayLatex: '\\sqrt{\\Box}', latex: '\\sqrt{#?}', insert: '\\sqrt{}' },
  { label: 'lim', displayLatex: '\\lim_{x \\to 0}\\Box', latex: '\\lim_{x \\to 0} #?', insert: '\\lim_{x \\to 0} ' },
  { label: 'x→', displayLatex: 'x \\to \\Box', latex: 'x \\to #?', insert: 'x \\to ' },
  { label: '∞', displayLatex: '\\infty', latex: '\\infty', insert: '\\infty' },
  { label: '( )', displayLatex: '(\\Box)', latex: '(#?)', insert: '()' },
  { label: '±', displayLatex: '\\pm', latex: '\\pm', insert: '\\pm' },
  { label: 'π', displayLatex: '\\pi', latex: '\\pi', insert: '\\pi' },
]

export const ALGEBRA_ACTIONS: KeypadAction[] = [
  // Fractions & Powers
  { label: 'a/b', displayLatex: '\\frac{\\Box}{\\Box}', latex: '\\frac{#?}{#?}', insert: '\\frac{}{}' },
  { label: 'x²', displayLatex: 'x^2', latex: '^2', insert: '^2' },
  { label: 'x³', displayLatex: 'x^3', latex: '^3', insert: '^3' },
  { label: 'xⁿ', displayLatex: 'x^{\\Box}', latex: '^{#?}', insert: '^{}' },
  { label: 'xₙ', displayLatex: 'x_{\\Box}', latex: '_{#?}', insert: '_{}' },
  { label: 'eˣ', displayLatex: 'e^{\\Box}', latex: 'e^{#?}', insert: 'e^{}' },

  // Roots
  { label: '√x', displayLatex: '\\sqrt{\\Box}', latex: '\\sqrt{#?}', insert: '\\sqrt{}' },
  { label: '∛x', displayLatex: '\\sqrt[3]{\\Box}', latex: '\\sqrt[3]{#?}', insert: '\\sqrt[3]{}' },

  // Grouping
  { label: '( )', displayLatex: '(\\Box)', latex: '(#?)', insert: '()' },
  { label: '[ ]', displayLatex: '[\\Box]', latex: '[#?]', insert: '[]' },
  { label: '|x|', displayLatex: '|\\Box|', latex: '|#?|', insert: '||' },

  // Variables
  { label: 'x', displayLatex: 'x', latex: 'x', insert: 'x' },
  { label: 'y', displayLatex: 'y', latex: 'y', insert: 'y' },
  { label: 'z', displayLatex: 'z', latex: 'z', insert: 'z' },
  { label: 'n', displayLatex: 'n', latex: 'n', insert: 'n' },

  // Operators
  { label: '+', displayLatex: '+', latex: '+', insert: ' + ' },
  { label: '-', displayLatex: '-', latex: '-', insert: ' - ' },
  { label: '×', displayLatex: '\\times', latex: '\\times', insert: ' \\times ' },
  { label: '÷', displayLatex: '\\div', latex: '\\div', insert: ' \\div ' },
  { label: '±', displayLatex: '\\pm', latex: '\\pm', insert: '\\pm ' },
  { label: '=', displayLatex: '=', latex: '=', insert: ' = ' },
]

export const CALCULUS_ACTIONS: KeypadAction[] = [
  // Limits
  { label: 'lim_{x→0}', displayLatex: '\\lim_{x \\to 0}\\Box', latex: '\\lim_{x \\to 0} #?', insert: '\\lim_{x \\to 0} ' },
  { label: 'lim_{x→∞}', displayLatex: '\\lim_{x \\to \\infty}\\Box', latex: '\\lim_{x \\to \\infty} #?', insert: '\\lim_{x \\to \\infty} ' },
  { label: 'lim_{x→a}', displayLatex: '\\lim_{x \\to a}\\Box', latex: '\\lim_{x \\to a} #?', insert: '\\lim_{x \\to a} ' },
  { label: 'x→', displayLatex: 'x \\to \\Box', latex: 'x \\to #?', insert: 'x \\to ' },
  { label: '∞', displayLatex: '\\infty', latex: '\\infty', insert: '\\infty' },

  // Derivatives & Integrals
  { label: 'dy/dx', displayLatex: '\\frac{dy}{dx}', latex: '\\frac{dy}{dx}', insert: '\\frac{dy}{dx}' },
  { label: 'd/dx', displayLatex: '\\frac{d}{dx}\\Box', latex: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
  { label: "f'(x)", displayLatex: "f'(x)", latex: "f'(x)", insert: "f'(x)" },
  { label: '∫', displayLatex: '\\int \\Box', latex: '\\int #?', insert: '\\int ' },
  { label: '∫_a^b', displayLatex: '\\int_a^b \\Box', latex: '\\int_{#?}^{#?} #?', insert: '\\int_{a}^{b} ' },

  // Functions
  { label: 'sin', displayLatex: '\\sin(\\Box)', latex: '\\sin(#?)', insert: '\\sin(' },
  { label: 'cos', displayLatex: '\\cos(\\Box)', latex: '\\cos(#?)', insert: '\\cos(' },
  { label: 'tan', displayLatex: '\\tan(\\Box)', latex: '\\tan(#?)', insert: '\\tan(' },
  { label: 'ln', displayLatex: '\\ln(\\Box)', latex: '\\ln(#?)', insert: '\\ln(' },
  { label: 'log', displayLatex: '\\log(\\Box)', latex: '\\log(#?)', insert: '\\log(' },
  { label: 'e', displayLatex: 'e', latex: 'e', insert: 'e' },
]

export const SYMBOL_ACTIONS: KeypadAction[] = [
  // Relations
  { label: '=', displayLatex: '=', latex: '=', insert: ' = ' },
  { label: '≠', displayLatex: '\\ne', latex: '\\ne', insert: ' \\neq ' },
  { label: '<', displayLatex: '<', latex: '<', insert: ' < ' },
  { label: '>', displayLatex: '>', latex: '>', insert: ' > ' },
  { label: '≤', displayLatex: '\\le', latex: '\\le', insert: ' \\le ' },
  { label: '≥', displayLatex: '\\ge', latex: '\\ge', insert: ' \\ge ' },
  { label: '≈', displayLatex: '\\approx', latex: '\\approx', insert: ' \\approx ' },

  // Constants & Greek
  { label: 'π', displayLatex: '\\pi', latex: '\\pi', insert: '\\pi' },
  { label: 'θ', displayLatex: '\\theta', latex: '\\theta', insert: '\\theta' },
  { label: '°', displayLatex: '^\\circ', latex: '^\\circ', insert: '^\\circ' },
  { label: 'Δ', displayLatex: '\\Delta', latex: '\\Delta', insert: '\\Delta' },
  { label: 'α', displayLatex: '\\alpha', latex: '\\alpha', insert: '\\alpha' },
  { label: 'β', displayLatex: '\\beta', latex: '\\beta', insert: '\\beta' },

  // Sets & Logic
  { label: '∈', displayLatex: '\\in', latex: '\\in', insert: ' \\in ' },
  { label: '∉', displayLatex: '\\notin', latex: '\\notin', insert: ' \\notin ' },
  { label: '∪', displayLatex: '\\cup', latex: '\\cup', insert: ' \\cup ' },
  { label: '∩', displayLatex: '\\cap', latex: '\\cap', insert: ' \\cap ' },
  { label: '∅', displayLatex: '\\emptyset', latex: '\\emptyset', insert: '\\emptyset' },
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
            className="flex min-w-[54px] items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-600 hover:bg-amber-500/20 active:scale-95 transition shadow-2xs"
          >
            DEL
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="All Clear"
            title="All Clear"
            className="flex min-w-[54px] items-center justify-center rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-extrabold text-danger hover:bg-danger/20 active:scale-95 transition shadow-2xs"
          >
            AC
          </button>
        </div>
      </div>

      {/* Main Grid: Math Result Keys + Numpad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Math Operation Keys (Rendered formatted like real calculator symbols) */}
        <div className="sm:col-span-2 grid grid-cols-4 gap-2 auto-rows-fr">
          {actions.map((act) => {
            const mathExpression = act.displayLatex || act.latex?.replace(/#\?/g, '\\Box')
            return (
              <button
                key={act.label}
                type="button"
                onClick={() => onInsert(act)}
                aria-label={`Insert ${act.label}`}
                title={`Insert ${act.label}`}
                className="flex min-h-[46px] items-center justify-center rounded-xl border border-border/80 bg-bg hover:border-brand hover:bg-brand/10 text-text font-medium text-base transition active:scale-95 shadow-2xs overflow-hidden px-1"
              >
                {mathExpression ? (
                  <LatexRenderer content={`$${mathExpression}$`} inline />
                ) : (
                  <span className="font-serif">{act.display || act.label}</span>
                )}
              </button>
            )
          })}
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
