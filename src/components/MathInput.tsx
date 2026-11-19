import { useState, useRef } from 'react'
import type { MathfieldElement } from 'mathlive'
import VisualMathEditor from './VisualMathEditor'
import MathKeypad, { type KeypadAction } from './MathKeypad'
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

  const activeInputRef = useRef<HTMLInputElement | MathfieldElement | null>(null)
  const rawInputRef = useRef<HTMLInputElement | null>(null)

  // Handle keypad button clicks (numbers, math symbols, backspace, clear)
  const handleKeypadInsert = (action: KeypadAction) => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current

    if (!input) {
      onChange((value || '') + (action.latex || action.insert))
      return
    }

    // Check if active target is a MathfieldElement (WYSIWYG custom element)
    if ('insert' in input && typeof (input as any).insert === 'function') {
      const mf = input as MathfieldElement
      mf.focus()
      const insertText = action.latex || action.insert
      mf.insert(insertText, {
        selectionMode: 'placeholder',
        format: 'latex',
        focus: true,
      })
      onChange(mf.value)
      return
    }

    // Standard HTMLInputElement insertion
    const htmlInput = input as HTMLInputElement
    const start = htmlInput.selectionStart ?? htmlInput.value.length
    const end = htmlInput.selectionEnd ?? htmlInput.value.length
    const currentVal = htmlInput.value

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

    setNativeValue(htmlInput, nextVal)
    htmlInput.dispatchEvent(new Event('input', { bubbles: true }))

    requestAnimationFrame(() => {
      htmlInput.focus()
      htmlInput.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  const handleBackspace = () => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current
    if (!input) return

    // Check if input is MathfieldElement
    if ('executeCommand' in input && typeof (input as any).executeCommand === 'function') {
      const mf = input as MathfieldElement
      mf.focus()
      mf.executeCommand('deleteBackward')
      onChange(mf.value)
      return
    }

    // Standard HTMLInputElement backspace
    const htmlInput = input as HTMLInputElement
    const start = htmlInput.selectionStart ?? htmlInput.value.length
    const end = htmlInput.selectionEnd ?? htmlInput.value.length

    if (start !== end) {
      const nextVal = htmlInput.value.slice(0, start) + htmlInput.value.slice(end)
      setNativeValue(htmlInput, nextVal)
      htmlInput.dispatchEvent(new Event('input', { bubbles: true }))
      requestAnimationFrame(() => {
        htmlInput.focus()
        htmlInput.setSelectionRange(start, start)
      })
    } else if (start > 0) {
      const nextVal = htmlInput.value.slice(0, start - 1) + htmlInput.value.slice(start)
      setNativeValue(htmlInput, nextVal)
      htmlInput.dispatchEvent(new Event('input', { bubbles: true }))
      requestAnimationFrame(() => {
        htmlInput.focus()
        htmlInput.setSelectionRange(start - 1, start - 1)
      })
    }
  }

  const handleClear = () => {
    if (disabled) return
    const input = mode === 'visual' ? activeInputRef.current : rawInputRef.current
    if (input) {
      if ('setValue' in input && typeof (input as any).setValue === 'function') {
        ;(input as MathfieldElement).setValue('')
        onChange('')
        return
      }
      setNativeValue(input as HTMLInputElement, '')
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
        <div className="relative space-y-2">
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
          {value && (
            <div className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-2 text-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Standard Math Preview:
              </span>
              <span className="font-serif text-base text-text">
                <LatexRenderer content={`$${value}$`} inline />
              </span>
            </div>
          )}
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
