(() => {
  'use strict';

  const toggle = document.querySelector('.mobile-menu-toggle');
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const closeButton = drawer?.querySelector('.mobile-menu-close');
  if (!toggle || !drawer || !backdrop || !closeButton) return;

  let isOpen = false;
  let hideBackdropTimer = null;

  function closeMenu(restoreFocus = true) {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.inert = true;
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'פתח תפריט ניווט');
    document.body.classList.remove('mobile-nav-open');
    clearTimeout(hideBackdropTimer);
    hideBackdropTimer = setTimeout(() => { if (!isOpen) backdrop.hidden = true; }, 320);
    if (restoreFocus && toggle.getClientRects().length) toggle.focus();
  }

  function openMenu() {
    if (isOpen) return;
    clearTimeout(hideBackdropTimer);
    isOpen = true;
    backdrop.hidden = false;
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'סגור תפריט ניווט');
    document.body.classList.add('mobile-nav-open');
    requestAnimationFrame(() => {
      if (isOpen) {
        drawer.classList.add('is-open');
        backdrop.classList.add('is-open');
        closeButton.focus();
      }
    });
  }

  toggle.addEventListener('click', () => isOpen ? closeMenu(false) : openMenu());
  closeButton.addEventListener('click', () => closeMenu());
  backdrop.addEventListener('click', () => closeMenu());
  drawer.addEventListener('click', event => {
    if (event.target.closest('a[href]')) closeMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const wideLayout = window.matchMedia('(min-width: 1081px)');
  wideLayout.addEventListener('change', event => { if (event.matches) closeMenu(false); });
})();
