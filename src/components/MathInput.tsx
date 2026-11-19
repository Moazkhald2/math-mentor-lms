import { useState, useRef } from 'react'
import VisualMathEditor from './VisualMathEditor'
import MathKeypad, { type KeypadAction } from './MathKeypad'

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

function setNativeValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set
  const prototype = Object.getPrototypeOf(element)
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value)
  } else if (valueSetter) {
    valueSetter.call(element, value)
  } else {
    element.value = value
  }
}

export default function MathInput({
  value,
  onChange,
  placeholder = 'Type your answer...',
  disabled = false,
  className = '',
  id,
}: MathInputProps) {
  const [mode, setMode] = useState<'visual' | 'text'>('visual')
  const [showKeypad, setShowKeypad] = useState(true)

  const activeInputRef = useRef<HTMLInputElement | null>(null)
  const rawInputRef = useRef<HTMLInputElement | null>(null)

  // Handle keypad button clicks (numbers, math symbols, backspace, clear)
  const handleKeypadInsert = (action: KeypadAction) => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current

    if (!input) {
      onChange((value || '') + action.insert)
      return
    }

    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const currentVal = input.value

    let insertText = action.insert
    let newCursorPos = start + insertText.length

    // If text is selected and wrap options exist
    if (start !== end && (action.wrapPrefix !== undefined || action.wrapSuffix !== undefined)) {
      const selected = currentVal.slice(start, end)
      const prefix = action.wrapPrefix ?? ''
      const suffix = action.wrapSuffix ?? ''
      insertText = `${prefix}${selected}${suffix}`
      newCursorPos = start + insertText.length
    } else if (action.cursorOffset !== undefined) {
      newCursorPos = start + action.cursorOffset
    }

    const nextVal = currentVal.slice(0, start) + insertText + currentVal.slice(end)

    setNativeValue(input, nextVal)
    input.dispatchEvent(new Event('input', { bubbles: true }))

    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  const handleBackspace = () => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current
    if (!input) return

    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length

    if (start !== end) {
      const nextVal = input.value.slice(0, start) + input.value.slice(end)
      setNativeValue(input, nextVal)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start, start)
      })
    } else if (start > 0) {
      const nextVal = input.value.slice(0, start - 1) + input.value.slice(start)
      setNativeValue(input, nextVal)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start - 1, start - 1)
      })
    }
  }

  const handleClear = () => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current
    if (input) {
      setNativeValue(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.focus()
    } else {
      onChange('')
    }
  }

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Top Header Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              mode === 'visual'
                ? 'bg-brand text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            🧮 Calculator Boxes
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              mode === 'text'
                ? 'bg-brand text-white shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            ✍️ Plain Input
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowKeypad((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            showKeypad
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-border bg-surface text-text-muted hover:text-text'
          }`}
        >
          <span>⌨️</span>
          <span>{showKeypad ? 'Hide Keypad' : 'Show Keypad'}</span>
        </button>
      </div>

      {/* Editor Body */}
      {mode === 'visual' ? (
        <VisualMathEditor
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          onActiveFieldRef={(ref) => {
            activeInputRef.current = ref
          }}
        />
      ) : (
        <div className="relative">
          <input
            ref={rawInputRef}
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60 font-mono"
          />
        </div>
      )}

      {/* On-Screen Calculator Keypad */}
      {showKeypad && !disabled && (
        <div className="pt-1">
          <MathKeypad
            onInsert={handleKeypadInsert}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />
        </div>
      )}
    </div>
  )
}
