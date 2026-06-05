require('@testing-library/jest-dom');

// Polyfill for components that touch matchMedia / IntersectionObserver
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addListener: () => {}, removeListener: () => {} };
  };

  class MockIntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  window.IntersectionObserver = MockIntersectionObserver;
}
