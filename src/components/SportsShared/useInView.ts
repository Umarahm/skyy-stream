import { useCallback, useEffect, useRef, useState } from "react";

// Fires once, the first time the observed element enters the viewport (plus
// `rootMargin`), then disconnects — used to trigger a section's data fetch
// only once the user scrolls near it instead of on initial page load.
//
// The element this attaches to is often mounted behind a loading/conditional
// branch, so it doesn't exist on first render. `attached` exists purely to
// re-run the observer-setup effect once the real node mounts (a plain
// useRef's identity never changes, so it can't be a dependency). The DOM
// node itself stays in a ref, not state — passing a bare `useState` setter
// straight to `ref` is fragile (storing the live element in component state
// rather than a stable wrapped callback) and threw a "Should have a queue"
// React invariant violation under Fast Refresh.
export const useInView = <T extends Element>(rootMargin = "400px 0px") => {
  const elementRef = useRef<T | null>(null);
  const [attached, setAttached] = useState(false);
  const [inView, setInView] = useState(false);

  const ref = useCallback((el: T | null) => {
    elementRef.current = el;
    setAttached(Boolean(el));
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [attached, inView, rootMargin]);

  return { ref, inView } as const;
};
