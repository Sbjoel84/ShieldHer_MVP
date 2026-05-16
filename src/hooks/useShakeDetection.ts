import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

interface Config {
  /** G-force delta threshold per axis to count as a shake movement (default 1.8) */
  threshold?: number;
  /** Number of shake movements needed to fire (default 3) */
  count?: number;
  /** Rolling time window in ms to accumulate shakes (default 1500) */
  windowMs?: number;
  /** Minimum ms between triggered callbacks (debounce) */
  debounceMs?: number;
  enabled?: boolean;
}

export function useShakeDetection(onShake: () => void, config: Config = {}) {
  const {
    threshold = 1.8,
    count = 3,
    windowMs = 1500,
    debounceMs = 3000,
    enabled = true,
  } = config;

  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const prev = useRef({ x: 0, y: 0, z: 0 });
  const shakes = useRef(0);
  const windowStart = useRef(0);
  const lastFired = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(80);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const dx = Math.abs(x - prev.current.x);
      const dy = Math.abs(y - prev.current.y);
      const dz = Math.abs(z - prev.current.z);
      prev.current = { x, y, z };

      const peak = Math.max(dx, dy, dz);
      if (peak < threshold) return;

      const now = Date.now();

      if (now - windowStart.current > windowMs) {
        shakes.current = 1;
        windowStart.current = now;
      } else {
        shakes.current++;
      }

      if (shakes.current >= count) {
        shakes.current = 0;
        if (now - lastFired.current > debounceMs) {
          lastFired.current = now;
          onShakeRef.current();
        }
      }
    });

    return () => sub.remove();
  }, [enabled, threshold, count, windowMs, debounceMs]);
}
