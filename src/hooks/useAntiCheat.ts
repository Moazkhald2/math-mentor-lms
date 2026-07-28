import { useEffect, useRef, useCallback, useState } from 'react'

const VIOLATION_STORAGE_KEY = 'math_mentor_violations'

export interface AntiCheatConfig {
  maxWarnings?: number
  onViolation?: (type: string, count: number) => void
  onDisqualified?: () => void
}

export interface AntiCheatState {
  violations: { type: string; timestamp: number }[]
  warningCount: number
  isDisqualified: boolean
  timeSpent: number
  isFullscreen: boolean
}

function loadPersistedViolations(): { type: string; timestamp: number }[] {
  try {
    const raw = sessionStorage.getItem(VIOLATION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistViolations(v: { type: string; timestamp: number }[]) {
  try { sessionStorage.setItem(VIOLATION_STORAGE_KEY, JSON.stringify(v)) } catch {}
}

export function useAntiCheat(config: AntiCheatConfig = {}) {
  const { maxWarnings = 3, onViolation, onDisqualified } = config

  const [state, setState] = useState<AntiCheatState>({
    violations: loadPersistedViolations(),
    warningCount: 0,
    isDisqualified: false,
    timeSpent: 0,
    isFullscreen: !!document.fullscreenElement,
  })

  const violationsRef = useRef(state.violations)
  const warningRef = useRef(state.warningCount)
  const disqualifiedRef = useRef(state.isDisqualified)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addViolation = useCallback((type: string) => {
    if (disqualifiedRef.current) return

    const updated = [...violationsRef.current, { type, timestamp: Date.now() }]
    violationsRef.current = updated
    const newCount = warningRef.current + 1
    warningRef.current = newCount
    persistViolations(updated)

    setState((prev) => ({
      ...prev,
      violations: updated,
      warningCount: newCount,
    }))

    onViolation?.(type, newCount)

    if (newCount >= maxWarnings) {
      disqualifiedRef.current = true
      setState((prev) => ({ ...prev, isDisqualified: true }))
      onDisqualified?.()
    }
  }, [maxWarnings, onViolation, onDisqualified])

  // Restore warning count from persisted violations
  useEffect(() => {
    const restored = loadPersistedViolations()
    if (restored.length > 0) {
      violationsRef.current = restored
      warningRef.current = restored.length
      setState(prev => ({ ...prev, violations: restored, warningCount: restored.length }))
      if (restored.length >= maxWarnings) {
        disqualifiedRef.current = true
        setState(prev => ({ ...prev, isDisqualified: true }))
        onDisqualified?.()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) addViolation('tab_switch')
    }

    const handleBlur = () => {
      addViolation('window_blur')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        addViolation('keyboard_shortcut')
      }
      if (e.key === 'Escape' && document.fullscreenElement) {
        e.preventDefault()
        addViolation('exit_fullscreen')
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase()))) {
        e.preventDefault()
        addViolation('devtools_shortcut')
      }
    }

    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); addViolation('copy_attempt') }
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); addViolation('paste_attempt') }
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); addViolation('contextmenu') }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) addViolation('exit_fullscreen')
      setState((prev) => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
    }

    const handleResize = () => {
      const w = window.outerWidth - window.innerWidth
      const h = window.outerHeight - window.innerHeight
      if (w > 200 || h > 200) addViolation('suspicious_resize')
    }

    // DevTools detection via element trick (works in Chrome/Edge)
    const devtoolsElement = new Image()
    Object.defineProperty(devtoolsElement, 'id', {
      get: () => { addViolation('devtools_open'); return '' }
    })
    let devtoolsInterval: ReturnType<typeof setInterval>
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
    if (!isFirefox) {
      devtoolsInterval = setInterval(() => {
        console.log(devtoolsElement)
        const threshold = 160
        const widthDiff = window.outerWidth - window.innerWidth
        const heightDiff = window.outerHeight - window.innerHeight
        if (widthDiff > threshold || heightDiff > threshold) {
          addViolation('devtools_open')
        }
      }, 1000)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('resize', handleResize)

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, timeSpent: Math.floor((Date.now() - startTimeRef.current) / 1000) }))
    }, 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('resize', handleResize)
      if (timerRef.current) clearInterval(timerRef.current)
      if (devtoolsInterval) clearInterval(devtoolsInterval)
    }
  }, [addViolation])

  const requestFullscreen = useCallback(async () => {
    try { await document.documentElement.requestFullscreen() }
    catch { addViolation('fullscreen_blocked') }
  }, [addViolation])

  const exitFullscreen = useCallback(async () => {
    try { await document.exitFullscreen() }
    catch {}
  }, [])

  return { ...state, requestFullscreen, exitFullscreen }
}
