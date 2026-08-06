export const TABS = [
  'general',
  'film',
  'card',
  'user-card',
  'translate',
  'cache',
  'about',
];

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function activateTab(dialog, tabId, shouldFocus = false) {
  if (!TABS.includes(tabId)) return;
  dialog.querySelectorAll('[data-tab]').forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
    if (isActive && shouldFocus) tab.focus();
  });
  dialog.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    const show = panel.dataset.panel === tabId;
    panel.classList.remove('is-entering');
    panel.hidden = !show;
    if (!show) return;
    if (prefersReducedMotion()) return;
    void panel.offsetWidth;
    panel.classList.add('is-entering');
  });
}
