/**
 * Vitest global setup — runs before each test file.
 *
 * Mocks browser APIs not available in jsdom that are required by
 * @dsa/design-system-angular internals.
 */

// DSA app-shell uses window.matchMedia for breakpoint detection.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// DSA app-shell uses ResizeObserver to track header height.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
  };
}


