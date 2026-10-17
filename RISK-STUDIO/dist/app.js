(() => {
  'use strict';

  const { MARKETS, CONTRACTS, calculate, round } = window.RiskEngine;
  const $ = id => document.getElementById(id);
  const state = { market: 'nasdaq', size: 'micro', side: 'long', mode: 'distance' };
  const money = (n, digits = 2) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const count = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const value = id => $(id).value;
  const number = id => Number(value(id));
  const symbol = () => MARKETS[state.market].symbols[state.size];
  let lastResult = null;
  let toastTimeout = null;

  function currentContract() { return CONTRACTS[symbol()]; }
  function formatInput(n) { return String(round(n, 4)); }
  function snap(n, tick) { return round(Math.max(tick, Math.round(n / tick) * tick), 4); }
  function setPriceInputsFromDistances() {
    const tick = currentContract().tick;
    const entry = Math.max(tick, Math.round(number('entry-price') / tick) * tick) || MARKETS[state.market].defaults.entry;
    const sl = snap(number('stop-points'), tick);
    const tp = snap(number('target-points'), tick);
    $('entry-price').value = formatInput(entry);
    $('stop-price').value = formatInput(entry + (state.side === 'long' ? -sl : sl));
    $('target-price').value = formatInput(entry + (state.side === 'long' ? tp : -tp));
  }

  function setSliders(tick) {
    const market = MARKETS[state.market];
    [
      ['stop-points', 'stop-slider', market.maxStop],
      ['target-points', 'target-slider', market.maxTarget]
    ].forEach(([inputId, sliderId, maximum]) => {
      const input = $(inputId), slider = $(sliderId);
      input.min = String(tick); input.step = String(tick);
      slider.min = String(tick); slider.step = String(tick); slider.max = String(maximum);
      slider.value = String(Math.max(tick, Math.min(maximum, number(inputId) || tick)));
    });
    for (const id of ['entry-price', 'stop-price', 'target-price']) $(id).step = String(tick);
  }

  function paintButtons() {
    document.querySelectorAll('[data-market]').forEach(button => {
      const active = button.dataset.market === state.market;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const isGold = state.market === 'gold';
    document.querySelector('[data-size="standard"]').hidden = !isGold;
    document.querySelectorAll('[data-size]').forEach(button => {
      const active = button.dataset.size === state.size;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-side]').forEach(button => {
      const active = button.dataset.side === state.side;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-mode]').forEach(button => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('distance-fields').hidden = state.mode !== 'distance';
    $('prices-fields').hidden = state.mode !== 'prices';
    $('micro-symbol').textContent = MARKETS[state.market].symbols.micro;
    $('mini-symbol').textContent = MARKETS[state.market].symbols.mini;
    $('selected-symbol').textContent = symbol();
    $('selected-point').textContent = money(currentContract().pointValue);
    $('selected-tick').textContent = money(currentContract().tickValue);
    document.querySelectorAll('[data-contract]').forEach(row => row.classList.toggle('chosen-contract', row.dataset.contract === symbol()));
  }

  function clearOutputs(message) {
    const clearIds = ['risk-total','risk-per-contract','reward-total','reward-per-contract','rr-total','breakeven-rate','position-sym','track-profit','track-loss','distance-stop','distance-target','stop-ticks','target-ticks','risk-percent','recommended-qty'];
    clearIds.forEach(id => $(id).textContent = '—');
    $('risk-budget-badge').textContent = 'יש לתקן את הנתונים';
    $('risk-budget-badge').className = 'risk-badge over';
    $('stop-ticks-label').textContent = '— TICKS';
    $('target-ticks-label').textContent = '— TICKS';
    $('copy-plan').disabled = true;
    $('validation').textContent = message;
  }

  function readConfig() {
    return {
      symbol: symbol(), quantity: value('quantity'), mode: state.mode, side: state.side,
      stopPoints: value('stop-points'), targetPoints: value('target-points'),
      entryPrice: value('entry-price'), stopPrice: value('stop-price'), targetPrice: value('target-price'),
      accountSize: value('account-size'), riskBudget: value('risk-budget'),
      commission: value('commission'), slippage: value('slippage')
    };
  }

  function render() {
    paintButtons();
    const result = calculate(readConfig());
    lastResult = result.ok ? result : null;
    if (!result.ok) { clearOutputs(result.error); return; }

    const tick = result.contract.tick;
    const stopPercent = Math.max(28, 90 * result.stopPoints / Math.max(result.stopPoints, result.targetPoints));
    const targetPercent = Math.max(28, 90 * result.targetPoints / Math.max(result.stopPoints, result.targetPoints));
    $('validation').textContent = result.reward <= 0 ? 'שימו לב: לאחר העלויות המשוערות, הרווח ביעד אינו חיובי.' : '';
    $('risk-total').textContent = money(result.risk);
    $('risk-per-contract').textContent = money(result.riskPerContract) + ' לחוזה';
    $('risk-budget-badge').textContent = result.withinBudget ? 'בתוך תקציב הסיכון' : 'חורג מתקציב הסיכון';
    $('risk-budget-badge').className = 'risk-badge ' + (result.withinBudget ? 'safe' : 'over');
    $('reward-total').textContent = (result.reward >= 0 ? '+' : '−') + money(Math.abs(result.reward));
    $('reward-per-contract').textContent = money(result.rewardPerContract) + ' לחוזה';
    $('rr-total').textContent = result.rr > 0 ? '1 : ' + result.rr.toFixed(2) : 'אין יחס חיובי';
    $('breakeven-rate').textContent = result.breakevenRate !== null ? 'נדרש ' + result.breakevenRate.toFixed(1) + '% הצלחה לאיזון' : 'הרווח ביעד אינו מכסה עלויות';
    $('position-sym').textContent = result.symbol + ' × ' + count(result.quantity);
    $('track-profit').textContent = (result.reward >= 0 ? '+' : '−') + money(Math.abs(result.reward), 0);
    $('track-loss').textContent = '−' + money(result.risk, 0);
    $('profit-track').style.width = targetPercent.toFixed(1) + '%';
    $('loss-track').style.width = stopPercent.toFixed(1) + '%';
    $('distance-stop').textContent = 'SL · ' + count(result.stopPoints) + ' נק׳';
    $('distance-target').textContent = 'TP · ' + count(result.targetPoints) + ' נק׳';
    $('stop-ticks').textContent = count(result.stopTicks);
    $('target-ticks').textContent = count(result.targetTicks);
    $('risk-percent').textContent = result.riskPercent.toFixed(2) + '%';
    $('recommended-qty').textContent = count(result.recommendedQuantity);
    $('stop-ticks-label').textContent = count(result.stopTicks) + ' TICKS';
    $('target-ticks-label').textContent = count(result.targetTicks) + ' TICKS';
    $('copy-plan').disabled = false;

    [['stop-points', 'stop-slider'], ['target-points', 'target-slider']].forEach(([inputId, sliderId]) => {
      const inputNumber = number(inputId);
      const slider = $(sliderId);
      if (Number.isFinite(inputNumber) && inputNumber >= tick) {
        slider.value = String(Math.min(Number(slider.max), Math.max(tick, inputNumber)));
        const proportion = Math.max(0, Math.min(100, 100 * (Number(slider.value) - tick) / (Number(slider.max) - tick)));
        slider.style.setProperty('--fill', proportion + '%');
      }
    });
  }

  function changeMarket(next) {
    if (!MARKETS[next]) return;
    state.market = next;
    state.size = 'micro';
    const defaults = MARKETS[next].defaults;
    $('stop-points').value = defaults.stop;
    $('target-points').value = defaults.target;
    $('entry-price').value = defaults.entry;
    setSliders(currentContract().tick);
    setPriceInputsFromDistances();
    render();
  }

  function changeSize(next) {
    if (!MARKETS[state.market].symbols[next]) return;
    state.size = next;
    const tick = currentContract().tick;
    $('stop-points').value = formatInput(snap(number('stop-points'), tick));
    $('target-points').value = formatInput(snap(number('target-points'), tick));
    setSliders(tick);
    setPriceInputsFromDistances();
    render();
  }

  function synchronizePriceModeFromDistances() {
    const entry = number('entry-price');
    const stop = number('stop-price');
    const target = number('target-price');
    if ([entry, stop, target].every(Number.isFinite) && entry > 0 && stop > 0 && target > 0) {
      const tick = currentContract().tick;
      $('stop-points').value = formatInput(snap(Math.abs(entry - stop), tick));
      $('target-points').value = formatInput(snap(Math.abs(entry - target), tick));
    }
  }

  function changeMode(next) {
    if (next === state.mode) return;
    if (next === 'prices') setPriceInputsFromDistances();
    else synchronizePriceModeFromDistances();
    state.mode = next;
    render();
  }

  function showToast(message) {
    const element = $('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.classList.remove('show'), 2800);
  }

  function copyPlan() {
    if (!lastResult) return;
    const r = lastResult;
    const market = MARKETS[r.contract.market].name;
    const lines = [
      'FUTURES RISK STUDIO — תכנית עסקה',
      'שוק: ' + market + ' | חוזה: ' + r.symbol,
      'כיוון: ' + r.side.toUpperCase() + ' | חוזים: ' + r.quantity,
      ...(r.mode === 'prices' ? ['כניסה: ' + r.entry + ' | סטופ: ' + r.stop + ' | טייק: ' + r.target] : []),
      'מרחק סטופ: ' + r.stopPoints + ' נקודות (' + r.stopTicks + ' טיקים)',
      'מרחק טייק: ' + r.targetPoints + ' נקודות (' + r.targetTicks + ' טיקים)',
      'סיכון כולל משוער: ' + money(r.risk) + ' | רווח ביעד משוער: ' + money(r.reward),
      'סיכוי/סיכון: 1:' + (r.rr > 0 ? r.rr.toFixed(2) : 'N/A'),
      'עלויות משוערות: ' + money(r.totalCosts),
      'סיכון מהחשבון: ' + r.riskPercent.toFixed(2) + '%',
      'מספר חוזים שמתאים לתקציב: ' + r.recommendedQuantity,
      'חישוב תיאורטי — אינו כולל הבטחה למחיר ביצוע או נתוני שוק בזמן אמת.'
    ];
    if (!navigator.clipboard || !navigator.clipboard.writeText) { showToast('העתקה אינה זמינה בדפדפן הזה.'); return; }
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('תכנית העסקה הועתקה ללוח ✓')).catch(() => showToast('לא הצלחנו להעתיק. בדוק הרשאות דפדפן.'));
  }

  function renderContractsTable() {
    const rows = ['MNQ','NQ','MES','ES','MYM','YM','MGC','QO','GC'];
    const sizeName = { micro: 'מיקרו', mini: 'מיני', standard: 'רגיל' };
    const body = $('contracts-table');
    rows.forEach(symbolName => {
      const contract = CONTRACTS[symbolName];
      const row = document.createElement('tr');
      row.dataset.contract = symbolName;
      row.innerHTML = `<td>${MARKETS[contract.market].name}</td><td><span class="contract-symbol">${symbolName}</span></td><td>${sizeName[contract.size]}</td><td>${money(contract.pointValue)}</td><td>${count(contract.tick)}</td><td>${money(contract.tickValue)}</td>`;
      row.title = 'לחץ לבחירת ' + symbolName + ' במחשבון';
      row.tabIndex = 0;
      const choose = () => {
        state.market = contract.market;
        const newMarket = MARKETS[contract.market];
        $('stop-points').value = newMarket.defaults.stop;
        $('target-points').value = newMarket.defaults.target;
        $('entry-price').value = newMarket.defaults.entry;
        state.size = contract.size;
        setSliders(contract.tick);
        setPriceInputsFromDistances();
        render();
        $('calculator').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      };
      row.addEventListener('click', choose);
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
      });
      body.append(row);
    });
  }

  function animateHero() {
    const canvas = $('hero-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0, height = 0, frame = 0;
    const resize = () => {
      const size = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = size.width; height = size.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    function draw() {
      if (document.hidden) { if (!reduce) window.requestAnimationFrame(draw); return; }
      context.clearRect(0, 0, width, height);
      const centerX = width / 2, centerY = height / 2;
      const radius = Math.min(width, height) * .4;
      const t = frame / 90;
      for (let i = 0; i < 75; i++) {
        const angle = i * 2.39996 + t * (i % 3 === 0 ? .12 : -.07);
        const r = radius * (.38 + ((i * 61) % 73) / 100);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        context.fillStyle = i % 5 === 0 ? 'rgba(111,244,208,.65)' : 'rgba(125,189,206,.29)';
        context.beginPath(); context.arc(x, y, i % 9 === 0 ? 1.8 : .8, 0, Math.PI * 2); context.fill();
      }
      context.strokeStyle = 'rgba(91,216,188,.17)'; context.lineWidth = .75;
      for (let i = 0; i < 19; i++) {
        const x = 20 + i * (width - 40) / 19;
        const y = height * (.53 + Math.sin(i * .73 + t * .42) * .1 + Math.cos(i * 1.42) * .085);
        context.beginPath(); context.moveTo(x, y - 14); context.lineTo(x, y + 14); context.stroke();
        context.fillStyle = i % 3 === 0 ? 'rgba(109,238,194,.55)' : 'rgba(119,162,232,.37)';
        context.fillRect(x - 3, y - 9, 6, 13);
      }
      if (!reduce) { frame++; window.requestAnimationFrame(draw); }
    }
    draw();
  }

  function initInsights() {
    const filters = Array.from(document.querySelectorAll('.insight-filter[data-topic]'));
    const articles = Array.from(document.querySelectorAll('.insight-card[data-article-topic]'));
    const counter = $('insights-count');
    if (!filters.length || !articles.length || !counter) return;

    filters.forEach(button => button.addEventListener('click', () => {
      const topic = button.dataset.topic;
      filters.forEach(filter => {
        const active = filter === button;
        filter.classList.toggle('active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      let visible = 0;
      articles.forEach(article => {
        const matches = topic === 'all' || article.dataset.articleTopic === topic;
        article.hidden = !matches;
        if (matches) visible++;
        else {
          const details = article.querySelector('details');
          if (details) details.open = false;
        }
      });
      counter.textContent = String(visible).padStart(2, '0') + (visible === 1 ? ' מאמר נבחר' : ' מאמרים נבחרים');
    }));
  }

  document.querySelectorAll('[data-market]').forEach(button => button.addEventListener('click', () => changeMarket(button.dataset.market)));
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => changeSize(button.dataset.size)));
  document.querySelectorAll('[data-side]').forEach(button => button.addEventListener('click', () => {
    if (state.side === button.dataset.side) return;
    state.side = button.dataset.side;
    if (state.mode === 'prices') { synchronizePriceModeFromDistances(); setPriceInputsFromDistances(); }
    render();
  }));
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => changeMode(button.dataset.mode)));
  $('qty-minus').addEventListener('click', () => { $('quantity').value = Math.max(1, (number('quantity') || 1) - 1); render(); });
  $('qty-plus').addEventListener('click', () => { $('quantity').value = Math.min(1000, (number('quantity') || 0) + 1); render(); });
  ['stop-points','target-points','quantity','entry-price','stop-price','target-price','account-size','risk-budget','commission','slippage'].forEach(id => $(id).addEventListener('input', render));
  [['stop-slider','stop-points'], ['target-slider','target-points']].forEach(([sliderId, inputId]) => {
    $(sliderId).addEventListener('input', () => { $(inputId).value = $(sliderId).value; render(); });
  });
  $('copy-plan').addEventListener('click', copyPlan);
  $('reset-calc').addEventListener('click', () => {
    state.side = 'long'; state.mode = 'distance';
    $('quantity').value = 5;
    $('account-size').value = 50000; $('risk-budget').value = 300;
    $('commission').value = 0; $('slippage').value = 0;
    changeMarket('nasdaq');
    showToast('המחשבון אופס');
  });
  renderContractsTable();
  changeMarket('nasdaq');
  animateHero();
  initInsights();
})();
