import type { MathfieldElement } from 'mathlive'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        class?: string
        className?: string
        disabled?: boolean
        virtualKeyboardMode?: 'auto' | 'manual' | 'off'
        'virtual-keyboard-mode'?: 'auto' | 'manual' | 'off'
        placeholder?: string
        value?: string
        readOnly?: boolean
      }
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        class?: string
        className?: string
        disabled?: boolean
        virtualKeyboardMode?: 'auto' | 'manual' | 'off'
        'virtual-keyboard-mode'?: 'auto' | 'manual' | 'off'
        placeholder?: string
        value?: string
        readOnly?: boolean
      }
    }
  }
}
