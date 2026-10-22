const GAP_BELOW_HEADER_PX = 16;

// Scrolls so the element sits just below the sticky site header instead of underneath it.
export function scrollToElement(element, behavior = 'smooth') {
  if (!element) {
    return;
  }

  const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
  const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - GAP_BELOW_HEADER_PX;

  window.scrollTo({ top: Math.max(top, 0), behavior });
}
