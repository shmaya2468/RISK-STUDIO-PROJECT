const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const dist = join(__dirname, '../dist');
const html = readFileSync(join(dist, 'discipline.html'), 'utf8');
const styles = readFileSync(join(dist, 'discipline.css'), 'utf8');
const challengeStyles = readFileSync(join(dist, 'discipline-challenge.css'), 'utf8');
const businessStyles = readFileSync(join(dist, 'discipline-business.css'), 'utf8');
const freedomStyles = readFileSync(join(dist, 'discipline-freedom.css'), 'utf8');
const journalStyles = readFileSync(join(dist, 'discipline-journal.css'), 'utf8');
const script = readFileSync(join(dist, 'discipline.js'), 'utf8');

test('discipline is a complete standalone Hebrew RTL page linked from the calculator', () => {
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.match(html, /href="discipline\.css"/);
  assert.match(html, /src="discipline\.js"/);
  assert.match(html, /href="discipline-challenge\.css"/);
  assert.match(home, /href="discipline\.html"/);
  assert.match(html, /href="index\.html#calculator"/);
  assert.match(html, /בשביל להשיג משהו/);
  assert.match(html, /שמעולם לא עשית/);
  assert.match(html, /180 ימים/);
  assert.equal((html.match(/class="mentor-card"/g) || []).length, 6);
  assert.equal((html.match(/data-discipline-check="\d"/g) || []).length, 6);
});

test('educational references and risk qualifications are linked', () => {
  const expected = [
    'jamesclear.com/identity-based-habits',
    'behaviormodel.org/home',
    'news.stanford.edu/stories/2015/04/dweck-kids-potential-042915',
    'echelonfront.com/how-does-discipline-equal-freedom/',
    'traderfeed.blogspot.com/2008/03/formatting-your-trading-journal-for.html',
    'penguinrandomhouse.com/books/350665/trading-in-the-zone-by-mark-douglas/'
  ];
  expected.forEach(url => assert.ok(html.includes(url), `Missing ${url}`));
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 14);
  assert.match(html, /משמעת אינה מבטיחה תשואה/);
  assert.match(html, /אינו מבטיח רווחים/);
});

test('mobile layout and reduced-motion modes are included', () => {
  for (const width of [1250,1000,720,420]) assert.ok(styles.includes(`@media(max-width:${width}px)`));
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /\.future-paths\{grid-template-columns:1fr/);
  assert.match(styles, /\.mentor-grid\{grid-template-columns:1fr/);
  assert.match(styles, /\.daily-layout\{grid-template-columns:1fr/);
  assert.match(challengeStyles, /@media\(max-width:560px\)/);
  assert.match(challengeStyles, /\.calendar-days/);
  assert.match(businessStyles, /@media\(max-width:480px\)/);
  assert.match(freedomStyles, /@media\(max-width:400px\)/);
  assert.match(freedomStyles, /@media\(prefers-reduced-motion:reduce\)/);
});

test('the manifesto uses public-facing language and expands the exact six-month motivational contrast', () => {
  assert.doesNotMatch(html, /בהשראת הפוסטר ששלחת/);
  assert.match(html, /בעוד 6 חודשים מגיע ל־6 ספרות/);
  assert.match(html, /אף פעם לא להיות גרידי וכועס/);
  assert.match(html, /ממשיך לבזבז כסף על מבחנים/);
  assert.match(html, /האגו המטומטם שלך/);
  assert.match(html, /בגלל שאתה חושב שהמסחר חבר שלך/);
  assert.match(html, /תדמיין את עצמך שובר חוקים ב־6 החודשים הבאים\. לא מתקדם לשום מקום\.\.\. נשאר באותו מצב כמו עכשיו\. או אפילו יותר גרוע — ממשיך לבזבז כסף על מבחנים\. כן, וזה מה שאתה עושה: מבזבז כסף\. אתה באמת רוצה את עצמך ככה במשך 6 החודשים הבאים\?/);
  assert.match(html, /משמעת אינה מבטיחה תשואה/);
});

test('trading as a business is an immersive, sourced, accessible new chapter', () => {
  const sources = [
    'traderfeed.blogspot.com/2017/06/a-technique-to-supercharge-your-trading.html',
    'smbtraining.com/blog/this-is-a-detailed-trading-plan',
    'vantharp.com/wp-content/uploads/2018/06/A_Short_Lesson_on_R_and_R-multiple.pdf',
    'elder.com/product-page/the-new-trading-for-a-living'
  ];
  sources.forEach(url => assert.ok(html.includes(url), `Missing ${url}`));
  assert.match(html, /id="trading-business" aria-labelledby="business-title"/);
  assert.match(html, /href="#trading-business">מסחר כעסק/);
  assert.match(html, /href="discipline-business\.css"/);
  assert.equal((html.match(/class="business-rule"/g) || []).length, 4);
  assert.equal((html.match(/class="business-source-grid"/g) || []).length, 1);
  assert.match(businessStyles, /@supports \(animation-timeline:view\(\)\)/);
  assert.match(businessStyles, /prefers-reduced-motion:reduce/);
});

test('the psychology journey moves from identity to boredom and loss, then practice and journal last', () => {
  const anchors = ['id="manifesto"', 'id="freedom"', 'id="next-suitcase"', 'id="trading-business"', 'id="mentors"', 'id="fomo-pause"', 'id="journey-title"', 'id="daily-code"'];
  const locations = anchors.map(anchor => html.indexOf(anchor));
  assert.ok(locations.every(index => index >= 0));
  for (let i = 1; i < locations.length; i++) assert.ok(locations[i] > locations[i - 1], `${anchors[i]} out of order`);
  assert.ok(html.indexOf('class="final-cta') > locations.at(-1));
  assert.match(html, /class="mindset-roadmap content-frame" aria-label="שלבי המסע המנטלי"/);
  assert.match(html, /כיבדתי את חלון המסחר וסגרתי את הגרף בזמן/);
});

test('freedom section addresses screen fatigue, rationalizing entries and evidence-based if-then boundaries', () => {
  assert.match(html, /href="discipline-freedom\.css"/);
  assert.match(html, /למה הפכת לשבוי של המסך/);
  assert.match(html, /אתה סוחר את השעמום שלך/);
  assert.match(html, /המצאת הצדקה/);
  assert.match(html, /תוכנית ״אם–אז״/);
  assert.match(html, /החופש האמיתי הוא לדעת/);
  const sources = [
    'cancercontrol.cancer.gov/brp/research/constructs/implementation-intentions',
    'jamesclear.com/choice-architecture',
    'smbtraining.com/blog/this-is-trading-discipline',
    'traderfeed.blogspot.com/2026/06/emotions-traders-dont-talk-about.html'
  ];
  sources.forEach(url => assert.ok(html.includes(url), `Missing psychology source: ${url}`));
  assert.equal((html.match(/class="freedom-tech-top"/g) || []).length, 3);
  assert.match(freedomStyles, /\.mindset-roadmap/);
  assert.match(freedomStyles, /\.boredom-chain/);
});

test('journal has inline edit and save, per-day selection details, and responsive styling', () => {
  assert.match(html, /id="journal-rows"/);
  assert.match(html, /id="history-edit"/);
  assert.match(html, /id="history-checks"/);
  assert.match(html, /href="discipline-journal\.css"/);
  assert.match(journalStyles, /\.journal-row\.is-editing/);
  assert.match(journalStyles, /@media\(max-width:700px\)/);
});

function harness({ memory = new Map(), startAt = '2026-10-18T12:00:00Z', confirms = true, failWrites = false } = {}) {
  const elements = new Map();
  const make = id => ({
    id, checked: false, hidden: false, disabled: false, textContent: '', innerHTML: '', value: '',
    style: { width: '' }, attributes: {}, handlers: {},
    classes: new Set(),
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(type, callback) { this.handlers[type] = callback; },
    emit(type, event = {}) { assert.equal(typeof this.handlers[type], 'function'); return this.handlers[type](event); }
  });
  const get = id => {
    if (!elements.has(id)) elements.set(id, make(id));
    return elements.get(id);
  };
  const checks = Array.from({ length: 6 }, (_, i) => get('check-' + i));
  const milestones = [7, 30, 60, 90, 180].map(value => {
    const e = get('milestone-' + value);
    e.attributes['data-milestone'] = String(value);
    return e;
  });
  const intervals = new Map();
  let intervalId = 0, now = 0, copied = null, exported = null, downloaded = null, dateMs = Date.parse(startAt);
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [dateMs])); }
    static now() { return dateMs; }
  }
  const ctx = {
    document: {
      getElementById: get,
      querySelectorAll: selector => selector === '[data-milestone]' ? milestones : checks,
      body: { appendChild() {} },
      createElement: () => ({ href: '', download: '', click() { downloaded = this.download; }, remove() {} })
    },
    localStorage: { getItem: key => memory.get(key) || null, setItem: (key, v) => { if (failWrites) throw Error('storage unavailable'); memory.set(key, v); } },
    navigator: { clipboard: { writeText: value => { copied = value; return Promise.resolve(); } } },
    window: { confirm: () => confirms },
    Blob,
    URL: { createObjectURL: blob => { exported = blob; return 'blob:local-test'; }, revokeObjectURL() {} },
    Intl, Date: ClockDate, JSON, Array, String, Math,
    performance: { now: () => now },
    setInterval: callback => { const id = ++intervalId; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  vm.runInNewContext(script, ctx);
  return { get, checks, milestones, intervals, memory, setDate: value => { dateMs = Date.parse(value); }, advanceTimer: ms => { now += ms; }, copied: () => copied, exported: () => exported, downloaded: () => downloaded, tick: () => [...intervals.values()].forEach(fn => fn()) };
}

function editRow(demo, date, { values = [true, false, true, false, false, true], rest = false, note = '' } = {}) {
  const row = {
    getAttribute: () => date,
    querySelector: selector => selector === '[data-journal-rest]' ? { checked: rest } : { value: note },
    querySelectorAll: () => values.map(checked => ({ checked }))
  };
  const target = { closest: selector => selector === '[data-journal-action]' ? {
    closest: () => row,
    getAttribute: () => 'save'
  } : null };
  demo.get('journal-rows').emit('click', { target });
}

test('editing a day saves its checkmarks, rest status and note inline, and survives reopening', () => {
  const demo = harness();
  demo.get('history-edit').emit('click');
  assert.match(demo.get('journal-rows').innerHTML, /data-journal-action="save"/);
  editRow(demo, '2026-10-18', { note: 'חיכיתי לסט־אפ שלי והפסקתי בזמן.' });
  const saved = JSON.parse(demo.memory.get('risk-studio-discipline-challenge-v2'));
  assert.deepEqual(saved.days['2026-10-18'].checks, [true, false, true, false, false, true]);
  assert.equal(saved.days['2026-10-18'].note, 'חיכיתי לסט־אפ שלי והפסקתי בזמן.');
  assert.match(demo.get('journal-rows').innerHTML, /חיכיתי לסט־אפ שלי/);
  assert.match(demo.get('journal-rows').innerHTML, /data-journal-action="edit"/);
  assert.equal(demo.get('history-checks').innerHTML.includes('✓ חלון מסחר'), true);
  const reopened = harness({ memory: demo.memory });
  assert.match(reopened.get('journal-rows').innerHTML, /חיכיתי לסט־אפ שלי/);
  assert.equal(reopened.get('daily-note').value, 'חיכיתי לסט־אפ שלי והפסקתי בזמן.');
  assert.equal(reopened.get('daily-completed').textContent, '3');
});

test('older-day corrections do not overwrite other days, and journal escapes user-provided HTML', () => {
  const demo = harness();
  demo.get('daily-note').value = 'היום הזה נשמר בנפרד.';
  demo.get('daily-note').emit('input');
  demo.setDate('2026-10-19T12:00:00Z');
  demo.tick();
  demo.get('history-edit').emit('click'); // Opens the currently selected day.
  editRow(demo, '2026-10-19', { rest: true, note: '<img src=x onerror=alert(1)>' });
  assert.match(demo.get('journal-rows').innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(demo.get('journal-rows').innerHTML, /<img/);
  demo.get('calendar-days').emit('click', { target: { closest: () => ({ disabled: false, getAttribute: () => '2026-10-18' }) } });
  demo.get('history-edit').emit('click');
  editRow(demo, '2026-10-18', { note: 'עדכנתי את אתמול.' });
  const days = JSON.parse(demo.memory.get('risk-studio-discipline-challenge-v2')).days;
  assert.equal(days['2026-10-18'].note, 'עדכנתי את אתמול.');
  assert.equal(days['2026-10-19'].rest, true);
  assert.equal(days['2026-10-19'].note, '<img src=x onerror=alert(1)>');
  assert.equal(demo.get('challenge-wins').textContent, '1');
});

test('daily checklist persists locally, resets, and 90-second pause completes', async () => {
  const { get, checks, memory, intervals, advanceTimer, copied, tick } = harness();
  assert.equal(get('daily-completed').textContent, '0');
  checks[0].checked = true;
  checks[0].emit('change');
  assert.equal(get('daily-completed').textContent, '1');
  assert.equal(get('daily-progress-track').attributes['aria-valuenow'], '1');
  const saved = JSON.parse(memory.get('risk-studio-discipline-challenge-v2'));
  assert.equal(saved.days['2026-10-18'].checks[0], true);
  assert.equal(saved.startedAt, '2026-10-18');
  get('daily-reset').emit('click');
  assert.equal(get('daily-completed').textContent, '0');
  assert.ok(checks.every(box => box.checked === false));
  get('pause-start').emit('click');
  assert.equal(get('pause-start').disabled, true);
  assert.equal(get('pause-timer').textContent, '01:30');
  advanceTimer(90000);
  tick();
  assert.equal(get('pause-start').disabled, false);
  assert.equal(get('pause-timer').textContent, '00:00');
  get('copy-manifesto').emit('click');
  await Promise.resolve();
  assert.match(copied(), /בשביל להשיג משהו שמעולם לא היה לך/);
});

test('180-day progress automatically advances while keeping past days, notes and separate browser data', () => {
  const one = harness();
  one.checks.forEach(check => { check.checked = true; check.emit('change'); });
  one.get('daily-note').value = 'לא רדפתי אחרי הפסד.';
  one.get('daily-note').emit('input');
  assert.equal(one.get('challenge-wins').textContent, '1');
  assert.equal(one.get('challenge-streak').textContent, '1');
  one.setDate('2026-10-19T12:00:00Z');
  one.tick();
  assert.equal(one.get('daily-completed').textContent, '0');
  assert.equal(one.get('challenge-day').innerHTML.includes('002'), true);
  assert.equal(one.get('challenge-wins').textContent, '1');
  one.get('rest-day').checked = true;
  one.get('rest-day').emit('change');
  assert.equal(one.get('challenge-wins').textContent, '2');
  assert.equal(one.get('challenge-streak').textContent, '2');
  assert.equal(one.get('daily-completed').textContent, '✓');
  assert.ok(one.checks.every(box => box.disabled));
  one.get('calendar-days').emit('click', { target: { closest: () => ({ disabled: false, getAttribute: () => '2026-10-18' }) } });
  assert.match(one.get('history-note').textContent, /לא רדפתי/);
  const restored = harness({ memory: one.memory, startAt: '2026-10-19T12:00:00Z' });
  assert.equal(restored.get('challenge-wins').textContent, '2');
  assert.equal(restored.get('rest-day').checked, true);
  assert.equal(restored.get('challenge-streak').textContent, '2');
  const otherBrowser = harness({ startAt: '2026-10-19T12:00:00Z' });
  assert.equal(otherBrowser.get('challenge-wins').textContent, '0');
});

test('a week of archived disciplined days unlocks the 7-day badge and migrates old checklist', () => {
  const memory = new Map();
  const days = {};
  for (let day = 1; day <= 7; day++) days[`2026-10-${String(day).padStart(2, '0')}`] = { checks: [true, true, true, true, true, true], rest: false, note: '' };
  memory.set('risk-studio-discipline-challenge-v2', JSON.stringify({ version: 2, startedAt: '2026-10-01', days }));
  const testWeek = harness({ memory, startAt: '2026-10-08T12:00:00Z' });
  assert.equal(testWeek.get('challenge-wins').textContent, '7');
  assert.equal(testWeek.get('challenge-streak').textContent, '7');
  assert.equal(testWeek.get('challenge-rate').textContent, '100%');
  assert.match(testWeek.get('milestone-7').attributes['aria-label'], /הושג/);
  const legacy = new Map([['risk-studio-discipline-checklist-v1', JSON.stringify({ date: '2026-10-18', values: [true, false, false, false, false, false] })]]);
  const migrated = harness({ memory: legacy });
  assert.equal(migrated.get('daily-completed').textContent, '1');
  assert.equal(JSON.parse(legacy.get('risk-studio-discipline-challenge-v2')).days['2026-10-18'].checks[0], true);
});

test('manual backup exports personal history and import restores validated per-day records', async () => {
  const demo = harness();
  demo.checks[0].checked = true;
  demo.checks[0].emit('change');
  demo.get('daily-note').value = 'למדתי לחכות לסשן הבא.';
  demo.get('daily-note').emit('input');
  demo.get('challenge-export').emit('click');
  const contents = await demo.exported().text();
  assert.match(contents, /למדתי לחכות/);
  assert.match(contents, /"version": 2/);
  assert.equal(demo.downloaded(), 'risk-studio-180-2026-10-18.json');

  const fresh = harness();
  fresh.get('challenge-file').files = [{ size: contents.length, text: async () => contents }];
  await fresh.get('challenge-file').emit('change');
  assert.equal(fresh.get('daily-completed').textContent, '1');
  assert.equal(fresh.get('daily-note').value, 'למדתי לחכות לסשן הבא.');
  const before = fresh.memory.get('risk-studio-discipline-challenge-v2');
  fresh.get('challenge-file').files = [{ size: 30, text: async () => '{"version":2,"startedAt":"2028-01-01","days":{}}' }];
  await fresh.get('challenge-file').emit('change');
  assert.equal(fresh.memory.get('risk-studio-discipline-challenge-v2'), before);
});

test('backup import rejects malformed, oversized and structurally invalid files without changing existing data', async () => {
  const demo = harness();
  demo.get('daily-note').value = 'המידע החשוב שלי';
  demo.get('daily-note').emit('input');
  const before = demo.memory.get('risk-studio-discipline-challenge-v2');
  const invalidFiles = [
    { size: 2 * 1024 * 1024 + 1, text: async () => '{ }' },
    { size: 4, text: async () => '{ ]' },
    { size: 200, text: async () => JSON.stringify({ version: 2, startedAt: '2026-10-18', days: { '2026-10-18': { checks: [true], rest: false, note: 'broken' } } }) },
    { size: 200, text: async () => JSON.stringify({ version: 2, startedAt: '2026-10-18', days: { '2026-10-19': { checks: [false, false, false, false, false, false], rest: false, note: 'future' } } }) },
    { size: 200, text: async () => JSON.stringify({ version: 2, startedAt: '2026-10-18', days: { '2026-10-18': { checks: [false, false, false, false, false, 'yes'], rest: false, note: 'invalid' } } }) }
  ];
  for (const file of invalidFiles) {
    demo.get('challenge-file').files = [file];
    await demo.get('challenge-file').emit('change');
    assert.equal(demo.memory.get('risk-studio-discipline-challenge-v2'), before);
    assert.equal(demo.get('daily-note').value, 'המידע החשוב שלי');
  }
});

test('canceling restoration or a storage failure never discards the existing journal', async () => {
  const old = JSON.stringify({ version: 2, startedAt: '2026-10-18', days: { '2026-10-18': { checks: [false, false, false, false, false, false], rest: false, note: 'ישן' } } });
  const replacement = JSON.stringify({ version: 2, startedAt: '2026-10-18', days: { '2026-10-18': { checks: [true, true, true, true, true, true], rest: false, note: 'חדש' } } });
  const declined = harness({ memory: new Map([['risk-studio-discipline-challenge-v2', old]]), confirms: false });
  declined.get('challenge-file').files = [{ size: replacement.length, text: async () => replacement }];
  await declined.get('challenge-file').emit('change');
  assert.equal(declined.memory.get('risk-studio-discipline-challenge-v2'), old);
  assert.equal(declined.get('daily-note').value, 'ישן');

  const unavailable = harness({ memory: new Map([['risk-studio-discipline-challenge-v2', old]]), failWrites: true });
  unavailable.get('challenge-file').files = [{ size: replacement.length, text: async () => replacement }];
  await unavailable.get('challenge-file').emit('change');
  assert.equal(unavailable.memory.get('risk-studio-discipline-challenge-v2'), old);
  assert.equal(unavailable.get('daily-note').value, 'ישן');
  assert.match(unavailable.get('journal-save-state').textContent, /השמירה אינה זמינה/);
  unavailable.get('history-edit').emit('click');
  editRow(unavailable, '2026-10-18', { note: 'עריכה ללא אחסון' });
  assert.equal(unavailable.memory.get('risk-studio-discipline-challenge-v2'), old);
});

test('journal can create a past-day entry from calendar and backup reproduces it on another device', async () => {
  const first = harness();
  first.setDate('2026-10-19T12:00:00Z');
  first.tick();
  first.get('calendar-days').emit('click', { target: { closest: () => ({ disabled: false, getAttribute: () => '2026-10-18' }) } });
  first.get('history-edit').emit('click');
  assert.match(first.get('journal-rows').innerHTML, /data-journal-row="2026-10-18"/);
  editRow(first, '2026-10-18', { rest: true, note: 'יום ללא טרייד מתוך בחירה.' });
  first.get('challenge-export').emit('click');
  const backup = await first.exported().text();
  const otherDevice = harness({ startAt: '2026-10-19T12:00:00Z' });
  otherDevice.get('challenge-file').files = [{ size: backup.length, text: async () => backup }];
  await otherDevice.get('challenge-file').emit('change');
  assert.match(otherDevice.get('journal-rows').innerHTML, /יום ללא טרייד מתוך בחירה/);
  const imported = JSON.parse(otherDevice.memory.get('risk-studio-discipline-challenge-v2'));
  assert.equal(imported.days['2026-10-18'].rest, true);
  assert.equal(imported.days['2026-10-18'].note, 'יום ללא טרייד מתוך בחירה.');
});
