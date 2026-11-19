import { useState, useRef, useId } from 'react'
import MathKeypad, { COMMON_ACTIONS, type KeypadAction } from './MathKeypad'
import LatexRenderer from './LatexRenderer'

interface MathInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  showQuickToolbar?: boolean
  showPreview?: boolean
}

/**
 * Transforms plain math notation (e.g. 1/2, sqrt(4)) into KaTeX friendly syntax for preview
 */
function toLatexPreview(text: string): string {
  if (!text || !text.trim()) return ''
  let s = text.trim()

  // Remove outer math wrapping if student typed $
  if (s.startsWith('$$') && s.endsWith('$$')) {
    s = s.slice(2, -2).trim()
  } else if (s.startsWith('$') && s.endsWith('$')) {
    s = s.slice(1, -1).trim()
  }

  // Convert basic slash fractions to \frac if not already latex
  if (!s.includes('\\frac')) {
    s = s.replace(/(\([^)]+\)|\b[a-zA-Z0-9.]+\b)\s*\/\s*(\([^)]+\)|\b[a-zA-Z0-9.]+\b)/g, (_m, num, den) => {
      const cleanNum = num.replace(/^\((.*)\)$/, '$1')
      const cleanDen = den.replace(/^\((.*)\)$/, '$1')
      return `\\frac{${cleanNum}}{${cleanDen}}`
    })
  }

  // Convert sqrt(x) to \sqrt{x}
  if (!s.includes('\\sqrt')) {
    s = s.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
  }

  return s
}

export default function MathInput({
  value,
  onChange,
  placeholder = 'Type your answer...',
  disabled = false,
  className = '',
  id,
  showQuickToolbar = true,
  showPreview = true,
}: MathInputProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleInsert = (action: KeypadAction) => {
    if (disabled) return
    const input = inputRef.current
    if (!input) {
      onChange(value + action.insert)
      return
    }

    const start = input.selectionStart ?? value.length
    const end = input.selectionEnd ?? value.length
    const selectedText = value.slice(start, end)

    let insertText = action.insert
    let newCursorPos = start + insertText.length

    // If text is selected and wrap rules exist
    if (selectedText && (action.wrapPrefix !== undefined || action.wrapSuffix !== undefined)) {
      const prefix = action.wrapPrefix ?? ''
      const suffix = action.wrapSuffix ?? ''
      insertText = `${prefix}${selectedText}${suffix}`
      newCursorPos = start + insertText.length
    } else if (action.cursorOffset !== undefined) {
      newCursorPos = start + action.cursorOffset
    }

    const nextValue = value.slice(0, start) + insertText + value.slice(end)
    onChange(nextValue)

    // Keep focus and position cursor precisely
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  const handleBackspace = () => {
    if (disabled) return
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart ?? value.length
    const end = input.selectionEnd ?? value.length

    if (start !== end) {
      // Delete selected range
      const nextValue = value.slice(0, start) + value.slice(end)
      onChange(nextValue)
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start, start)
      })
    } else if (start > 0) {
      // Delete previous character
      const nextValue = value.slice(0, start - 1) + value.slice(start)
      onChange(nextValue)
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start - 1, start - 1)
      })
    }
  }

  const handleClear = () => {
    if (disabled) return
    onChange('')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const previewLatex = toLatexPreview(value)

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {/* Quick Toolbar (Fractions, Powers, Roots, Limits) */}
      {showQuickToolbar && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted mr-1">
            Quick Keys:
          </span>
          {COMMON_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleInsert(action)}
              aria-label={`Insert ${action.label}`}
              title={`Insert ${action.label}`}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:border-brand hover:bg-brand/10 active:scale-95 transition"
            >
              {action.display || action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`ml-auto flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
              isOpen
                ? 'border-brand bg-brand text-white shadow-xs'
                : 'border-border bg-surface text-text hover:border-brand hover:bg-brand/10'
            }`}
          >
            <span>🧮</span>
            <span>{isOpen ? 'Close Keypad' : 'More Keys'}</span>
          </button>
        </div>
      )}

      {/* Main Input Field */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />

        {!showQuickToolbar && !disabled && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="absolute right-2.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-text-muted hover:border-brand hover:text-text"
          >
            🧮 Math Keys
          </button>
        )}
      </div>

      {/* Real-time Math Preview */}
      {showPreview && previewLatex && (
        <div className="flex items-center gap-3 rounded-lg border border-brand/25 bg-brand/5 px-3.5 py-2 text-sm text-text">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Preview:
          </span>
          <div className="overflow-x-auto py-0.5">
            <LatexRenderer content={`$${previewLatex}$`} inline />
          </div>
        </div>
      )}

      {/* Expandable Calculator Keypad */}
      {isOpen && !disabled && (
        <div className="pt-1">
          <MathKeypad
            onInsert={handleInsert}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />
        </div>
      )}
    </div>
  )
}
