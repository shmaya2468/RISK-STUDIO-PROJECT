(function (root, factory) {
  const engine = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (root) root.RiskEngine = engine;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // CME quoted price-point values in USD; for metals, 1.00 = $1 per troy ounce.
  const MARKETS = Object.freeze({
    nasdaq: { name: 'NASDAQ 100', symbols: { micro: 'MNQ', mini: 'NQ' }, defaults: { entry: 30000, stop: 25, target: 60 }, maxStop: 200, maxTarget: 400 },
    sp: { name: 'S&P 500', symbols: { micro: 'MES', mini: 'ES' }, defaults: { entry: 7400, stop: 8, target: 20 }, maxStop: 80, maxTarget: 160 },
    dow: { name: 'DOW JONES', symbols: { micro: 'MYM', mini: 'YM' }, defaults: { entry: 54000, stop: 80, target: 180 }, maxStop: 1000, maxTarget: 2000 },
    gold: { name: 'GOLD', symbols: { micro: 'MGC', mini: 'QO', standard: 'GC' }, defaults: { entry: 4200, stop: 10, target: 25 }, maxStop: 100, maxTarget: 250 }
  });

  const CONTRACTS = Object.freeze({
    MNQ: { market: 'nasdaq', size: 'micro', pointValue: 2, tick: .25, tickValue: .5 },
    NQ:  { market: 'nasdaq', size: 'mini', pointValue: 20, tick: .25, tickValue: 5 },
    MES: { market: 'sp', size: 'micro', pointValue: 5, tick: .25, tickValue: 1.25 },
    ES:  { market: 'sp', size: 'mini', pointValue: 50, tick: .25, tickValue: 12.5 },
    MYM: { market: 'dow', size: 'micro', pointValue: .5, tick: 1, tickValue: .5 },
    YM:  { market: 'dow', size: 'mini', pointValue: 5, tick: 1, tickValue: 5 },
    MGC: { market: 'gold', size: 'micro', pointValue: 10, tick: .1, tickValue: 1 },
    QO:  { market: 'gold', size: 'mini', pointValue: 50, tick: .25, tickValue: 12.5 },
    GC:  { market: 'gold', size: 'standard', pointValue: 100, tick: .1, tickValue: 10 }
  });

  const isTickAligned = (number, tick) => Math.abs(number / tick - Math.round(number / tick)) < 0.000001;
  const round = (n, dp = 2) => Number(n.toFixed(dp));

  function calculate(config) {
    const { symbol, mode = 'distance', side = 'long' } = config;
    const contract = CONTRACTS[symbol];
    if (!contract) return { ok: false, error: 'חוזה לא מוכר.' };
    if (!['long', 'short'].includes(side)) return { ok: false, error: 'כיוון עסקה לא מוכר.' };
    if (!['distance', 'prices'].includes(mode)) return { ok: false, error: 'שיטת חישוב לא מוכרת.' };

    const quantity = Number(config.quantity);
    const accountSize = Number(config.accountSize);
    const riskBudget = Number(config.riskBudget);
    const commission = Number(config.commission);
    const slippage = Number(config.slippage);

    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return { ok: false, error: 'יש לבחור כמות חוזים שלמה בין 1 ל־1,000.' };
    if (!Number.isFinite(accountSize) || accountSize <= 0) return { ok: false, error: 'גודל החשבון חייב להיות גדול מאפס.' };
    if (!Number.isFinite(riskBudget) || riskBudget <= 0) return { ok: false, error: 'תקציב הסיכון חייב להיות גדול מאפס.' };
    if (!Number.isFinite(commission) || commission < 0) return { ok: false, error: 'העמלה חייבת להיות אפס או יותר.' };
    if (!Number.isSafeInteger(slippage) || slippage < 0 || slippage > 10000) return { ok: false, error: 'החלקה צריכה להיות מספר טיקים שלם ולא שלילי.' };

    let stopPoints = Number(config.stopPoints);
    let targetPoints = Number(config.targetPoints);
    let entry = null, stop = null, target = null;

    if (mode === 'prices') {
      entry = Number(config.entryPrice);
      stop = Number(config.stopPrice);
      target = Number(config.targetPrice);
      if (![entry, stop, target].every(Number.isFinite) || [entry, stop, target].some(n => n <= 0)) return { ok: false, error: 'יש להזין מחירי כניסה, סטופ וטייק חיוביים ותקינים.' };
      if (![entry, stop, target].every(n => isTickAligned(n, contract.tick))) return { ok: false, error: `המחירים חייבים להיות בכפולות של ${contract.tick} (טיק אחד בחוזה ${symbol}).` };
      if (side === 'long' && !(stop < entry && entry < target)) return { ok: false, error: 'בעסקת LONG: הסטופ חייב להיות מתחת לכניסה והטייק מעליה.' };
      if (side === 'short' && !(target < entry && entry < stop)) return { ok: false, error: 'בעסקת SHORT: הסטופ חייב להיות מעל הכניסה והטייק מתחתיה.' };
      stopPoints = Math.abs(entry - stop);
      targetPoints = Math.abs(entry - target);
    }

    if (![stopPoints, targetPoints].every(n => Number.isFinite(n) && n > 0)) return { ok: false, error: 'המרחק לסטופ ולטייק חייב להיות גדול מאפס.' };
    if (!isTickAligned(stopPoints, contract.tick) || !isTickAligned(targetPoints, contract.tick)) return { ok: false, error: `המרחק חייב להיות בכפולות של ${contract.tick} נקודות, בהתאם לטיק של ${symbol}.` };

    const stopTicks = Math.round(stopPoints / contract.tick);
    const targetTicks = Math.round(targetPoints / contract.tick);
    const costsPerContract = commission + 2 * slippage * contract.tickValue;
    const riskPerContract = round(stopTicks * contract.tickValue + costsPerContract);
    const rewardPerContract = round(targetTicks * contract.tickValue - costsPerContract);
    const grossRisk = round(stopTicks * contract.tickValue * quantity);
    const grossReward = round(targetTicks * contract.tickValue * quantity);
    const totalCosts = round(costsPerContract * quantity);
    const risk = round(grossRisk + totalCosts);
    const reward = round(grossReward - totalCosts);
    const rr = risk > 0 ? reward / risk : null;
    const breakevenRate = reward > 0 ? 100 * risk / (risk + reward) : null;
    const riskPercent = 100 * risk / accountSize;
    const recommendedQuantity = Math.min(1000, Math.max(0, Math.floor((riskBudget + 0.00000001) / riskPerContract)));

    return {
      ok: true, symbol, contract, quantity, side, mode, stopPoints: round(stopPoints, 4), targetPoints: round(targetPoints, 4),
      entry, stop, target, stopTicks, targetTicks,
      grossRisk, grossReward, totalCosts, costsPerContract: round(costsPerContract),
      riskPerContract, rewardPerContract, risk, reward, rr, breakevenRate, riskPercent,
      recommendedQuantity, withinBudget: risk <= riskBudget + .000001,
      riskBudget, accountSize
    };
  }

  return Object.freeze({ MARKETS, CONTRACTS, calculate, isTickAligned, round });
});
