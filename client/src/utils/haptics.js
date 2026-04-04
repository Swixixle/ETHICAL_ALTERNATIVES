export function haptic(pattern = 'tap') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns = {
    tap: [10],
    confirm: [15, 50, 15],
    success: [20, 30, 40],
    error: [100],
    scan: [5, 20, 5, 20, 5],
  };
  navigator.vibrate(patterns[pattern] || [10]);
}
