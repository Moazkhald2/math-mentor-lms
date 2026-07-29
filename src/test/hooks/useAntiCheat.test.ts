import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAntiCheat } from '../../hooks/useAntiCheat'

describe('useAntiCheat', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    expect(result.current).toMatchObject({
      violations: [],
      warningCount: 0,
      isDisqualified: false,
      timeSpent: 0,
      isFullscreen: false,
    })
  })

  it('adds violation on tab switch', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current.violations).toHaveLength(1)
    expect(result.current.violations[0].type).toBe('tab_switch')
    expect(result.current.warningCount).toBe(1)

    // Restore hidden property for subsequent tests
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  })

  it('adds violation on window blur', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(result.current.violations).toHaveLength(1)
    expect(result.current.violations[0].type).toBe('window_blur')
    expect(result.current.warningCount).toBe(1)
  })

  it('blocks keyboard shortcuts and adds violation', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'c', cancelable: true })
    act(() => {
      document.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(result.current.violations).toHaveLength(1)
    expect(result.current.violations[0].type).toBe('keyboard_shortcut')
  })

  it('blocks F12 key', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    const event = new KeyboardEvent('keydown', { key: 'F12', cancelable: true })
    act(() => {
      document.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(result.current.violations).toHaveLength(1)
    expect(result.current.violations[0].type).toBe('devtools_shortcut')
  })

  it('disqualifies after max warnings', () => {
    const { result } = renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result.current.warningCount).toBe(1)
    expect(result.current.isDisqualified).toBe(false)

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result.current.warningCount).toBe(2)
    expect(result.current.isDisqualified).toBe(false)

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result.current.warningCount).toBe(3)
    expect(result.current.isDisqualified).toBe(true)
  })

  it('isolates violations per exam', () => {
    const { result: result1 } = renderHook(() => useAntiCheat({ examId: 'exam-a' }))

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result1.current.violations).toHaveLength(1)

    const { result: result2 } = renderHook(() => useAntiCheat({ examId: 'exam-b' }))
    expect(result2.current.violations).toHaveLength(0)
  })

  it('prevents copy and paste', () => {
    renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    const copyEvent = new Event('copy', { cancelable: true })
    act(() => { document.dispatchEvent(copyEvent) })
    expect(copyEvent.defaultPrevented).toBe(true)

    const pasteEvent = new Event('paste', { cancelable: true })
    act(() => { document.dispatchEvent(pasteEvent) })
    expect(pasteEvent.defaultPrevented).toBe(true)
  })

  it('prevents context menu', () => {
    renderHook(() => useAntiCheat({ examId: 'exam-1' }))

    const event = new Event('contextmenu', { cancelable: true })
    act(() => { document.dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(true)
  })

  it('increments timeSpent with timer', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useAntiCheat({ examId: 'exam-timer' }))

    act(() => { vi.advanceTimersByTime(3000) })

    expect(result.current.timeSpent).toBeGreaterThanOrEqual(2)

    unmount()
    vi.useRealTimers()
  })
})
