#!/usr/bin/env node
/**
 * PulsePlan Zero-Dependency Automated Logic Test Suite
 *
 * Loads the compiled runtime script from index.html inside a sandboxed Node vm
 * context and verifies core date/pro-rata math, scheduling power tools,
 * What-If isolation, Undo/Redo, CSV import parsing, and migration integrity.
 *
 * Usage: node test.mjs
 */

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) {
  console.error('❌ Could not extract inline <script> from index.html');
  process.exit(1);
}

// Minimal deterministic browser/DOM stub for headless logic testing
const memStorage = new Map();
const noop = () => {};
const makeStubEl = () => ({
  style: { setProperty: noop },
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  setAttribute: noop,
  getAttribute: () => null,
  addEventListener: noop,
  removeEventListener: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  appendChild: noop,
  remove: noop,
  focus: noop,
  closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 30, bottom: 30 }),
  innerHTML: '',
  textContent: '',
  value: '',
  dataset: {},
});

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  Set,
  Map,
  Number,
  String,
  Boolean,
  RegExp,
  Error,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  setTimeout: () => 0,
  clearTimeout: noop,
  setInterval: () => 0,
  clearInterval: noop,
  requestAnimationFrame: noop,
  localStorage: {
    getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
    setItem: (k, v) => memStorage.set(k, String(v)),
    removeItem: (k) => memStorage.delete(k),
  },
  navigator: { userAgent: 'PulsePlanTestRunner' },
  document: {
    documentElement: makeStubEl(),
    body: makeStubEl(),
    activeElement: null,
    fullscreenElement: null,
    fonts: null,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeStubEl(),
    addEventListener: noop,
    removeEventListener: noop,
  },
  window: null,
};
sandbox.window = {
  innerWidth: 1440,
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false }),
  print: noop,
  scrollTo: noop,
};

const ctx = vm.createContext(sandbox);
// Prevent init() from running DOM boot side-effects on load; we call pure functions directly
const testableCode = scriptMatch[1].replace(/\binit\(\);\s*$/, '');
vm.runInContext(testableCode, ctx);

// Initialize a clean liveDB and demoDB in the VM context
vm.runInContext(`
  liveDB = createSampleDemoDB();
  demoDB = createSampleDemoDB();
  ui.demoMode = false;
  ui.whatIfMode = false;
  ui.timeUnit = 'week';
  ui.manpowerUnit = 'fte';
`, ctx);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('ISO week & month pro-rata math (4-week vs 5-week months)', () => {
  const res = vm.runInContext(`({
    wJan2026: getWeeksInMonth('2026-01'),
    wFeb2026: getWeeksInMonth('2026-02'),
    nextWk: addWeeksToWeekKey('2026-W52', 2),
    nextMo: addMonthsToMonthKey('2026-11', 3),
    addDays: addDaysToISODate('2026-01-28', 7),
  })`, ctx);
  assert.equal(res.wJan2026.length, 5, 'Jan 2026 has 5 ISO Thursdays');
  assert.equal(res.wFeb2026.length, 4, 'Feb 2026 has 4 ISO Thursdays');
  assert.equal(res.nextWk, '2027-W01', '2026 has 53 ISO weeks, so W52+2 = 2027-W01');
  assert.equal(res.nextMo, '2027-02');
  assert.equal(res.addDays, '2026-02-04');
});

test('FTE <-> Days <-> Hours round-trip conversions', () => {
  const res = vm.runInContext(`({
    days5wk: fteToDisplayValue(2.0, '2026-01', 'month', 'days'),
    hours4wk: fteToDisplayValue(1.5, '2026-02', 'month', 'hours'),
    backFteDays: displayValueToFte(50, '2026-01', 'month', 'days'),
    backFteHours: displayValueToFte(240, '2026-02', 'month', 'hours'),
  })`, ctx);
  assert.equal(res.days5wk, 50); // 2 FTE * 5d * 5wks
  assert.equal(res.hours4wk, 240); // 1.5 FTE * 5d * 8h * 4wks
  assert.equal(res.backFteDays, 2);
  assert.equal(res.backFteHours, 1.5);
});

test('Shift Project Schedule (+2 weeks) is lossless and preserves milestone baseline', () => {
  const res = vm.runInContext(`(() => {
    const db = createEmptyDB();
    db.departments = [{ id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 5, manager: '' }];
    db.projects = [{ id: 'p1', name: 'Alpha', code: 'ALP', color: '#0ea5e9', status: 'Active', priority: 'High', owner: '', budgetDays: 100, archived: false }];
    db.allocations['d1::p1::2026-W10'] = 2.0;
    db.allocations['d1::p1::2026-W11'] = 3.0;
    db.allocations['d1::p1::2026-W12'] = 1.5;
    db.comments['d1::p1::2026-W10'] = 'Kickoff';
    db.milestones = [{ id: 'm1', projectId: 'p1', deptId: 'd1', title: 'Beta', date: '2026-03-10', baselineDate: '2026-03-10', status: 'Pending' }];

    const out = shiftProjectSchedule('p1', 2, 'week', { shiftMilestones: true, shiftBaseline: false, shiftComments: true }, db);
    return { out, allocs: db.allocations, comments: db.comments, ms: db.milestones[0] };
  })()`, ctx);

  assert.equal(res.out.movedAllocs, 3);
  assert.equal(res.out.movedComments, 1);
  assert.equal(res.out.movedMilestones, 1);
  assert.equal(res.allocs['d1::p1::2026-W10'], undefined);
  assert.equal(res.allocs['d1::p1::2026-W12'], 2.0);
  assert.equal(res.allocs['d1::p1::2026-W13'], 3.0);
  assert.equal(res.allocs['d1::p1::2026-W14'], 1.5);
  assert.equal(res.comments['d1::p1::2026-W12'], 'Kickoff');
  assert.equal(res.ms.date, '2026-03-24');
  assert.equal(res.ms.baselineDate, '2026-03-10');
});

test('Company Holiday / Shutdown % scales capacity and resets cleanly at 100%', () => {
  const res = vm.runInContext(`(() => {
    const db = createEmptyDB();
    db.departments = [
      { id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 8.0, manager: '' },
      { id: 'd2', name: 'Des', code: 'DES', color: '#ec4899', defaultCapacity: 3.0, manager: '' },
    ];
    applyHolidayFactor(['d1', 'd2'], '2026-W33', 2, 'week', 50, db);
    const mid = { ...db.capacityOverrides };
    applyHolidayFactor(['d1'], '2026-W33', 1, 'week', 100, db);
    return { mid, after: db.capacityOverrides };
  })()`, ctx);

  assert.equal(res.mid['d1::2026-W33'], 4);
  assert.equal(res.mid['d1::2026-W34'], 4);
  assert.equal(res.mid['d2::2026-W33'], 1.5);
  assert.equal(res.after['d1::2026-W33'], undefined);
  assert.equal(res.after['d1::2026-W34'], 4);
});

test('Project Effort Budget planned days & migration preserves budgetDays + archived', () => {
  const res = vm.runInContext(`(() => {
    const raw = {
      departments: [{ id: 'd1', name: 'Eng', code: 'ENG', defaultCapacity: 5 }],
      projects: [{ id: 'p1', name: 'Old', code: 'OLD', budgetDays: 60, archived: true }],
      allocations: { 'd1::p1::2026-W05': 2.0, 'd1::p1::2026-W06': 1.5 },
    };
    const migrated = normalizeAndMigrateDB(raw);
    return {
      proj: migrated.projects[0],
      plannedDays: getProjectTotalPlannedDays('p1', migrated),
    };
  })()`, ctx);

  assert.equal(res.proj.budgetDays, 60);
  assert.equal(res.proj.archived, true);
  assert.equal(res.plannedDays, 17.5); // (2.0 + 1.5) * 5d
});

test('What-If Scenario Mode isolates edits from Live DB and computes live delta', () => {
  const res = vm.runInContext(`(() => {
    liveDB = createSampleDemoDB();
    const beforeKey = Object.keys(liveDB.allocations)[0];
    const beforeVal = liveDB.allocations[beforeKey];
    enterWhatIfMode();
    const activeIsWhatIf = getActiveDB() === whatIfDB && getActiveDB() !== liveDB;
    getActiveDB().allocations[beforeKey] = beforeVal + 1.5;
    touchDBAndSave();
    const liveUnchanged = liveDB.allocations[beforeKey] === beforeVal;
    const summary = computeWhatIfDeltaSummary();
    discardWhatIfMode();
    const restoredLive = getActiveDB() === liveDB && !ui.whatIfMode;
    return { activeIsWhatIf, liveUnchanged, summary, restoredLive };
  })()`, ctx);

  assert.equal(res.activeIsWhatIf, true);
  assert.equal(res.liveUnchanged, true);
  assert.match(res.summary, /\+1\.5 FTE-wks/);
  assert.equal(res.restoredLive, true);
});

test('Undo / Redo restores and reapplies allocation edits accurately', () => {
  const res = vm.runInContext(`(() => {
    liveDB = createEmptyDB();
    liveDB.departments = [{ id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 5, manager: '' }];
    liveDB.projects = [{ id: 'p1', name: 'Nova', code: 'NVA', color: '#4f46e5', status: 'Active', priority: 'High', owner: '', budgetDays: 0, archived: false }];
    clearUndoHistory();
    liveDB.allocations['d1::p1::2026-W10'] = 1.0;
    pushUndoState('Raise allocation');
    liveDB.allocations['d1::p1::2026-W10'] = 4.0;
    const afterEdit = liveDB.allocations['d1::p1::2026-W10'];
    undoLastChange();
    const afterUndo = liveDB.allocations['d1::p1::2026-W10'];
    redoLastChange();
    const afterRedo = liveDB.allocations['d1::p1::2026-W10'];
    return { afterEdit, afterUndo, afterRedo };
  })()`, ctx);

  assert.equal(res.afterEdit, 4.0);
  assert.equal(res.afterUndo, 1.0);
  assert.equal(res.afterRedo, 4.0);
});

test('CSV / Excel paste parser handles tabs, commas, header skipping, Days->FTE & errors', () => {
  const res = vm.runInContext(`(() => {
    const db = createSampleDemoDB();
    const sample = [
      'Department, Project, Period, Value',
      'ENG, NVA, 2026-W10, 10',
      'Product Design\\tAtlas Mobile v3\\t2026-02\\t20',
      'BADDEPT, NVA, 2026-W10, 5',
      'ENG, NVA, NOTADATE, 5',
    ].join('\\n');
    return parseDelimitedAllocations(sample, 'days', db);
  })()`, ctx);

  assert.equal(res.valid.length, 2);
  assert.equal(res.errors.length, 2);
  assert.equal(res.valid[0].deptCode, 'ENG');
  assert.equal(res.valid[0].fte, 2.0); // 10 days / 5d/wk = 2.0 FTE
  assert.equal(res.valid[1].deptCode, 'DES');
  assert.equal(res.valid[1].fte, 1.0); // 20 days / (4 wks * 5d) = 1.0 FTE
});

test('Saved Views persist and reload cleanly from storage', () => {
  const res = vm.runInContext(`(() => {
    persistSavedViews([{ id: 'v1', name: 'Steering 2W', state: { meetingMode: true, meetingHorizon: 2 } }]);
    return getSavedViews();
  })()`, ctx);

  assert.equal(res.length, 1);
  assert.equal(res[0].name, 'Steering 2W');
  assert.equal(res[0].state.meetingHorizon, 2);
});

test('Full-column layout geometry prevents half columns in Standard & Meeting views', () => {
  const res = vm.runInContext(`({
    std12on1400: computeFullColumnGeometry(1400, 12, false, false),
    std4on1400: computeFullColumnGeometry(1400, 4, false, false),
    meet4on1024: computeFullColumnGeometry(1024, 4, true, false),
    meet2on1440: computeFullColumnGeometry(1440, 2, true, false),
  })`, ctx);

  // 12 periods on 1400px: visibleCols must be an exact integer filling 100% of (1400 - stickyW)
  assert.equal(Number.isInteger(res.std12on1400.visibleCols), true);
  assert.ok(Math.abs(res.std12on1400.stickyW + res.std12on1400.colW * res.std12on1400.visibleCols - 1400) < 0.01);
  // 4 periods on 1400px: all 4 periods fit cleanly edge-to-edge
  assert.equal(res.std4on1400.visibleCols, 4);
  assert.ok(Math.abs(res.std4on1400.totalTableW - 1400) < 0.01);
  // Meeting View 4 periods on 1024px: all 4 fit with 0 overflow
  assert.equal(res.meet4on1024.visibleCols, 4);
  assert.ok(Math.abs(res.meet4on1024.totalTableW - 1024) < 0.01);
  // Meeting View 2 periods on 1440px: exact 50/50 split
  assert.equal(res.meet2on1440.visibleCols, 2);
  assert.ok(Math.abs(res.meet2on1440.totalTableW - 1440) < 0.01);
  // Browser tab SVG favicon is embedded in index.html
  assert.equal(html.includes('<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,'), true);
});

test('Projects are sorted naturally by project code everywhere', () => {
  const res = vm.runInContext(`(() => {
    const demoCodes = createSampleDemoDB().projects.map(p => p.code);
    const mig = normalizeAndMigrateDB({
      departments: [{ id: 'd1', name: 'Eng', code: 'ENG', defaultCapacity: 5 }],
      projects: [
        { id: 'p3', name: 'Zeta', code: 'P10' },
        { id: 'p1', name: 'Alpha', code: 'P2' },
        { id: 'p2', name: 'Beta', code: 'A01' },
      ],
    });
    return { demoCodes, migCodes: mig.projects.map(p => p.code) };
  })()`, ctx);

  assert.deepEqual([...res.demoCodes], ['AIC', 'ATL', 'CLD', 'EPR', 'NVA']);
  assert.deepEqual([...res.migCodes], ['A01', 'P2', 'P10']);
});

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${t.name}\n   ${err.message}`);
    failed++;
  }
}

console.log(`\nSummary: ${passed}/${tests.length} tests passed${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
