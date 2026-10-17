const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const dist = join(__dirname, '../dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const css = readFileSync(join(dist, 'insights.css'), 'utf8');
const app = readFileSync(join(dist, 'app.js'), 'utf8');

test('new mentor library is on the existing single-page site', () => {
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /<link rel="stylesheet" href="insights\.css"/);
  assert.match(html, /href="#insights">מנטורים/);
  assert.ok(html.indexOf('id="markets-explained"') < html.indexOf('id="insights"'));
  assert.ok(html.indexOf('id="insights"') < html.indexOf('id="guide"'));
  assert.equal((html.match(/<article class="insight-card/g) || []).length, 9);
  assert.equal((html.match(/<details class="article-more">/g) || []).length, 9);
  assert.match(html, /href="discipline\.html"/);
});

test('nine articles include credit and primary-source links', () => {
  const trusted = [
    'traderfeed.blogspot.com/2018/05/losing-right-way.html',
    'vantharpinstitute.com/van-tharp-teaches-position-sizing-strategies-and-risk-management/',
    'penguinrandomhouse.com/books/350665/trading-in-the-zone-by-mark-douglas/',
    'lindaraschke.net/wp-content/uploads/2013/11/rituals.pdf',
    'tradertom.com/all-you-ever-need-to-know-about-stop-loss-placement/',
    'jamesclear.com/identity-based-habits',
    'behaviormodel.org/home',
    'jocko.com/about/',
    'traderfeed.blogspot.com/2008/03/formatting-your-trading-journal-for.html'
  ];
  trusted.forEach(url => assert.ok(html.includes(url), `Missing ${url}`));
  assert.equal((html.match(/class="article-source"/g) || []).length, trusted.length);
  assert.match(html, /המאמרים הם סיכומים מקוריים בעברית/);
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length >= 8, true);
});

test('topic filters map to available content and update state accessibly', () => {
  for (const topic of ['all','risk','mind','execution']) assert.ok(html.includes(`data-topic="${topic}"`));
  assert.equal((html.match(/data-article-topic="risk"/g) || []).length, 2);
  assert.equal((html.match(/data-article-topic="mind"/g) || []).length, 4);
  assert.equal((html.match(/data-article-topic="execution"/g) || []).length, 3);
  assert.match(html, /id="insights-count" aria-live="polite"/);
  assert.match(app, /function initInsights\(\)/);
  assert.match(app, /article\.hidden = !matches/);
  assert.match(app, /filter\.setAttribute\('aria-pressed'/);
});

test('mobile articles, horizontal topic filters and input focus sizing are styled', () => {
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.match(css, /@media\(max-width:850px\)/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(max-width:490px\)/);
  assert.match(css, /\.insights-grid\{grid-template-columns:1fr/);
  assert.match(css, /\.insight-filters\{flex-wrap:nowrap;[^}]*overflow-x:auto/);
  assert.match(css, /\.calculator-section input\[type=number\]\{font-size:16px!important\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('navigation offers a prominent discipline link on desktop and mobile without a new-page label', () => {
  assert.match(html, /class="nav-discipline-link"/);
  assert.match(html, /class="nav-discipline-mobile"/);
  assert.match(html, /nav-discipline-mobile" aria-label="עבור לעמוד משמעת ברזל"/);
  assert.doesNotMatch(html, /עמוד חדש|NEW \/ THE MENTAL EDGE/);
  assert.match(css, /\.navbar\{position:sticky;top:0/);
  assert.match(css, /@media\(max-width:1080px\)/);
  assert.match(css, /\.nav-discipline-mobile\{display:inline-flex\}/);
  assert.match(css, /@media\(max-width:490px\)/);
  assert.match(css, /\.nav-cta \.nav-cta-arrow\{display:inline/);
});
