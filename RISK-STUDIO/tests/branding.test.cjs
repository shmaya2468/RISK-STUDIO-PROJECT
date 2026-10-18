const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');
const pages = ['index.html', 'discipline.html'];
const base = 'https://risk-studio.netlify.app';

test('both pages have matching visual brand, contact and full social metadata', () => {
  for (const name of pages) {
    const html = read(name);
    const expectedUrl = name === 'index.html' ? base + '/' : base + '/discipline.html';
    assert.match(html, /<html lang="he" dir="rtl">/);
    assert.match(html, /class="brand-mark"><i><\/i><i><\/i><\/span>/);
    assert.match(html, /href="branding-polish\.css"/);
    assert.ok(html.includes('<link rel="canonical" href="' + expectedUrl + '"'));
    assert.ok(html.includes('property="og:url" content="' + expectedUrl + '"'));
    assert.ok(html.includes('property="og:image" content="' + base + '/social-preview.png"'));
    for (const prop of ['og:title', 'og:description', 'og:image:width', 'og:image:height', 'og:image:alt']) {
      assert.ok(html.includes('property="' + prop + '"'), name + ': missing ' + prop);
    }
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /href="\/favicon\.svg"/);
    assert.match(html, /href="\/apple-touch-icon\.png"/);
    assert.match(html, /כל הזכויות שמורות/);
    assert.match(html, /href="mailto:SHMAYA\.IFERGAN@gmail\.com"/);
    assert.doesNotMatch(html, /↗|↘|✳/, name + ': outdated mobile emoji-style glyph');
  }
});

test('link preview and browser touch icons are shipped as real local assets', () => {
  for (const [name, width, height] of [
    ['social-preview.png', 1200, 630],
    ['favicon-48.png', 48, 48],
    ['apple-touch-icon.png', 180, 180],
    ['icon-192.png', 192, 192]
  ]) {
    const buffer = fs.readFileSync(path.join(dist, name));
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name);
    assert.equal(buffer.readUInt32BE(16), width, name + ' width');
    assert.equal(buffer.readUInt32BE(20), height, name + ' height');
  }
  assert.match(read('favicon.svg'), /<svg[^>]*viewBox=/);
});

test('mobile branding removes center CTA and uses native CSS or SVG icons', () => {
  const css = read('branding-polish.css');
  assert.match(css, /max-width:1080px/);
  assert.match(css, /\.navbar \.nav-actions,\.discipline-nav \.top-action\{display:none!important\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(read('discipline.html'), /class="path-icon path-icon-positive"[^>]*>\s*<svg/);
  assert.match(read('discipline.html'), /class="path-icon path-icon-negative"[^>]*>\s*<svg/);
  assert.match(read('index.html'), /class="discipline-pill-icon"[^>]*>\s*<svg/);
  assert.match(read('index.html'), /class="risk-direction-dot"/);
  assert.match(read('index.html'), /data-market="nasdaq"/);
});
