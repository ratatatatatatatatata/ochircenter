import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('index.html');
const standalone = read('expo-2027.html');
const controller = read('ngo-website/js/expo-2027.js');

test('Expo precedes the preserved original homepage sections', () => {
  assert.ok(home.indexOf('id="expo-2027"') < home.indexOf('id="ochir-center"'));
  for (const id of ['home', 'mission', 'projects', 'contact', 'contactForm']) {
    assert.ok(home.indexOf(`id="${id}"`) > home.indexOf('id="ochir-center"'), id);
  }
});

for (const [name, html] of [['home', home], ['standalone', standalone]]) {
  test(`${name}: unique IDs and real Expo anchor destinations`, () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const match of html.matchAll(/href="#(expo-[^"]+|ochir-center)"/g)) {
      assert.ok(ids.includes(match[1]), match[1]);
    }
  });
  test(`${name}: both languages, honest enquiry flow and local assets`, () => {
    for (const lang of ['mn', 'en']) assert.ok(html.includes(`data-expo-language="${lang}"`));
    assert.ok(html.includes('mailto:ceo@ochircenter.org?subject='));
    assert.ok(html.includes('tel:+97699682882'));
    assert.ok(html.includes('Sending an enquiry does not confirm participation.'));
    assert.ok(html.includes('Exact dates and the exhibition venue will be announced once confirmed.'));
    for (const path of ['ngo-website/css/expo-2027.css', 'ngo-website/js/expo-2027.js']) {
      assert.ok(html.includes(path));
      assert.ok(existsSync(new URL('../' + path, import.meta.url)));
    }
  });
}

function setup({ search = '', saved, blockedStorage = false, standalone = false } = {}) {
  const rootListeners = {};
  const windowListeners = {};
  const nodes = ['mn', 'en'].map(lang => ({ hidden: lang !== 'mn', getAttribute: () => lang }));
  const buttons = ['mn', 'en'].map(lang => ({ getAttribute: () => lang, setAttribute(key, value) { this[key] = value; } }));
  const root = { querySelectorAll: selector => selector === '[data-expo-language]' ? nodes : buttons,
    addEventListener: (name, fn) => { rootListeners[name] = fn; } };
  const document = { documentElement: {}, body: { hasAttribute: () => standalone },
    querySelector: selector => selector === '[data-expo-root]' ? root : null };
  const changes = [];
  const window = { addEventListener: (name, fn) => { windowListeners[name] = fn; },
    i18next: { isInitialized: true, on: (name, fn) => { windowListeners[name] = fn; } },
    changeLanguage: lang => changes.push(lang) };
  const history = { replaceState: (_, __, url) => { history.url = url.href; } };
  const localStorage = {
    getItem: () => { if (blockedStorage) throw Error('blocked'); return saved; },
    setItem: (_, value) => { if (blockedStorage) throw Error('blocked'); saved = value; },
  };
  runInNewContext(controller, { document, window, history, localStorage, URL, URLSearchParams,
    location: { search, hash: '', href: 'https://ochircenter.org/' + search } });
  return { document, nodes, buttons, changes, history, rootListeners, windowListeners };
}

test('default language is Mongolian; URL wins over saved preference; invalid URL is ignored', () => {
  assert.equal(setup().document.documentElement.lang, 'mn');
  assert.equal(setup({ search: '?lang=en', saved: 'mn' }).document.documentElement.lang, 'en');
  assert.equal(setup({ search: '?lang=invalid', saved: 'en' }).document.documentElement.lang, 'en');
});
test('language switch toggles content, pressed state, URL and original site language', () => {
  const state = setup();
  state.rootListeners.click({ target: { closest: () => state.buttons[1] } });
  assert.equal(state.document.documentElement.lang, 'en');
  assert.deepEqual(state.nodes.map(node => node.hidden), [true, false]);
  assert.equal(state.buttons[1]['aria-pressed'], 'true');
  assert.deepEqual(state.changes, ['en']);
  assert.match(state.history.url, /lang=en/);
});
test('blocked preference storage does not prevent language switching', () => {
  const state = setup({ blockedStorage: true });
  state.rootListeners.click({ target: { closest: () => state.buttons[1] } });
  assert.equal(state.document.documentElement.lang, 'en');
});
test('original language switch and cross-tab preference keep Expo and homepage synchronized', () => {
  const state = setup();
  state.windowListeners.languageChanged('en');
  assert.equal(state.document.documentElement.lang, 'en');
  state.windowListeners.storage({ key: 'siteLang', newValue: 'mn' });
  assert.equal(state.document.documentElement.lang, 'mn');
  assert.deepEqual(state.changes, ['mn']);
  state.windowListeners.storage({ key: 'siteLang', newValue: 'invalid' });
  assert.equal(state.document.documentElement.lang, 'mn');
});
