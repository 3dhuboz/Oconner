'use client';
import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const selector = '.reveal:not(.visible), .reveal-left:not(.visible), .reveal-right:not(.visible), .reveal-scale:not(.visible)';

    function revealAboveViewport() {
      // Instantly reveal any elements already above or in the viewport
      document.querySelectorAll(selector).forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100) {
          el.classList.add('visible');
        }
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 0px 0px' }
    );

    function observe() {
      revealAboveViewport();
      document.querySelectorAll(selector).forEach((el) => observer.observe(el));
    }

    // Observe now and after hydration
    observe();
    const t1 = setTimeout(observe, 300);
    const t2 = setTimeout(observe, 1000);

    // Also reveal on scroll (catches fast scrolling that IntersectionObserver misses)
    const onScroll = () => revealAboveViewport();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
