const test = require('node:test');
const assert = require('node:assert/strict');
const { MARKETS, CONTRACTS, calculate } = require('../dist/engine.js');

const setup = {
  symbol: 'MNQ', quantity: 5, mode: 'distance', side: 'long',
  stopPoints: 25, targetPoints: 60,
  accountSize: 50000, riskBudget: 300, commission: 0, slippage: 0
};
const run = opts => calculate({ ...setup, ...opts });

test('CME contract tick and point values for each market and size', () => {
  const expected = [
    ['MNQ', 'nasdaq', 'micro', 2, .25, .5],
    ['NQ', 'nasdaq', 'mini', 20, .25, 5],
    ['MES', 'sp', 'micro', 5, .25, 1.25],
    ['ES', 'sp', 'mini', 50, .25, 12.5],
    ['MYM', 'dow', 'micro', .5, 1, .5],
    ['YM', 'dow', 'mini', 5, 1, 5],
    ['MGC', 'gold', 'micro', 10, .1, 1],
    ['QO', 'gold', 'mini', 50, .25, 12.5],
    ['GC', 'gold', 'standard', 100, .1, 10]
  ];
  assert.equal(Object.keys(CONTRACTS).length, 9);
  expected.forEach(([symbol, market, size, pointValue, tick, tickValue]) => {
    assert.deepEqual(CONTRACTS[symbol], { market, size, pointValue, tick, tickValue });
    assert.equal(MARKETS[market].symbols[size], symbol);
    assert.equal(pointValue * tick, tickValue);
  });
});

test('example MNQ position: $250 loss, $600 target, 1:2.40', () => {
  const r = run();
  assert.equal(r.ok, true);
  assert.equal(r.risk, 250);
  assert.equal(r.reward, 600);
  assert.equal(r.riskPerContract, 50);
  assert.equal(r.rewardPerContract, 120);
  assert.equal(r.stopTicks, 100);
  assert.equal(r.targetTicks, 240);
  assert.equal(r.rr, 2.4);
  assert.equal(r.recommendedQuantity, 6);
  assert.equal(r.riskPercent, .5);
});

test('maturity sizes and gold scaling change risk proportionally', () => {
  assert.equal(run({ symbol: 'NQ', quantity: 1 }).risk, 500);
  assert.equal(run({ symbol: 'MES', quantity: 1, stopPoints: 5, targetPoints: 10 }).risk, 25);
  assert.equal(run({ symbol: 'ES', quantity: 1, stopPoints: 5, targetPoints: 10 }).risk, 250);
  assert.equal(run({ symbol: 'MYM', quantity: 1, stopPoints: 25, targetPoints: 60 }).risk, 12.5);
  assert.equal(run({ symbol: 'YM', quantity: 1, stopPoints: 25, targetPoints: 60 }).risk, 125);
  assert.equal(run({ symbol: 'MGC', quantity: 1, stopPoints: 10, targetPoints: 25 }).risk, 100);
  assert.equal(run({ symbol: 'QO', quantity: 1, stopPoints: 10, targetPoints: 25 }).risk, 500);
  assert.equal(run({ symbol: 'GC', quantity: 1, stopPoints: 10, targetPoints: 25 }).risk, 1000);
});

test('commissions and both-sided slippage increase risk and reduce reward', () => {
  const r = run({ quantity: 2, commission: 3, slippage: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.costsPerContract, 5); // $3 + 2 sides × 2 ticks × $0.50
  assert.equal(r.totalCosts, 10);
  assert.equal(r.grossRisk, 100);
  assert.equal(r.grossReward, 240);
  assert.equal(r.risk, 110);
  assert.equal(r.reward, 230);
  assert.equal(r.riskPerContract, 55);
  assert.equal(r.recommendedQuantity, 5);
});

test('long price mode calculates exactly from aligned entry and exits', () => {
  const r = run({ mode: 'prices', entryPrice: 30000, stopPrice: 29975, targetPrice: 30060 });
  assert.equal(r.ok, true);
  assert.equal(r.risk, 250);
  assert.equal(r.reward, 600);
});

test('short price mode mirrors long and validates stop/take sides', () => {
  const r = run({ mode: 'prices', side: 'short', entryPrice: 30000, stopPrice: 30025, targetPrice: 29940 });
  assert.equal(r.ok, true);
  assert.equal(r.risk, 250);
  assert.equal(r.reward, 600);
  assert.match(run({ mode: 'prices', side: 'short', entryPrice: 30000, stopPrice: 29975, targetPrice: 30060 }).error, /SHORT/);
  assert.match(run({ mode: 'prices', side: 'long', entryPrice: 30000, stopPrice: 30025, targetPrice: 29940 }).error, /LONG/);
});

test('prices and distances must honor the specific tick size', () => {
  assert.equal(run({ stopPoints: .1 }).ok, false); // MNQ 0.25 ticks
  assert.equal(run({ symbol: 'YM', stopPoints: 2.5 }).ok, false); // YM 1.0 ticks
  assert.equal(run({ symbol: 'MGC', stopPoints: 1.1, targetPoints: 2.7 }).ok, true);
  assert.equal(run({ symbol: 'QO', stopPoints: 1.1, targetPoints: 2.7 }).ok, false);
  assert.equal(run({ mode: 'prices', entryPrice: 30000.1, stopPrice: 29975, targetPrice: 30060 }).ok, false);
});

test('invalid quantities and advanced settings are rejected', () => {
  for (const quantity of [0, -1, 1.5, 1001, NaN]) assert.equal(run({ quantity }).ok, false);
  assert.equal(run({ accountSize: 0 }).ok, false);
  assert.equal(run({ riskBudget: -10 }).ok, false);
  assert.equal(run({ commission: -1 }).ok, false);
  assert.equal(run({ slippage: .5 }).ok, false);
  assert.equal(run({ stopPoints: 0 }).ok, false);
  assert.equal(run({ symbol: 'NOTHING' }).ok, false);
});

test('budget exceeded, limited recommended contracts and net-negative reward', () => {
  const over = run({ riskBudget: 100 });
  assert.equal(over.withinBudget, false);
  assert.equal(over.recommendedQuantity, 2);
  const costHeavy = run({ commission: 500, slippage: 0 });
  assert.equal(costHeavy.ok, true);
  assert.ok(costHeavy.reward < 0);
  assert.equal(costHeavy.breakevenRate, null);
});
