const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const page = name => fs.readFileSync(path.join(__dirname, '../dist', name), 'utf8');

test('both pages have a connected accessible mobile side menu', () => {
  for (const name of ['index.html', 'discipline.html']) {
    const html = page(name);
    assert.match(html, /href="mobile-nav\.css"/);
    assert.match(html, /src="mobile-nav\.js" defer/);
    assert.match(html, /class="mobile-menu-toggle"[^>]+aria-controls="mobile-nav-drawer"[^>]+aria-expanded="false"/);
    assert.match(html, /id="mobile-nav-backdrop" hidden/);
    assert.match(html, /id="mobile-nav-drawer"[^>]+aria-modal="true"[^>]+aria-hidden="true" inert/);
    const links = [...html.matchAll(/class="mobile-drawer-links"[\s\S]*?<\/nav>/g)][0]?.[0];
    assert.ok(links, `${name}: drawer must contain navigation links`);
    for (const [, anchor] of links.matchAll(/href="#([\w-]+)"/g)) {
      assert.match(html, new RegExp(`id="${anchor}"`), `${name}: missing anchor #${anchor}`);
    }
  }
});

test('discipline page shows all ten distinct rules before the journal', () => {
  const html = page('discipline.html');
  assert.equal((html.match(/class="iron-law-card(?: iron-law-final)?"/g) || []).length, 10);
  assert.ok(html.indexOf('id="trading-business"') < html.indexOf('id="iron-laws"'));
  assert.ok(html.indexOf('id="iron-laws"') < html.indexOf('id="daily-code"'));
  for (const phrase of ['תשמור על הכסף שלך', 'סט־אפ אחד טוב', 'שכר לימוד, לא כישלון', 'ניהול סיכונים חשוב יותר',
    'תוריד סיכון', 'אם זה לא חלק מהתוכנית', 'עקביות מנצחת', 'סבלנות היא מיומנות',
    'תפסיק לסחור', 'המטרה היא']) {
    assert.ok(html.includes(phrase), `missing law: ${phrase}`);
  }
  assert.match(html, /class="iron-law-card iron-law-final"/);
  assert.match(html, /id="iron-laws"/);
});

test('hamburger opens, traps focus, and closes via Escape without leaving drawer interactive', () => {
  function element() {
    const listeners = {};
    const classes = new Set();
    return {
      attrs: {}, listeners, classes, hidden: false, inert: false, focused: false,
      classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { listeners[k] = fn; },
      focus() { context.document.activeElement = this; this.focused = true; },
      getClientRects: () => [{}],
      emit(k, event = {}) { listeners[k]?.(event); }
    };
  }
  const toggle = element();
  const drawer = element();
  const backdrop = element();
  const close = element();
  const link = element();
  const body = element();
  const events = {};
  const timers = [];
  drawer.querySelector = () => close;
  drawer.querySelectorAll = () => [close, link];
  const context = {
    document: {
      body, activeElement: null,
      querySelector: s => s === '.mobile-menu-toggle' ? toggle : null,
      getElementById: id => ({ 'mobile-nav-drawer': drawer, 'mobile-nav-backdrop': backdrop })[id],
      addEventListener: (k, fn) => { events[k] = fn; }
    },
    window: { matchMedia: () => ({ addEventListener: () => {} }) },
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => { timers.push(fn); return timers.length; },
    clearTimeout: () => {}
  };
  vm.runInNewContext(page('mobile-nav.js'), context);
  toggle.emit('click');
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  assert.equal(drawer.inert, false);
  assert.equal(backdrop.hidden, false);
  assert.equal(body.classes.has('mobile-nav-open'), true);
  assert.equal(context.document.activeElement, close);
  let prevented = false;
  context.document.activeElement = link;
  events.keydown({ key: 'Tab', shiftKey: false, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(context.document.activeElement, close);
  events.keydown({ key: 'Escape', preventDefault() {} });
  timers.forEach(fn => fn());
  assert.equal(toggle.attrs['aria-expanded'], 'false');
  assert.equal(drawer.inert, true);
  assert.equal(backdrop.hidden, true);
  assert.equal(body.classes.has('mobile-nav-open'), false);
  assert.equal(context.document.activeElement, toggle);
});
