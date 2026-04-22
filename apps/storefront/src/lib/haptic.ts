/**
 * Fire a short haptic vibration on devices that support the Vibration API.
 *
 * No-op on desktop browsers, iOS Safari (no support), and any device where
 * the call throws (some privacy modes). Intended to be called on discrete
 * user actions — tab taps, add-to-cart, variant selection, toggle switches.
 */
export function haptic(pattern: number | number[] = 6): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // no-op
  }
}
