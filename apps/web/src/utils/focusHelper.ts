import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to automatically scroll to and highlight a field based on the ?focus= search param.
 * @param containerRef Ref to the scrolling container
 */
export function useFocusFromSearch() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusTarget = params.get('focus');
    if (!focusTarget) return;

    // Use a slight delay to allow rendering and panel expanding
    const timer = setTimeout(() => {
      // Find exact element using data-field attribute, name attribute, or id
      const elements = [
        document.querySelector(`[data-field="${focusTarget}"]`),
        document.querySelector(`[name="${focusTarget}"]`),
        document.querySelector(`#${focusTarget}`),
        document.querySelector(`[data-focus-target="${focusTarget}"]`)
      ];

      const el = elements.find(e => e !== null) as HTMLElement;

      if (el) {
        // Scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus if it's an input/button
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }

        // Add highlight class briefly
        const originalBg = el.style.backgroundColor;
        const originalTransition = el.style.transition;
        
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'; // indigo-500 with opacity
        
        setTimeout(() => {
          el.style.backgroundColor = originalBg;
          setTimeout(() => {
            el.style.transition = originalTransition;
          }, 300);
        }, 2000);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [location.search, location.hash]);
}
