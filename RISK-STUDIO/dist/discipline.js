(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const checks = Array.from(document.querySelectorAll('[data-discipline-check]'));
  const storageKey = 'risk-studio-discipline-challenge-v2';
  const legacyKey = 'risk-studio-discipline-checklist-v1';
  const calendarKey = (d = new Date()) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const validKey = key => typeof key === 'string' && /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(key) && calendarKey(new Date(`${key}T12:00:00`)) === key;
  const dateNumber = key => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 86400000;
  const calendarOffset = (key, offset) => {
    const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10) + offset));
    return [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-');
  };
  const formatDate = key => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${key}T12:00:00`));
  let activeDay = calendarKey();
  let toastTimeout;
  let selectedHistoryDay = activeDay;
  let shownMonth = activeDay.slice(0, 7);
  let editingDay = null;
  let visibleJournalRows = 14;
  const checkNames = ['חלון מסחר', 'סט־אפ תקף', 'סיכון וסטופ', 'גבולות יומיים', 'כיבוד היציאה', 'לקח למחר'];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  const emptyChecks = () => Array(checks.length).fill(false);
  const cleanDay = input => ({
    checks: checks.map((_, i) => input && Array.isArray(input.checks) && input.checks[i] === true),
    rest: Boolean(input && input.rest === true),
    note: input && typeof input.note === 'string' ? input.note.slice(0, 500) : ''
  });
  function cleanChallenge(input, today = calendarKey()) {
    if (!input || input.version !== 2 || !validKey(input.startedAt) || input.startedAt > today || !input.days || typeof input.days !== 'object' || Array.isArray(input.days)) return null;
    const entries = Object.entries(input.days);
    if (entries.length > 3660) return null;
    const days = Object.create(null);
    entries.forEach(([key, value]) => { if (validKey(key) && key >= input.startedAt && key <= today) days[key] = cleanDay(value); });
    return { version: 2, startedAt: input.startedAt, days };
  }
  // Backups must be all-or-nothing: never silently discard invalid or future records.
  function validBackup(input) {
    const cleaned = cleanChallenge(input);
    if (!cleaned) return null;
    const entries = Object.entries(input.days);
    if (!entries.every(([key, day]) => validKey(key) && key >= input.startedAt && key <= activeDay &&
      day && typeof day === 'object' && !Array.isArray(day) &&
      Array.isArray(day.checks) && day.checks.length === checks.length && day.checks.every(v => typeof v === 'boolean') &&
      typeof day.rest === 'boolean' && typeof day.note === 'string' && day.note.length <= 500)) return null;
    return cleaned;
  }
  function initialChallenge() {
    try {
      const saved = cleanChallenge(JSON.parse(localStorage.getItem(storageKey) || 'null'));
      if (saved) return saved;
      const old = JSON.parse(localStorage.getItem(legacyKey) || 'null');
      const start = old && validKey(old.date) && old.date <= activeDay ? old.date : activeDay;
      const model = { version: 2, startedAt: start, days: Object.create(null) };
      if (old && old.date === start && Array.isArray(old.values)) model.days[start] = cleanDay({ checks: old.values });
      return model;
    } catch (_) { return { version: 2, startedAt: activeDay, days: Object.create(null) }; }
  }
  let challenge = initialChallenge();
  const hasActivity = day => day && (day.rest || day.checks.some(Boolean) || Boolean(day.note.trim()));
  const isSuccess = day => Boolean(day && (day.rest || day.checks.every(Boolean)));
  const dayState = day => !day || !hasActivity(day) ? 'missed' : day.rest ? 'rest' : isSuccess(day) ? 'full' : 'partial';

  const missions = [
    'לפני הכניסה, כתוב במשפט אחד למה הסט־אפ שלך תקף. אם אין תשובה ברורה — אין כניסה.',
    'אם אתה מרגיש FOMO, נתק את היד מהעכבר ל־90 שניות ובדוק מחדש את התוכנית.',
    'החלט מראש מה יגרום לך לסגור את הגרף. הכין את עצמך גם ליום ללא עסקאות.',
    'אחרי כל סטופ, קום לשתי דקות. אל תיתן לעסקה הבאה להיות תגובה לכאב של הקודמת.',
    'בסוף הסשן, רשום החלטה טובה אחת גם אם היום הסתיים בהפסד.',
    'דמיין שהסטופ נפגע במלואו. אם אינך מוכן לכך — הקטן סיכון או ותר על העסקה.',
    'עשר דקות של שקט לפני הסשן: כתוב את שלושת החוקים שלא תפר היום.',
    'כשאתה משתעמם, הזכר לעצמך: המתנה היא חלק מתפקידו של סוחר מקצועי.',
    'בדוק את כל התנאים לפני לחיצה. לא מתקנים תוכנית תוך כדי תנועה.',
    'אם אתה רוצה להחזיר הפסד, זכור את המזוודה — מחר אפשר לפעול מחדש בראש צלול.',
    'החלט היום למדוד את עצמך לפי איכות הביצוע, לא לפי ה־P&L.',
    'תרגל אמירת ״לא״ לסט־אפ כמעט מתאים. כמעט אינו כלל.',
    'לפני כל כניסה, בדוק מחדש את גודל החוזה, הסטופ וההפסד המקסימלי.',
    'בזמן רווח או הפסד גדול, השהה כל החלטה חדשה עד שהנשימה רגועה.',
    'כתוב מה עורר בך דחף לסחור. זיהוי הטריגר הוא תחילת השינוי.',
    'אתגר היום: לסיים את הסשן בדיוק בזמן שהגדרת, בלי לנסות להוציא ממנו עוד עסקה.',
    'אם היו אפס הזדמנויות אמיתיות, הגדר את היום כהצלחה של המתנה.',
    'בחר רגע אחד שבו רצית לזוז מהתוכנית — והוכח לעצמך שאתה מסוגל להישאר.',
    'סכם לקח אחד וקבע פעולה קטנה שתוכל לבדוק מחר בפועל.',
    'היום זכור: אינך צריך לתקן את אתמול. אתה צריך לקבל החלטה נכונה אחת עכשיו.'
  ];

  function notify(message) {
    const el = $('discipline-toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('show'), 2900);
  }

  function persist(model = challenge) {
    try { localStorage.setItem(storageKey, JSON.stringify(model)); $('journal-save-state').textContent = '● נשמר במכשיר'; return true; }
    catch (_) { $('journal-save-state').textContent = '⚠ השמירה אינה זמינה'; notify('שמירה מקומית לא זמינה. הורד גיבוי כדי לשמור את ההתקדמות.'); return false; }
  }
  function dayFromUI() {
    return cleanDay({ checks: checks.map(box => box.checked), rest: $('rest-day').checked, note: $('daily-note').value || '' });
  }
  function saveDay() {
    challenge.days[activeDay] = dayFromUI();
    persist();
  }
  function loadDay() {
    const saved = challenge.days[activeDay] || cleanDay({ checks: emptyChecks() });
    checks.forEach((box, i) => { box.checked = saved.checks[i]; box.disabled = saved.rest; });
    $('rest-day').checked = saved.rest;
    $('daily-note').value = saved.note;
    $('checklist-items').classList.toggle('resting', saved.rest);
  }
  function renderStats() {
    const elapsed = Math.max(1, dateNumber(activeDay) - dateNumber(challenge.startedAt) + 1);
    const dayNumber = Math.min(180, elapsed);
    const records = Object.entries(challenge.days).filter(([key, day]) => key >= challenge.startedAt && key <= activeDay && hasActivity(day));
    const wins = records.filter(([, day]) => isSuccess(day)).length;
    let streak = 0;
    let dayCursor = isSuccess(challenge.days[activeDay]) ? activeDay : calendarOffset(activeDay, -1);
    while (dayCursor >= challenge.startedAt && isSuccess(challenge.days[dayCursor])) {
      streak++;
      dayCursor = calendarOffset(dayCursor, -1);
    }
    $('challenge-day').innerHTML = `DAY ${String(dayNumber).padStart(3, '0')} <small>/ 180</small>`;
    $('challenge-wins').textContent = String(wins);
    $('challenge-streak').textContent = String(streak);
    $('challenge-rate').textContent = records.length ? `${Math.round(wins / records.length * 100)}%` : '0%';
    $('challenge-track-fill').style.width = `${Math.min(100, elapsed / 180 * 100)}%`;
    const phase = dayNumber <= 30 ? 'שלב 1 / גבולות ברורים' : dayNumber <= 60 ? 'שלב 2 / אימון בהמתנה' : dayNumber <= 90 ? 'שלב 3 / תגובה חדשה להפסד' : 'שלב 4 / בניית עקביות';
    $('challenge-phase').textContent = dayNumber === 180 && elapsed > 180 ? '180 ימים מאחוריך. ההרגלים ממשיכים.' : phase;
    $('daily-mission-index').textContent = `${String(dayNumber).padStart(3, '0')} / 180`;
    $('daily-mission-text').textContent = missions[(dayNumber - 1) % missions.length];
    document.querySelectorAll('[data-milestone]').forEach(el => {
      const threshold = Number(el.getAttribute('data-milestone'));
      el.classList.toggle('unlocked', wins >= threshold);
      el.setAttribute('aria-label', `${threshold} ימי משמעת: ${wins >= threshold ? 'הושג' : 'עדיין לא הושג'}`);
    });
  }
  function renderHistory(key = selectedHistoryDay) {
    const day = challenge.days[key];
    const state = dayState(day);
    $('history-date').textContent = formatDate(key);
    const scores = day ? day.checks.filter(Boolean).length : 0;
    $('history-summary').textContent = key > activeDay ? 'התאריך הזה עדיין לא הגיע.' : state === 'rest' ? 'יום מנוחה מתוכנן / בלי עסקה. גם לא לסחור יכול להיות החלטה נכונה.' : state === 'full' ? 'כל ששת כללי המשמעת סומנו. יום משמעת מלא.' : state === 'partial' ? `סומנו ${scores} מתוך 6 כללים. זהו תיעוד חלקי, ואפשר ללמוד גם ממנו.` : 'אין דיווח ליום הזה. מחר אפשר לבחור מחדש.';
    $('history-note').textContent = day && day.note ? day.note : '';
    $('history-note').hidden = !(day && day.note);
    $('history-checks').innerHTML = day && day.rest
      ? '<span class="history-check-chip done">✓ מנוחה מתוכננת — ללא עסקאות</span>'
      : checkNames.map((name, i) => `<span class="history-check-chip ${day && day.checks[i] ? 'done' : ''}">${day && day.checks[i] ? '✓' : '—'} ${name}</span>`).join('');
  }
  function journalEntries() {
    const recorded = Object.entries(challenge.days);
    if (editingDay && !Object.hasOwn(challenge.days, editingDay)) recorded.push([editingDay, cleanDay(null)]);
    return recorded
      .filter(([key, day]) => (key >= challenge.startedAt && key <= activeDay && hasActivity(day)) || key === editingDay)
      .sort(([a], [b]) => b.localeCompare(a));
  }
  function renderJournal() {
    const entries = journalEntries();
    $('journal-rows').innerHTML = entries.slice(0, visibleJournalRows).map(([key, day]) => {
      const state = dayState(day);
      const rest = Boolean(day && day.rest);
      const count = day ? day.checks.filter(Boolean).length : 0;
      const label = state === 'rest' ? 'יום מנוחה' : state === 'full' ? 'משמעת מלאה' : `${count}/6 כללים`;
      const heading = `<div class="journal-row-title"><time datetime="${key}">${escapeHtml(formatDate(key))}</time><span class="journal-status ${state}">${label}</span></div>`;
      if (editingDay === key) {
        return `<article class="journal-row is-editing" data-journal-row="${key}">${heading}<div class="journal-editor"><label class="journal-rest-choice"><input type="checkbox" data-journal-rest ${rest ? 'checked' : ''}/> לא סחרתי — יום מנוחה מתוכנן</label><div class="journal-editor-checks">${checkNames.map((name, i) => `<label><input type="checkbox" data-journal-check="${i}" ${day && day.checks[i] ? 'checked' : ''} ${rest ? 'disabled' : ''}/><span>${name}</span></label>`).join('')}</div><label class="journal-editor-note">הלקח והתובנה שלי<textarea data-journal-note maxlength="500" rows="3" placeholder="מה למדתי מהיום?">${escapeHtml(day ? day.note : '')}</textarea></label><div class="journal-row-actions"><button type="button" data-journal-action="save" class="journal-save">✓ שמור שינויים</button><button type="button" data-journal-action="cancel" class="journal-cancel">ביטול</button></div></div></article>`;
      }
      return `<article class="journal-row" data-journal-row="${key}"><div class="journal-view-head">${heading}<button type="button" data-journal-action="edit" aria-label="עריכת יומן ${key}">✎ עריכה</button></div><div class="journal-row-checks">${rest ? '<span class="journal-chip done">✓ יום מנוחה מתוכנן</span>' : checkNames.map((name, i) => `<span class="journal-chip ${day.checks[i] ? 'done' : ''}">${day.checks[i] ? '✓' : '—'} ${name}</span>`).join('')}</div><p class="journal-row-note">${day && day.note ? escapeHtml(day.note) : '<span class="journal-empty-note">לא נכתבה תובנה ליום הזה.</span>'}</p></article>`;
    }).join('') || '<div class="journal-empty">היומן שלך מתחיל בצעד אחד. סמן כלל או כתוב לקח בטופס של היום, והוא יופיע כאן.</div>';
    $('journal-more').hidden = entries.length <= visibleJournalRows;
  }
  function beginJournalEdit(key) {
    if (!validKey(key) || key < challenge.startedAt || key > activeDay) return;
    editingDay = key;
    const position = journalEntries().findIndex(([day]) => day === key);
    visibleJournalRows = Math.max(visibleJournalRows, position + 1);
    renderJournal();
  }
  function renderCalendar() {
    const [year, month] = shownMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = Array(first.getDay()).fill('<span class="calendar-blank" aria-hidden="true"></span>');
    for (let i = 1; i <= daysInMonth; i++) {
      const key = `${shownMonth}-${String(i).padStart(2, '0')}`;
      const available = key >= challenge.startedAt && key <= activeDay;
      const state = available ? dayState(challenge.days[key]) : '';
      const label = available ? `${formatDate(key)} — ${state === 'full' ? 'משמעת מלאה' : state === 'rest' ? 'מנוחה מתוכננת' : state === 'partial' ? 'דיווח חלקי' : 'לא דווח'}` : formatDate(key);
      cells.push(`<button type="button" data-calendar-day="${key}" aria-label="${label}" class="${state} ${key === activeDay ? 'today' : ''} ${key === selectedHistoryDay ? 'active' : ''}" ${available ? '' : 'disabled'}>${i}${available && state !== 'missed' ? '<i aria-hidden="true"></i>' : ''}</button>`);
    }
    $('calendar-days').innerHTML = cells.join('');
    $('calendar-month').textContent = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(first);
    $('calendar-prev').disabled = shownMonth <= challenge.startedAt.slice(0, 7);
    $('calendar-next').disabled = shownMonth >= activeDay.slice(0, 7);
    renderHistory();
  }
  function renderDay() {
    const rest = $('rest-day').checked;
    const completed = checks.filter(box => box.checked).length;
    $('daily-completed').textContent = rest ? '✓' : String(completed);
    $('daily-total-label').textContent = rest ? 'מנוחה' : '/ 6';
    $('daily-progress-fill').style.width = (rest ? 100 : completed / checks.length * 100).toFixed(2) + '%';
    $('daily-progress-track').setAttribute('aria-valuenow', String(rest ? checks.length : completed));
    $('daily-date').textContent = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${activeDay}T12:00:00`));
    $('daily-message').textContent = rest ? 'לא סחרת כי זו הייתה התוכנית. זו משמעת.' : completed === checks.length ? 'היום כיבדת את כל ששת הכללים. זה הניצחון האמיתי שלך.' : completed === 0 ? 'כל סימון הוא הוכחה לפעולה חדשה.' : `${completed} מתוך ${checks.length} כללים. המשך לבנות את ההרגל.`;
    renderStats();
    renderCalendar();
    renderJournal();
  }

  function resetOnNewDate() {
    if (activeDay === calendarKey()) return;
    activeDay = calendarKey();
    selectedHistoryDay = activeDay;
    shownMonth = activeDay.slice(0, 7);
    loadDay();
    renderDay();
  }

  loadDay();
  // Save the challenge start date without creating an artificial completed day.
  persist();
  checks.forEach((box, index) => {
    box.addEventListener('change', () => { resetOnNewDate(); saveDay(); renderDay(); });
  });
  renderDay();
  $('daily-reset').addEventListener('click', () => {
    checks.forEach(box => { box.checked = false; });
    $('rest-day').checked = false;
    checks.forEach(box => { box.disabled = false; });
    $('checklist-items').classList.remove('resting');
    $('daily-note').value = '';
    saveDay(); renderDay(); notify('הסימונים להיום אופסו. אפשר להתחיל מחדש.');
  });
  $('rest-day').addEventListener('change', () => {
    resetOnNewDate();
    checks.forEach(box => { box.disabled = $('rest-day').checked; });
    $('checklist-items').classList.toggle('resting', $('rest-day').checked);
    saveDay(); renderDay();
  });
  $('daily-note').addEventListener('input', () => { resetOnNewDate(); saveDay(); renderDay(); });
  $('calendar-days').addEventListener('click', event => {
    const button = event.target.closest('[data-calendar-day]');
    if (!button || button.disabled) return;
    selectedHistoryDay = button.getAttribute('data-calendar-day');
    renderCalendar();
  });
  $('history-edit').addEventListener('click', () => beginJournalEdit(selectedHistoryDay));
  $('journal-more').addEventListener('click', () => { visibleJournalRows += 14; renderJournal(); });
  $('journal-rows').addEventListener('change', event => {
    if (!event.target.matches || !event.target.matches('[data-journal-rest]')) return;
    const row = event.target.closest('[data-journal-row]');
    if (!row) return;
    row.querySelectorAll('[data-journal-check]').forEach(box => { box.disabled = event.target.checked; });
  });
  $('journal-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-journal-action]');
    if (!button) return;
    const row = button.closest('[data-journal-row]');
    if (!row) return;
    const key = row.getAttribute('data-journal-row');
    const action = button.getAttribute('data-journal-action');
    if (action === 'edit') { beginJournalEdit(key); return; }
    if (action === 'cancel') { editingDay = null; renderJournal(); return; }
    if (action !== 'save' || editingDay !== key) return;
    const rest = row.querySelector('[data-journal-rest]').checked;
    const note = row.querySelector('[data-journal-note]').value.slice(0, 500);
    const chosen = Array.from(row.querySelectorAll('[data-journal-check]')).map(box => !rest && box.checked);
    if (chosen.length !== checks.length) { notify('לא הצלחנו לקרוא את כל הבחירות. נסה שוב.'); return; }
    const nextDay = cleanDay({ checks: chosen, rest, note });
    const nextChallenge = { ...challenge, days: { ...challenge.days, [key]: nextDay } };
    if (!persist(nextChallenge)) return;
    challenge = nextChallenge;
    editingDay = null;
    selectedHistoryDay = key;
    if (key === activeDay) loadDay();
    renderDay();
    notify('היום עודכן ונשמר ביומן, כולל כל הבחירות והתובנה.');
  });
  function moveCalendar(amount) {
    const [year, month] = shownMonth.split('-').map(Number);
    shownMonth = calendarKey(new Date(year, month - 1 + amount, 1)).slice(0, 7);
    renderCalendar();
  }
  $('calendar-prev').addEventListener('click', () => { if (!$('calendar-prev').disabled) moveCalendar(-1); });
  $('calendar-next').addEventListener('click', () => { if (!$('calendar-next').disabled) moveCalendar(1); });
  $('challenge-export').addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify(challenge, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `risk-studio-180-${calendarKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      notify('קובץ הגיבוי הוכן להורדה. שמור אותו במקום בטוח.');
    } catch (_) { notify('לא ניתן להוריד גיבוי בדפדפן הזה. נסה דפדפן אחר.'); }
  });
  $('challenge-import').addEventListener('click', () => $('challenge-file').click());
  $('challenge-file').addEventListener('change', async () => {
    const input = $('challenge-file');
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { notify('קובץ הגיבוי גדול מדי.'); return; }
    try {
      const imported = validBackup(JSON.parse(await file.text()));
      if (!imported) { notify('הקובץ אינו גיבוי תקין של אתגר 180 הימים.'); return; }
      if (typeof window !== 'undefined' && !window.confirm('הגיבוי יחליף את נתוני האתגר השמורים בדפדפן הזה. להמשיך?')) return;
      if (!persist(imported)) { notify('השחזור לא נשמר במכשיר. הנתונים הקיימים נשארו ללא שינוי.'); return; }
      challenge = imported;
      editingDay = null;
      visibleJournalRows = 14;
      selectedHistoryDay = activeDay;
      shownMonth = activeDay.slice(0, 7);
      loadDay();
      renderDay();
      notify('הגיבוי נטען. כל הימים והלקחים שוחזרו.');
    } catch (_) { notify('לא ניתן לקרוא את קובץ הגיבוי.'); }
  });
  // Keep a long-open tab on the correct local calendar day.
  setInterval(resetOnNewDate, 60000);

  const pauseStart = $('pause-start');
  const pauseReset = $('pause-reset');
  const pauseTimer = $('pause-timer');
  const pauseStatus = $('pause-status');
  let interval = null;
  let deadline = 0;
  const displayTime = seconds => {
    const value = Math.max(0, seconds);
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  };

  function stopTimer() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  function tick() {
    const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    pauseTimer.textContent = displayTime(remaining);
    if (remaining > 0) return;
    stopTimer();
    pauseStart.disabled = false;
    pauseStart.textContent = 'עצור שוב בעת הצורך';
    pauseStatus.textContent = 'סיימת 90 שניות. עכשיו תחליט רק לפי הכללים שלך — ואם אין סט־אפ, אין חובה להיכנס.';
    notify('העצירה הסתיימה. תן לתוכנית להחליט.');
  }

  pauseStart.addEventListener('click', () => {
    stopTimer();
    deadline = performance.now() + 90000;
    pauseStart.disabled = true;
    pauseReset.hidden = false;
    pauseTimer.textContent = '01:30';
    pauseStatus.textContent = '90 שניות בלי פקודות. שחרר את העכבר, נשום ושאל את שלוש השאלות.';
    interval = setInterval(tick, 250);
  });

  pauseReset.addEventListener('click', () => {
    stopTimer();
    deadline = 0;
    pauseStart.disabled = false;
    pauseStart.textContent = 'הפעל עצירת FOMO';
    pauseReset.hidden = true;
    pauseTimer.textContent = '01:30';
    pauseStatus.textContent = 'עצור, נשום, קח את היד מהעכבר. שאל אם העסקה באמת בתוכנית.';
  });

  $('copy-manifesto').addEventListener('click', () => {
    const message = [
      'RISK STUDIO — מניפסט 180 הימים',
      'תדמיין את עצמך בעוד 6 חודשים מגיע ל־6 ספרות בחשבון הבנק שלך. תדמיין איך החלום שלך במסחר הופך למציאות. זה חלום, לא הבטחה.',
      'סבלנות ברמה הכי גבוהה שיש לחכות לסטאפ שלך. אף פעם לא להיות גרידי וכועס.',
      'תדמיין את עצמך שובר חוקים ב־6 החודשים הבאים. לא מתקדם לשום מקום... נשאר באותו מצב כמו עכשיו.',
      'או אפילו יותר גרוע: ממשיך לבזבז כסף על מבחנים. כן, זה מה שאתה עושה — מבזבז כסף.',
      'אתה באמת רוצה את עצמך ככה במשך 6 החודשים הבאים? בגלל שאתה לא יכול לשלוט על האגו המטומטם שלך? בגלל שאתה חושב שהמסחר חבר שלך?',
      'אני מוכן לקבל הפסד מתוכנן. אני לא רודף אחרי המזוודה של אתמול; אני נשאר על הדרך ומחכה להחלטה של מחר.',
      'בשביל להשיג משהו שמעולם לא היה לך — אתה חייב לעשות משהו שמעולם לא עשית.'
    ].join('\n');
    if (!navigator.clipboard || !navigator.clipboard.writeText) { notify('העתקה אינה זמינה בדפדפן הזה.'); return; }
    navigator.clipboard.writeText(message)
      .then(() => notify('המניפסט הועתק. שמור אותו לרגעים הקשים.'))
      .catch(() => notify('לא הצלחנו להעתיק. בדוק הרשאות דפדפן.'));
  });
})();
