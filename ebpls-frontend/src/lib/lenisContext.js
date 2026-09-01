/**
 * lenisContext.js
 * Context and hooks for the Lenis smooth-scroll instance.
 *
 * Kept separate from lenis.jsx so that module can export only its component,
 * which is what React Fast Refresh requires.
 */
import { createContext, useContext, useMemo } from 'react';
import { gsap } from './gsap';
import { prefersReducedMotion } from './animations';

/**
 * The context holds a stable ref box rather than the instance itself. Consumers
 * only read it inside event handlers, so there is no reason to re-render the
 * tree when Lenis is created — and holding the instance in state would mean
 * calling setState from inside an effect.
 */
export const LenisContext = createContext({ current: null });

/**
 * Access the ref box holding the active Lenis instance.
 * `ref.current` is null when smooth scrolling is disabled (reduced motion) or
 * when called outside a LenisWrapper.
 *
 * @returns {{ current: import('lenis').default | null }}
 */
export function useLenisRef() {
  return useContext(LenisContext);
}

/**
 * Returns a scroll helper that uses Lenis when available and falls back to
 * GSAP's ScrollToPlugin otherwise, so anchor navigation always works.
 *
 * @returns {(target: string | HTMLElement, options?: object) => void}
 */
export function useScrollTo() {
  const lenisRef = useLenisRef();

  return useMemo(
    () => (target, options = {}) => {
      const reduce = prefersReducedMotion();
      const lenis = lenisRef.current;

      if (lenis) {
        lenis.scrollTo(target, {
          offset: options.offset ?? 0,
          duration: reduce ? 0 : (options.duration ?? 1.2),
          immediate: reduce,
          // `force` lets the scroll run even while Lenis is stopped, which is
          // the case for a moment when an anchor is tapped inside a locked
          // mobile menu.
          force: true,
        });
        return;
      }

      const element =
        typeof target === 'string' ? document.querySelector(target) : target;
      // `element` may legitimately be the number 0 ("scroll to top"), so test
      // for null/undefined rather than falsiness.
      if (element === null || element === undefined) return;

      gsap.to(window, {
        scrollTo: { y: element, offsetY: -(options.offset ?? 0) },
        duration: reduce ? 0 : (options.duration ?? 1.2),
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    },
    [lenisRef],
  );
}
