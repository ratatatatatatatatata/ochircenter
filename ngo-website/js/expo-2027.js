/* Shared bilingual behavior for the supplied Expo page and homepage section. */
(function () {
  'use strict';
  const root = document.querySelector('[data-expo-root]');
  if (!root) return;
  const isStandalone = document.body.hasAttribute('data-expo-page');
  const valid = value => value === 'mn' || value === 'en';
  const titles = {
    mn: 'MADE IN USA EXPO MONGOLIA 2027 | Очир Центр',
    en: 'MADE IN USA EXPO MONGOLIA 2027 | Ochir Center',
  };
  const descriptions = {
    mn: '2027 оны 6 дугаар сард Улаанбаатарт зохион байгуулахаар төлөвлөж буй АНУ-ын үйлдвэрлэгчид, Монголын худалдан авагчдыг холбох үзэсгэлэн, бизнес уулзалт.',
    en: 'A trade exhibition and business matchmaking event planned for June 2027 in Ulaanbaatar, connecting U.S. manufacturers with Mongolian buyers.',
  };
  function update(lang, persist) {
    if (!valid(lang)) return;
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-expo-language]').forEach(el => {
      el.hidden = el.getAttribute('data-expo-language') !== lang;
    });
    root.querySelectorAll('[data-expo-lang]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-expo-lang') === lang));
    });
    if (isStandalone) {
      document.title = titles[lang];
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = descriptions[lang];
    }
    if (persist) {
      try { localStorage.setItem('siteLang', lang); } catch (error) { /* Private browsing stays usable. */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      if (/^#expo-contact-(mn|en)$/.test(url.hash)) url.hash = 'expo-contact-' + lang;
      try { history.replaceState(null, '', url); } catch (error) { /* No navigation required. */ }
    }
  }
  let saved;
  try { saved = localStorage.getItem('siteLang'); } catch (error) { /* Optional preference only. */ }
  const requested = new URLSearchParams(location.search).get('lang');
  const initial = valid(requested) ? requested : valid(saved) ? saved : 'mn';
  update(initial, false);
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-expo-lang]');
    if (!button) return;
    const lang = button.getAttribute('data-expo-lang');
    if (!valid(lang)) return;
    update(lang, true);
    if (!isStandalone && window.i18next && window.i18next.isInitialized && typeof window.changeLanguage === 'function') {
      window.changeLanguage(lang);
    }
  });
  if (!isStandalone && window.i18next && typeof window.i18next.on === 'function') {
    window.i18next.on('languageChanged', lang => update(lang, true));
  }
  window.addEventListener('storage', event => {
    if (event.key !== 'siteLang' || !valid(event.newValue)) return;
    update(event.newValue, false);
    if (!isStandalone && window.i18next && window.i18next.isInitialized && typeof window.changeLanguage === 'function') {
      window.changeLanguage(event.newValue);
    }
  });
  if (/^#expo-contact-(mn|en)$/.test(location.hash)) {
    const target = document.getElementById('expo-contact-' + initial);
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
})();
