import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Whether the OS "Reduce Motion" accessibility setting is on. Subscribes to
 * live changes so a toggle mid-session takes effect immediately.
 *
 * Components that animate (skeleton pulse, sheet slide) read this and switch to
 * an instant / crossfade alternative per design section 11 ("Reduce Motion: all
 * animations have an instant/crossfade alternative").
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let active = true
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) setReduceMotion(value)
    })
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value)
    })
    return () => {
      active = false
      sub.remove()
    }
  }, [])

  return reduceMotion
}
