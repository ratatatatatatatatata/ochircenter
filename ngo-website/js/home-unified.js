/* Homepage-only interactions. Other pages retain their existing controller. */
(function () {
  'use strict';
  if (!document.body.classList.contains('ochir-home')) return;
  document.body.classList.add('home-enhanced');
  const menu = document.getElementById('site-menu');
  const toggle = document.querySelector('[data-menu-toggle]');
  const mobile = window.matchMedia('(max-width: 1000px)');
  function closeMenu(returnFocus) {
    if (!menu || !toggle) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }
  if (menu && toggle) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', event => {
      if (event.target.closest('a') && mobile.matches) closeMenu(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.site-header')) closeMenu(false);
    });
    mobile.addEventListener('change', () => closeMenu(false));
  }
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = name => form.elements.namedItem(name).value.trim();
      const name = value('contactName');
      const email = value('contactEmail');
      const subject = value('contactSubject').replace(/[\r\n]/g, ' ');
      const message = value('contactMessage');
      const mn = document.documentElement.lang !== 'en';
      const body = `${mn ? 'Нэр' : 'Name'}: ${name}\n${mn ? 'Имэйл' : 'Email'}: ${email}\n\n${message}`;
      const status = document.getElementById('contact-status');
      if (status) status.textContent = mn
        ? 'Имэйл программ нээгдсэн бол захидлаа тэндээс илгээнэ үү. Нээгдээгүй бол ceo@ochircenter.org хаягт бичээрэй. Таны бичсэн мэдээлэл энд хэвээр байна.'
        : 'If your email application opened, send your message there. Otherwise, write to ceo@ochircenter.org. Your text is still here.';
      // Compose only; never claim the message was delivered or clear unsent text.
      window.location.href = `mailto:ceo@ochircenter.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
