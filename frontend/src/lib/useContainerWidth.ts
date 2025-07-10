import { useState, useLayoutEffect, useRef } from 'react';

/**
 * useContainerWidth - React hook to get the width of a DOM element responsively.
 * Returns a ref to attach to the element and the current width (number).
 * Uses ResizeObserver if available, otherwise falls back to window resize events.
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    function updateWidth() {
      if (ref.current) setWidth(ref.current.offsetWidth);
    }

    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => updateWidth());
      observer.observe(element);
    } else {
      (window as Window).addEventListener('resize', updateWidth);
    }

    return () => {
      if (observer && element) observer.unobserve(element);
      (window as Window).removeEventListener('resize', updateWidth);
    };
  }, []);

  return [ref, width] as const;
}
