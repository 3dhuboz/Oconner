'use client';
import { useEffect } from 'react';

const TRANSITION = 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';

const INITIAL_STYLES: Record<string, { opacity: string; transform: string }> = {
  'reveal': { opacity: '0', transform: 'translateY(32px)' },
  'reveal-left': { opacity: '0', transform: 'translateX(-48px)' },
  'reveal-right': { opacity: '0', transform: 'translateX(48px)' },
  'reveal-scale': { opacity: '0', transform: 'scale(0.92)' },
};

const STAGGER_DELAYS: Record<string, string> = {
  'stagger-1': '0.1s', 'stagger-2': '0.2s', 'stagger-3': '0.3s',
  'stagger-4': '0.4s', 'stagger-5': '0.5s',
};

function initElement(el: HTMLElement) {
  for (const [cls, styles] of Object.entries(INITIAL_STYLES)) {
    if (el.classList.contains(cls)) {
      el.style.opacity = styles.opacity;
      el.style.transform = styles.transform;
      el.style.transition = TRANSITION;
      // Apply stagger delay
      for (const [stagger, delay] of Object.entries(STAGGER_DELAYS)) {
        if (el.classList.contains(stagger)) {
          el.style.transitionDelay = delay;
          break;
        }
      }
      break;
    }
  }
}

function revealElement(el: HTMLElement) {
  el.style.opacity = '1';
  el.style.transform = 'none';
}

export function useScrollReveal() {
  useEffect(() => {
    const selector = '.reveal, .reveal-left, .reveal-right, .reveal-scale';

    function setup() {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (!el.dataset.revealInit) {
          el.dataset.revealInit = '1';
          initElement(el);
        }
      });
    }

    function revealVisible() {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.dataset.revealed) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 20) {
          el.dataset.revealed = '1';
          revealElement(el);
        }
      });
    }

    setup();
    // Small delay to allow initial paint, then set opacity to 0
    requestAnimationFrame(() => {
      setup();
      revealVisible();
    });

    const onScroll = () => revealVisible();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Re-check periodically for dynamically loaded content
    const t1 = setTimeout(() => { setup(); revealVisible(); }, 500);
    const t2 = setTimeout(() => { setup(); revealVisible(); }, 1500);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
}
