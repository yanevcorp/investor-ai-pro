import { useEffect, useRef, useState } from 'react';

const FLASH_DURATION_MS = 900;

// Returns 'up' | 'down' | null for a brief window right after `value`
// changes, so a price update can flash green/red instead of just
// silently re-rendering with a new number.
export default function useFlashOnChange(value) {
  const [flash, setFlash] = useState(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value == null) return undefined;
    if (prevRef.current == null) {
      prevRef.current = value;
      return undefined;
    }
    if (value === prevRef.current) return undefined;

    setFlash(value > prevRef.current ? 'up' : 'down');
    prevRef.current = value;
    const timer = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return flash;
}
