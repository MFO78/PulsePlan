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
    persistSavedViews([{ id: 'v1', name: 'Steering 2W', state: { horizon: 2, compactRowLabels: true, noteSize: 'lg' } }]);
    return getSavedViews();
  })()`, ctx);

  assert.equal(res.length, 1);
  assert.equal(res[0].name, 'Steering 2W');
  assert.equal(res[0].state.horizon, 2);
  assert.equal(res[0].state.compactRowLabels, true);
});

test('Full-column layout geometry prevents half columns for Vertical & Detailed row labels', () => {
  const res = vm.runInContext(`({
    det12on1400: computeFullColumnGeometry(1400, 12, false, false),
    det4on1400: computeFullColumnGeometry(1400, 4, false, false),
    vert4on1024: computeFullColumnGeometry(1024, 4, true, false),
    vert2on1440: computeFullColumnGeometry(1440, 2, true, false),
  })`, ctx);

  // 12 periods on 1400px: visibleCols must be an exact integer filling 100% of (1400 - stickyW)
  assert.equal(Number.isInteger(res.det12on1400.visibleCols), true);
  assert.ok(Math.abs(res.det12on1400.stickyW + res.det12on1400.colW * res.det12on1400.visibleCols - 1400) < 0.01);
  // 4 periods on 1400px (Detailed): all 4 periods fit cleanly edge-to-edge
  assert.equal(res.det4on1400.visibleCols, 4);
  assert.ok(Math.abs(res.det4on1400.totalTableW - 1400) < 0.01);
  // 4 periods on 1024px (Vertical 62px): all 4 fit with 0 overflow
  assert.equal(res.vert4on1024.visibleCols, 4);
  assert.equal(res.vert4on1024.stickyW, 62);
  assert.ok(Math.abs(res.vert4on1024.totalTableW - 1024) < 0.01);
  // 2 periods on 1440px (Vertical 62px): exact 50/50 split
  assert.equal(res.vert2on1440.visibleCols, 2);
  assert.ok(Math.abs(res.vert2on1440.totalTableW - 1440) < 0.01);
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

test('Users can be removed from Quick Switch and restored cleanly', () => {
  const res = vm.runInContext(`(() => {
    ui.recentUsers = ['Marco', 'Elena Rostova'];
    ui.removedUsers = [];
    ui.userName = 'Marco';
    removeQuickUser('Elena Rostova');
    const afterRemove = getSuggestedTeamUsers();
    removeQuickUser('Marco');
    const activeAfterRemovingSelf = ui.userName;
    const afterRemovingSelf = getSuggestedTeamUsers();
    setActiveUserName('Marco', false);
    const afterReAdd = getSuggestedTeamUsers();
    return { afterRemove, activeAfterRemovingSelf, afterRemovingSelf, afterReAdd };
  })()`, ctx);

  assert.equal(res.afterRemove.includes('Elena Rostova'), false);
  assert.notEqual(res.activeAfterRemovingSelf, 'Marco');
  assert.equal(res.afterRemovingSelf.includes('Marco'), false);
  assert.equal(res.afterReAdd.includes('Marco'), true);
});

test('Mobile Collapse All / Expand All toggles all visible accordion rows cleanly', () => {
  const res = vm.runInContext(`(() => {
    liveDB = createSampleDemoDB();
    ui.axis = 'department';
    ui.filterDept = 'all';
    ui.mobileCollapsedIds = [];
    const total = getMobileVisibleRows().length;
    toggleMobileCollapseAll();
    const afterCollapse = ui.mobileCollapsedIds.length;
    toggleMobileCollapseAll();
    const afterExpand = ui.mobileCollapsedIds.length;
    return { total, afterCollapse, afterExpand };
  })()`, ctx);

  assert.equal(res.total, 4);
  assert.equal(res.afterCollapse, 4);
  assert.equal(res.afterExpand, 0);
});

test('Tentative / Pipeline toggle excludes tentative projects from totals and separates Committed vs Pipeline', () => {
  const res = vm.runInContext(`(() => {
    const db = createEmptyDB();
    db.departments = [{ id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 5, manager: '', dayRate: 600 }];
    db.projects = [
      { id: 'p1', name: 'Committed', code: 'COM', color: '#4f46e5', status: 'Active', priority: 'High', owner: '', budgetDays: 0, budgetCost: 0, tentative: false, archived: false },
      { id: 'p2', name: 'Pipeline', code: 'PIP', color: '#f59e0b', status: 'Planned', priority: 'Low', owner: '', budgetDays: 0, budgetCost: 0, tentative: true, archived: false },
    ];
    db.allocations['d1::p1::2026-W10'] = 3.0;
    db.allocations['d1::p2::2026-W10'] = 1.5;
    ui.filterProj = 'all';
    ui.includeTentative = true;
    const withPipe = getDeptTotalAllocatedFte('d1', '2026-W10', 'week', db);
    const splitOn = getDeptCommittedVsTentativeFte('d1', '2026-W10', 'week', db);
    ui.includeTentative = false;
    const withoutPipe = getDeptTotalAllocatedFte('d1', '2026-W10', 'week', db);
    const splitOff = getDeptCommittedVsTentativeFte('d1', '2026-W10', 'week', db);
    ui.includeTentative = true;
    return { withPipe, withoutPipe, splitOn, splitOff };
  })()`, ctx);

  assert.equal(res.withPipe, 4.5);
  assert.equal(res.withoutPipe, 3.0);
  assert.equal(res.splitOn.committed, 3.0);
  assert.equal(res.splitOn.tentative, 1.5);
  assert.equal(res.splitOff.tentative, 0);
});

test('Department day rates compute project cost burn & currency formatting accurately', () => {
  const res = vm.runInContext(`(() => {
    const raw = {
      settings: { daysPerWeek: 5, currency: '$' },
      departments: [
        { id: 'd1', name: 'Eng', code: 'ENG', defaultCapacity: 5, dayRate: 800 },
        { id: 'd2', name: 'Des', code: 'DES', defaultCapacity: 3, dayRate: 600 },
      ],
      projects: [{ id: 'p1', name: 'Nova', code: 'NVA', budgetCost: 50000, tentative: true }],
      allocations: { 'd1::p1::2026-W10': 2.0, 'd2::p1::2026-W10': 1.0 },
    };
    const mig = normalizeAndMigrateDB(raw);
    return {
      currency: mig.settings.currency,
      dayRate: mig.departments[0].dayRate,
      budgetCost: mig.projects[0].budgetCost,
      tentative: mig.projects[0].tentative,
      cost: getProjectTotalPlannedCost('p1', mig),
      formatted: formatCurrency(getProjectTotalPlannedCost('p1', mig), mig),
    };
  })()`, ctx);

  assert.equal(res.currency, '$');
  assert.equal(res.dayRate, 800);
  assert.equal(res.budgetCost, 50000);
  assert.equal(res.tentative, true);
  assert.equal(res.cost, 11000); // (2*5*800) + (1*5*600) = 8000 + 3000
  assert.equal(res.formatted, '$11k');
});

test('Grouped Variable Capacity Overrides merge contiguous identical weekly spans cleanly', () => {
  const res = vm.runInContext(`(() => {
    const db = createEmptyDB();
    db.departments = [{ id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 8.0, manager: '', dayRate: 0 }];
    db.capacityOverrides = {
      'd1::2026-W10': 9.5,
      'd1::2026-W11': 9.5,
      'd1::2026-W12': 9.5,
      'd1::2026-W13': 10.0,
      'd1::2026-W20': 6.0,
    };
    return getGroupedCapacityOverrides(db, 'all');
  })()`, ctx);

  assert.equal(res.length, 3);
  assert.equal(res[0].startWk, '2026-W10');
  assert.equal(res[0].endWk, '2026-W12');
  assert.equal(res[0].weekKeys.length, 3);
  assert.equal(res[0].deltaFte, 1.5);
  assert.equal(res[1].startWk, '2026-W13');
  assert.equal(res[1].fte, 10.0);
  assert.equal(res[2].deltaFte, -2.0);
});

test('Bottleneck Resolver ranks tentative/low-priority project first and computes accurate buffer & trim', () => {
  const res = vm.runInContext(`(() => {
    const db = createEmptyDB();
    db.departments = [{ id: 'd1', name: 'Eng', code: 'ENG', color: '#4f46e5', defaultCapacity: 5.0, manager: '', dayRate: 0 }];
    db.projects = [
      { id: 'p_crit', name: 'Core', code: 'COR', color: '#4f46e5', status: 'Active', priority: 'Critical', owner: '', budgetDays: 0, budgetCost: 0, tentative: false, archived: false },
      { id: 'p_pipe', name: 'Proposal', code: 'PRP', color: '#f59e0b', status: 'Planned', priority: 'High', owner: '', budgetDays: 0, budgetCost: 0, tentative: true, archived: false },
    ];
    db.allocations['d1::p_crit::2026-W10'] = 4.0;
    db.allocations['d1::p_pipe::2026-W10'] = 2.0;
    ui.includeTentative = true;
    ui.filterProj = 'all';
    return computeBottleneckOptions('d1', '2026-W10', 'week', db);
  })()`, ctx);

  assert.equal(res.pct, 120);
  assert.equal(res.excessFte, 1.0);
  assert.equal(res.candidate.proj.id, 'p_pipe');
  assert.equal(res.trimTargetFte, 1.0);
  assert.equal(res.afterTrimPct, 100);
  assert.equal(res.bufferCapFte, 6.0);
  assert.equal(res.afterBufferPct, 100);
});

test('Multi-mode CSV parsers handle Variable Capacities and Milestones cleanly', () => {
  const res = vm.runInContext(`(() => {
    const db = createSampleDemoDB();
    const caps = parseDelimitedCapacities('Dept, Period, Capacity\\nENG, 2026-W10, 9.5\\nDES, 2026-02, 2.5\\nBAD, 2026-W10, 5', 'fte', db);
    const ms = parseDelimitedMilestones('Project, Title, TargetDate, BaselineDate, Dept, Status\\nNVA, Launch Gate, 2026-06-15, 2026-06-01, ENG, At Risk\\nBAD, X, 2026-06-15', db);
    return { caps, ms };
  })()`, ctx);

  assert.equal(res.caps.valid.length, 2);
  assert.equal(res.caps.errors.length, 1);
  assert.equal(res.caps.valid[0].fte, 9.5);
  assert.equal(res.ms.valid.length, 1);
  assert.equal(res.ms.errors.length, 1);
  assert.equal(res.ms.valid[0].title, 'Launch Gate');
  assert.equal(res.ms.valid[0].status, 'At Risk');
});

test('Duplicate Project & Executive Briefing copy produce accurate results and PWA manifest link exists', () => {
  const res = vm.runInContext(`(() => {
    const db = createSampleDemoDB();
    const beforeCount = db.projects.length;
    const dup = duplicateProject('p_nova', { name: 'Nova Phase 2', code: 'NV2', copyAllocations: true, copyMilestones: true, tentative: true }, db);
    const briefing = buildExecutiveBriefingText(db);
    return {
      beforeCount,
      afterCount: db.projects.length,
      dupCode: dup.project.code,
      dupTentative: dup.project.tentative,
      copiedAllocs: dup.copiedAllocs,
      copiedMs: dup.copiedMs,
      hasBriefingHeader: briefing.includes('PULSEPLAN EXECUTIVE BRIEFING'),
      hasBottlenecksSec: briefing.includes('BOTTLENECKS'),
    };
  })()`, ctx);

  assert.equal(res.afterCount, res.beforeCount + 1);
  assert.equal(res.dupCode, 'NV2');
  assert.equal(res.dupTentative, true);
  assert.ok(res.copiedAllocs > 0);
  assert.ok(res.copiedMs > 0);
  assert.equal(res.hasBriefingHeader, true);
  assert.equal(res.hasBottlenecksSec, true);
  assert.equal(html.includes('<link rel="manifest" href="./manifest.webmanifest" />'), true);
});

test('End-to-end DOM render smoke test across all tabs, subtabs, views, and modals (zero ReferenceErrors)', () => {
  const bodyHtml = fs.readFileSync('src/html/body.html', 'utf8');
  const domIds = [...new Set([...bodyHtml.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))];
  const elMap = new Map();
  const makeStatefulEl = (id) => {
    const attrs = new Map();
    const classes = new Set();
    const el = {
      id,
      tagName: 'DIV',
      style: { setProperty: noop },
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      checked: false,
      disabled: false,
      open: false,
      options: [],
      dataset: {},
      clientWidth: 1200,
      scrollLeft: 0,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined) { if (classes.has(x)) classes.delete(x); else classes.add(x); } else if (f) classes.add(x); else classes.delete(x); },
        contains: (x) => classes.has(x),
      },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) ?? null,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: noop,
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: noop,
      remove: noop,
      focus: noop,
      select: noop,
      showModal: () => { el.open = true; },
      close: () => { el.open = false; },
      closest: () => null,
      scrollTo: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 400, bottom: 400 }),
    };
    return el;
  };
  domIds.forEach(id => elMap.set(id, makeStatefulEl(id)));

  const prevGetById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) elMap.set(id, makeStatefulEl(id));
    return elMap.get(id);
  };
  try {
    const out = vm.runInContext(`(() => {
      liveDB = createSampleDemoDB();
      ui.demoMode = false;
      ui.whatIfMode = false;
      ui.timeUnit = 'month';
      ui.horizon = 4;

      // Roadmap desktop + mobile across all 3 axes
      window.innerWidth = 1440;
      ui.activeTab = 'matrix';
      ['department', 'project', 'timeline'].forEach(ax => { ui.axis = ax; renderAll(); });
      window.innerWidth = 375;
      ui.mobileLayoutMode = 'cards';
      ['department', 'project', 'timeline'].forEach(ax => { ui.axis = ax; renderAll(); });

      // Health desktop + mobile + all 5 snapshot compare subtabs
      window.innerWidth = 1440;
      ui.activeTab = 'health';
      ui.compareSnapshotId = liveDB.snapshots[0].id;
      renderAll();
      ['deptPeriod', 'project', 'cells', 'milestones', 'capacity'].forEach(st => { ui.compareSubTab = st; renderSnapshotComparison(); });
      selectHealthChartBar(0);

      // Setup & Data tab across all 4 subtabs (verify Depts, Overrides w/ dates, Projects, Milestones ALL populate!)
      ui.activeTab = 'data';
      ['departments', 'projects', 'milestones', 'settings'].forEach(sub => { ui.dataSubTab = sub; renderAll(); });
      const deptsHtml = document.getElementById('dataDepartmentsBody').innerHTML;
      const overridesHtml = document.getElementById('dataCapacityOverridesTable').innerHTML;
      const projsHtml = document.getElementById('dataProjectsBody').innerHTML;
      const msHtml = document.getElementById('dataMilestonesBody').innerHTML;

      // Sync tab + key modals
      ui.activeTab = 'sync';
      renderAll();
      openDeptModal('d_eng');
      openProjectModal('p_nova');
      openMilestoneModal('ms_1');
      openAllocationModal('d_eng', 'p_nova', ui.startMonth);
      openCapacityModal('d_eng', ui.startMonth);
      const capModalHtml = document.getElementById('modalCard').innerHTML;
      ui.axis = 'department';
      openCellDetailModal('d_eng', ui.startMonth);
      ui.axis = 'timeline';
      openCellDetailModal('p_nova', ui.startMonth);
      openBottleneckResolverModal('d_eng', addMonthsToMonthKey(ui.startMonth, 1));
      openSyncConflictModal({ lastModifiedBy: 'Elena', revision: 9 }, Date.now(), createSampleDemoDB());
      openCsvImportModal('allocations');
      openCsvImportModal('capacities');
      openCsvImportModal('milestones');
      openDuplicateProjectModal('p_nova');
      openManualModal();
      closeModal();

      return { deptsHtml, overridesHtml, projsHtml, msHtml, capModalHtml };
    })()`, ctx);

    assert.ok(out.deptsHtml.includes('Engineering'), 'Departments table rendered');
    assert.ok(out.overridesHtml.includes('9.5 FTE'), 'Variable capacity overrides panel rendered');
    assert.ok(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/.test(out.overridesHtml), 'Overrides panel includes calendar date range beside week numbers');
    assert.ok(out.projsHtml.includes('Project Nova'), 'Projects table rendered');
    assert.ok(out.msHtml.includes('Nova Beta Cut'), 'Milestones table rendered');
    assert.ok(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/.test(out.capModalHtml), 'Capacity modal active overrides include calendar date range');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

test('Desktop shared database file open (attachAndLoadFileHandle) loads legacy v2 JSON, clears What-If/Demo, and recovers cleanly from parse errors', async () => {
  const prevShowToast = sandbox.showToast;
  const prevGetById = sandbox.document.getElementById;
  const toasts = [];
  const elMap = new Map();
  sandbox.showToast = (msg, type) => toasts.push({ msg, type });
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) {
      const el = makeStubEl();
      el.id = id;
      el.options = [];
      el.dataset = {};
      el.clientWidth = 1200;
      el.scrollLeft = 0;
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1200, height: 400, bottom: 400 });
      elMap.set(id, el);
    }
    return elMap.get(id);
  };
  try {
    const legacyJson = '\uFEFF' + JSON.stringify({
      meta: { version: 2, revision: 12, lastModifiedBy: 'Marco', lastModifiedAt: '2026-06-01T10:00:00Z' },
      settings: { daysPerWeek: 5, hoursPerDay: 8, warnThreshold: 85, overThreshold: 100 },
      departments: [{ id: 'd_eng', name: 'Engineering', code: 'ENG', color: '#4f46e5', defaultCapacity: 8 }],
      projects: [{ id: 'p_alpha', name: 'Alpha', code: 'ALP', color: '#0ea5e9', status: 'Active', priority: 'High' }],
      allocations: { 'd_eng::p_alpha::2026-W20': 2.5 },
      capacityOverrides: { 'd_eng::2026-W20': 6 },
      comments: { 'd_eng::p_alpha::2026-W20': 'Kickoff' },
      milestones: [{ id: 'm1', title: 'Gate 1', projectId: 'p_alpha', deptId: 'd_eng', date: '2026-05-15', status: 'Pending' }],
      snapshots: [],
      changeLog: [],
    });

    const validHandle = {
      name: 'company_roadmap.json',
      async getFile() {
        return { lastModified: Date.now(), async text() { return legacyJson; } };
      },
    };
    const badJsonHandle = {
      name: 'corrupted.json',
      async getFile() {
        return { lastModified: Date.now(), async text() { return '{ broken json'; } };
      },
    };

    sandbox.__testValidHandle = validHandle;
    sandbox.__testBadHandle = badJsonHandle;

    const res = await vm.runInContext(`(async () => {
      ui.demoMode = true;
      ui.whatIfMode = true;
      whatIfDB = createSampleDemoDB();
      ui.activeTab = 'data';
      await attachAndLoadFileHandle(__testValidHandle, false, false);
      const afterValid = {
        demoMode: ui.demoMode,
        whatIfMode: ui.whatIfMode,
        whatIfNull: whatIfDB === null,
        linkedName: linkedFileHandle && linkedFileHandle.name,
        deptCount: liveDB.departments.length,
        projCount: liveDB.projects.length,
        reloadingFlag: isReloadingFromFile,
      };
      await attachAndLoadFileHandle(__testBadHandle, false, false);
      const afterBad = {
        reloadingFlag: isReloadingFromFile,
        stillHasLiveDepts: liveDB.departments.length,
      };
      stopFilePolling();
      linkedFileHandle = null;
      rememberedFileHandle = null;
      return { afterValid, afterBad };
    })()`, ctx);

    assert.equal(res.afterValid.demoMode, false, 'Connecting shared file exits Demo mode');
    assert.equal(res.afterValid.whatIfMode, false, 'Connecting shared file exits What-If mode');
    assert.equal(res.afterValid.whatIfNull, true, 'Connecting shared file clears whatIfDB');
    assert.equal(res.afterValid.linkedName, 'company_roadmap.json', 'File handle is linked');
    assert.equal(res.afterValid.deptCount, 1, 'Legacy v2 departments loaded');
    assert.equal(res.afterValid.projCount, 1, 'Legacy v2 projects loaded');
    assert.equal(res.afterValid.reloadingFlag, false, 'isReloadingFromFile resets after valid load');
    assert.equal(res.afterBad.reloadingFlag, false, 'isReloadingFromFile resets even after parse error');
    assert.equal(res.afterBad.stillHasLiveDepts, 1, 'Corrupted file does not wipe existing liveDB');
    assert.ok(toasts.some(t => t.type === 'success' && t.msg.includes('company_roadmap.json')), 'Shows success toast on valid load');
    assert.ok(toasts.some(t => t.type === 'error' && t.msg.includes('corrupted.json')), 'Shows specific filename & error on parse failure');
  } finally {
    delete sandbox.__testValidHandle;
    delete sandbox.__testBadHandle;
    sandbox.showToast = prevShowToast;
    sandbox.document.getElementById = prevGetById;
  }
});

test('Mobile web-app meta tag, hung IndexedDB resilience, policy auto-abort detection, and debug log reporting', async () => {
  assert.ok(html.includes('<meta name="mobile-web-app-capable" content="yes" />'), 'index.html includes modern mobile-web-app-capable meta tag');
  assert.ok(!html.includes('apple-mobile-web-app-capable'), 'index.html removes deprecated apple-mobile-web-app-capable meta tag');

  const prevShowToast = sandbox.showToast;
  const prevIDB = sandbox.indexedDB;
  const prevOpenPicker = sandbox.window.showOpenFilePicker;
  const prevSavePicker = sandbox.window.showSaveFilePicker;
  const prevLoc = sandbox.location;
  const toasts = [];
  sandbox.showToast = (msg, type, opts) => toasts.push({ msg, type, opts });
  // Simulate a corporate laptop where indexedDB.open() hangs indefinitely (never fires onsuccess/onerror)
  sandbox.indexedDB = { open: () => ({}) };
  sandbox.location = { protocol: 'https:', origin: 'https://mfo78.github.io', hostname: 'mfo78.github.io' };
  // Simulate an enterprise browser policy that immediately auto-aborts showOpenFilePicker in < 200ms
  sandbox.window.showOpenFilePicker = async () => {
    const err = new Error('Blocked by enterprise policy');
    err.name = 'AbortError';
    throw err;
  };
  sandbox.window.showSaveFilePicker = async () => { throw new Error('unused'); };

  try {
    const t0 = Date.now();
    const out = await vm.runInContext(`(async () => {
      clearDebugLog();
      await openSharedDatabaseFile();
      const report = formatDebugReport();
      return { report };
    })()`, ctx);
    const elapsed = Date.now() - t0;

    assert.ok(elapsed < 1000, `openSharedDatabaseFile did not hang (${elapsed}ms)`);
    assert.ok(toasts.some(t => t.type === 'warning' && t.msg.includes('Chrome 158+') && t.msg.includes('Import JSON') && t.opts?.actionLabel === 'Import JSON'), 'AbortError provides Chrome 158+ warning toast with one-click Import JSON action button');
    assert.ok(out.report.includes('PulsePlan Diagnostics Report'), 'formatDebugReport outputs structured header');
    assert.ok(out.report.includes('showOpenFilePicker AbortError'), 'Debug log records AbortError diagnostics');
  } finally {
    sandbox.showToast = prevShowToast;
    sandbox.indexedDB = prevIDB;
    sandbox.window.showOpenFilePicker = prevOpenPicker;
    sandbox.window.showSaveFilePicker = prevSavePicker;
    sandbox.location = prevLoc;
  }
});

test('Connected File full-path formatting & Sync tab display (Windows Copy-as-path quotes, folder prefix, runtime file.path)', () => {
  const prevGetById = sandbox.document.getElementById;
  const elMap = new Map();
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) {
      const el = makeStubEl();
      el.id = id;
      el.options = [];
      el.dataset = {};
      elMap.set(id, el);
    }
    return elMap.get(id);
  };
  try {
    const out = vm.runInContext(`(() => {
      const p1 = formatLinkedFileFullPath('roadmap.json', 'G:\\\\My Drive\\\\PulsePlan');
      const p2 = formatLinkedFileFullPath('roadmap.json', 'G:\\\\My Drive\\\\PulsePlan\\\\');
      const p3 = formatLinkedFileFullPath('roadmap.json', '"G:\\\\My Drive\\\\PulsePlan\\\\roadmap.json"');
      const p4 = formatLinkedFileFullPath('roadmap.json', '/Users/marco/Drive/PulsePlan');
      const p5 = formatLinkedFileFullPath('roadmap.json', '');

      ui.linkedFilePaths = { 'roadmap.json': p3 };
      linkedFileHandle = { name: 'roadmap.json' };
      linkedFileDetectedPath = '';
      renderSyncTab();
      const statusHtml = document.getElementById('syncFileStatusBox').innerHTML;

      linkedFileDetectedPath = 'C:\\\\Runtime\\\\Path\\\\roadmap.json';
      const runtimeDisplay = getConnectedFileDisplayPath('roadmap.json');

      linkedFileHandle = null;
      linkedFileDetectedPath = '';
      ui.linkedFilePaths = {};
      return { p1, p2, p3, p4, p5, statusHtml, runtimeDisplay };
    })()`, ctx);

    assert.equal(out.p1, 'G:\\My Drive\\PulsePlan\\roadmap.json', 'Appends filename with backslash for Windows folder');
    assert.equal(out.p2, 'G:\\My Drive\\PulsePlan\\roadmap.json', 'Handles trailing backslash without doubling');
    assert.equal(out.p3, 'G:\\My Drive\\PulsePlan\\roadmap.json', 'Strips Windows Copy-as-path quotes and does not duplicate filename');
    assert.equal(out.p4, '/Users/marco/Drive/PulsePlan/roadmap.json', 'Uses forward slash for Unix/macOS paths');
    assert.equal(out.p5, 'roadmap.json', 'Falls back to bare filename when path empty');
    assert.equal(out.runtimeDisplay, 'C:\\Runtime\\Path\\roadmap.json', 'Prefers runtime-detected file.path when available');
    assert.ok(out.statusHtml.includes('G:\\My Drive\\PulsePlan\\roadmap.json'), 'Sync tab Connected File displays full path');
    assert.ok(out.statusHtml.includes('Edit path'), 'Sync tab offers Edit path button');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

test('Timeline/Gantt respects all 4 colour schemes (accent, fill, fte, fte3) on desktop & mobile, and mobile clears stale Esc status strip', () => {
  const prevGetById = sandbox.document.getElementById;
  const elMap = new Map();
  const makeTrackedEl = (id) => {
    const classes = new Set();
    const el = {
      id,
      innerHTML: '',
      textContent: '',
      value: '',
      checked: false,
      disabled: false,
      options: [],
      dataset: {},
      style: { setProperty: noop },
      clientWidth: 1200,
      scrollLeft: 0,
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined) { if (classes.has(x)) classes.delete(x); else classes.add(x); } else if (f) classes.add(x); else classes.delete(x); },
        contains: (x) => classes.has(x),
      },
      setAttribute: noop,
      getAttribute: () => null,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: noop,
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: noop,
      remove: noop,
      focus: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 400, bottom: 400 }),
    };
    return el;
  };
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) elMap.set(id, makeTrackedEl(id));
    return elMap.get(id);
  };
  try {
    const out = vm.runInContext(`(() => {
      liveDB = createSampleDemoDB();
      ui.demoMode = false;
      ui.whatIfMode = false;
      ui.activeTab = 'matrix';
      ui.axis = 'timeline';
      ui.timeUnit = 'month';
      ui.horizon = 4;
      ui.startMonth = getCurrentMonthKey();
      ui.startWeek = getCurrentWeekKey();
      ui.filterDept = 'all';
      ui.filterProj = 'all';
      ui.matrixSearch = '';
      ui.filterOverOnly = false;
      ui.filterAtRiskOnly = false;
      ui.filterHasNotesOnly = false;
      ui.hideEmptyRows = false;
      ui.includeTentative = true;
      ui.spotlightProjId = '';

      // Desktop Timeline across all 4 colour modes
      window.innerWidth = 1440;
      ui.cellColorMode = 'accent'; renderMatrix();
      const dAccent = document.getElementById('matrixWrapper').innerHTML;
      ui.cellColorMode = 'fill'; renderMatrix();
      const dFill = document.getElementById('matrixWrapper').innerHTML;
      ui.cellColorMode = 'fte'; renderMatrix();
      const dFte = document.getElementById('matrixWrapper').innerHTML;
      ui.cellColorMode = 'fte3'; renderMatrix();
      const dFte3 = document.getElementById('matrixWrapper').innerHTML;

      // Mobile Timeline across all 4 colour modes
      window.innerWidth = 375;
      ui.mobileLayoutMode = 'cards';
      ui.cellColorMode = 'accent'; renderMobileMatrixCards();
      const mAccent = document.getElementById('mobileMatrixDeck').innerHTML;
      ui.cellColorMode = 'fill'; renderMobileMatrixCards();
      const mFill = document.getElementById('mobileMatrixDeck').innerHTML;
      ui.cellColorMode = 'fte'; renderMobileMatrixCards();
      const mFte = document.getElementById('mobileMatrixDeck').innerHTML;
      ui.cellColorMode = 'fte3'; renderMobileMatrixCards();
      const mFte3 = document.getElementById('mobileMatrixDeck').innerHTML;

      // Mobile Grid Spotlight shows statusStrip with responsive (Esc), then switching to Cards clears/hides statusStrip
      ui.mobileLayoutMode = 'grid';
      ui.spotlightProjId = 'p_nova';
      renderAll();
      const stripHtmlOnGrid = document.getElementById('matrixStatusStrip').innerHTML;
      const stripHiddenOnGrid = document.getElementById('matrixStatusStrip').classList.contains('hidden');

      ui.mobileLayoutMode = 'cards';
      renderAll();
      const stripHiddenOnCards = document.getElementById('matrixStatusStrip').classList.contains('hidden');
      const stripHtmlOnCards = document.getElementById('matrixStatusStrip').innerHTML;
      const deckWithSpot = document.getElementById('mobileMatrixDeck').innerHTML;

      ui.spotlightProjId = '';
      renderAll();
      const deckAfterClear = document.getElementById('mobileMatrixDeck').innerHTML;

      return { dAccent, dFill, dFte, dFte3, mAccent, mFill, mFte, mFte3, stripHtmlOnGrid, stripHiddenOnGrid, stripHiddenOnCards, stripHtmlOnCards, deckWithSpot, deckAfterClear };
    })()`, ctx);

    assert.ok(out.dAccent.includes('timeline-bar-accent'), 'Desktop Timeline Accent mode uses timeline-bar-accent');
    assert.ok(!out.dFill.includes('timeline-bar-accent') && out.dFill.includes('background-color:'), 'Desktop Timeline Fill mode uses full project colour fill');
    assert.ok(out.dFte.includes('cap') && (out.dFte.includes('ring-1 ring-white/75') || out.dFte.includes('ring-1 ring-white/70')), 'Desktop Timeline By FTE mode renders heat colour + project identity dot');
    assert.ok(out.dFte3.includes('●') || out.dFte3.includes('▲') || out.dFte3.includes('‼'), 'Desktop Timeline 3-Level mode renders demand tier symbol');

    assert.ok(out.mAccent.includes('timeline-bar-accent'), 'Mobile Timeline Accent mode uses timeline-bar-accent');
    assert.ok(!out.mFill.includes('timeline-bar-accent') && out.mFill.includes('opacity:'), 'Mobile Timeline Fill mode uses full project colour fill');
    assert.ok(out.mFte.includes('% cap'), 'Mobile Timeline By FTE mode renders FTE heat scale + % cap tooltip');
    assert.ok(out.mFte3.includes('●') || out.mFte3.includes('▲') || out.mFte3.includes('‼'), 'Mobile Timeline 3-Level mode renders demand tier symbol');

    assert.equal(out.stripHiddenOnGrid, false, 'Status strip shows in Grid mode when Spotlight is active');
    assert.ok(out.stripHtmlOnGrid.includes('hidden md:inline'), 'Esc keyboard hint is hidden on mobile viewports');
    assert.equal(out.stripHiddenOnCards, true, 'Switching to Mobile Cards hides desktop status strip so it never gets stuck');
    assert.equal(out.stripHtmlOnCards, '', 'Desktop status strip HTML is cleared in Mobile Cards mode');
    assert.ok(out.deckWithSpot.includes('Clear Spotlight') && !out.deckWithSpot.includes('Esc'), 'Mobile Spotlight banner has 1-tap Clear Spotlight button without Esc text');
    assert.ok(!out.deckAfterClear.includes('Clear Spotlight'), 'Clearing spotlight removes mobile spotlight banner cleanly');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

test('Genuine PWA manifest PNG icons, fluid full-width 4K layout, and promptPwaInstall flow', async () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  const has192 = manifest.icons.some(i => i.src === './icon-192.png' && i.sizes === '192x192' && i.type === 'image/png');
  const has512 = manifest.icons.some(i => i.src === './icon-512.png' && i.sizes === '512x512' && i.type === 'image/png');
  const hasMaskable = manifest.icons.some(i => i.src === './icon-maskable-512.png' && i.purpose === 'maskable');
  assert.ok(has192 && has512 && hasMaskable, 'manifest.webmanifest declares 192x192, 512x512, and maskable PNG icons');
  assert.ok(fs.existsSync('icon-192.png'), 'icon-192.png exists on disk');
  assert.ok(fs.existsSync('icon-512.png'), 'icon-512.png exists on disk');
  assert.ok(fs.existsSync('icon-maskable-512.png'), 'icon-maskable-512.png exists on disk');
  assert.ok(html.includes('href="./icon-192.png"'), 'index.html references ./icon-192.png apple-touch-icon');
  assert.ok(!html.includes('max-w-[1600px]'), 'index.html uses fluid full-width layout without max-w-[1600px] 4K sidebars');

  const prevGetById = sandbox.document.getElementById;
  const elMap = new Map();
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) {
      const classes = new Set(['hidden']);
      const el = makeStubEl();
      el.id = id;
      el.classList = {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined) { if (classes.has(x)) classes.delete(x); else classes.add(x); } else if (f) classes.add(x); else classes.delete(x); },
        contains: (x) => classes.has(x),
      };
      elMap.set(id, el);
    }
    return elMap.get(id);
  };
  try {
    const res = await vm.runInContext(`(async () => {
      let promptCalled = 0;
      deferredPwaPrompt = {
        prompt: async () => { promptCalled++; },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };
      updatePwaInstallUI();
      const hdrVisibleWhenReady = !document.getElementById('pwaInstallHeaderBtn').classList.contains('hidden');
      const chipWhenReady = document.getElementById('pwaInstallMenuChip').textContent;

      await promptPwaInstall();
      const hdrHiddenAfterPrompt = document.getElementById('pwaInstallHeaderBtn').classList.contains('hidden');

      // Fallback when no deferred prompt: opens manual install guide modal
      await promptPwaInstall();
      const guideHtml = document.getElementById('modalCard').innerHTML;
      closeModal();
      return { promptCalled, hdrVisibleWhenReady, chipWhenReady, hdrHiddenAfterPrompt, guideHtml };
    })()`, ctx);

    assert.equal(res.promptCalled, 1, 'Native beforeinstallprompt.prompt() is invoked when available');
    assert.equal(res.hdrVisibleWhenReady, true, 'Header Install button reveals when beforeinstallprompt is captured');
    assert.equal(res.chipWhenReady, 'Ready', 'Workspace menu Install chip shows Ready');
    assert.equal(res.hdrHiddenAfterPrompt, true, 'Header Install button hides after prompt completes');
    assert.ok(res.guideHtml.includes('Install PulsePlan App (PWA)'), 'Fallback opens Install PWA guide modal');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

test('Standard (1-6) vs Simplified Overview (12/18/24), shiftStartByInterval, and 4K column geometry', () => {
  const prevGetById = sandbox.document.getElementById;
  const elMap = new Map();
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) {
      const classes = new Set();
      const el = makeStubEl();
      el.id = id;
      el.clientWidth = 1400;
      el.options = [];
      el.dataset = {};
      el.classList = {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined) { if (classes.has(x)) classes.delete(x); else classes.add(x); } else if (f) classes.add(x); else classes.delete(x); },
        contains: (x) => classes.has(x),
      };
      elMap.set(id, el);
    }
    return elMap.get(id);
  };
  try {
    const out = vm.runInContext(`(() => {
      liveDB = createSampleDemoDB();
      ui.demoMode = false;
      ui.whatIfMode = false;
      ui.activeTab = 'matrix';
      ui.timeUnit = 'month';
      ui.startMonth = '2026-01';
      ui.horizon = 6;
      shiftStartByInterval(1);
      const afterFwd6 = ui.startMonth;
      shiftStartByInterval(-1);
      const afterBack6 = ui.startMonth;

      // Legacy horizon snapping (8 -> 12, 16 -> 18)
      ui.horizon = 8;
      const snap8 = getActiveHorizon();
      ui.horizon = 16;
      const snap16 = getActiveHorizon();

      // Geometry on Laptop (1400px) & 4K (3700px) for Standard 6 and Overview 12 / 18 / 24
      const gStd6Laptop = computeFullColumnGeometry(1400, 6, false, false);
      const gOv12Laptop = computeFullColumnGeometry(1400, 12, false, false);
      const gOv18Laptop = computeFullColumnGeometry(1400, 18, false, false);
      const gOv24Laptop = computeFullColumnGeometry(1400, 24, false, false);
      const gOv24FourK = computeFullColumnGeometry(3700, 24, false, false);

      // Render 12-month Simplified Overview across By Dept, By Project, and Timeline
      window.innerWidth = 1440;
      ui.startMonth = getCurrentMonthKey();
      ui.horizon = 12;
      ui.compactRowLabels = false;
      ui.cellColorMode = 'fill';
      ui.axis = 'department'; renderMatrix();
      const ovDeptHtml = document.getElementById('matrixWrapper').innerHTML;
      const ovStripHtml = document.getElementById('matrixStatusStrip').innerHTML;
      ui.axis = 'project'; renderMatrix();
      const ovProjHtml = document.getElementById('matrixWrapper').innerHTML;
      ui.axis = 'timeline'; renderMatrix();
      const ovTlHtml = document.getElementById('matrixWrapper').innerHTML;

      return { afterFwd6, afterBack6, snap8, snap16, gStd6Laptop, gOv12Laptop, gOv18Laptop, gOv24Laptop, gOv24FourK, ovDeptHtml, ovStripHtml, ovProjHtml, ovTlHtml };
    })()`, ctx);

    assert.equal(out.afterFwd6, '2026-07', 'shiftStartByInterval(+1) with 6-month horizon jumps +6 months');
    assert.equal(out.afterBack6, '2026-01', 'shiftStartByInterval(-1) jumps back -6 months');
    assert.equal(out.snap8, 12, 'Legacy horizon 8 snaps cleanly to 12 (Overview)');
    assert.equal(out.snap16, 18, 'Legacy horizon 16 snaps cleanly to 18 (Overview)');
    assert.equal(out.gStd6Laptop.visibleCols, 6, 'Standard 6 periods all fit on 1400px desktop');
    assert.equal(out.gOv12Laptop.visibleCols, 12, 'Overview 12 periods all fit simultaneously on 1400px desktop');
    assert.equal(out.gOv18Laptop.visibleCols, 18, 'Overview 18 periods all fit simultaneously on 1400px desktop');
    assert.equal(out.gOv24Laptop.visibleCols, 24, 'Overview 24 periods all fit simultaneously on 1400px desktop');
    assert.equal(out.gOv24FourK.visibleCols, 24, 'Overview 24 periods fit on 4K with generous columns');
    assert.ok(out.gOv24FourK.colW > 130, '4K display scales Overview 24 columns > 130px wide');
    assert.ok(out.ovStripHtml.includes('Simplified Overview') && out.ovStripHtml.includes('Standard (6)'), 'Overview displays status banner with 1-click Standard (6) return button');
    assert.ok(out.ovDeptHtml.includes('data-period-count="12"') && out.ovDeptHtml.includes('shiftStartByInterval'), 'Overview By Dept renders 12 compact columns + interval jump buttons');
    assert.ok(out.ovProjHtml.includes('data-period-count="12"'), 'Overview By Project renders 12 compact columns');
    assert.ok(out.ovTlHtml.includes('timeline-bar-overview'), 'Overview Timeline renders compact continuous overview Gantt bars');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

test('Enhanced Timeline bars, Rich Detailed Row Labels, and Welcome & Setup Splash Screen', () => {
  const prevGetById = sandbox.document.getElementById;
  const elMap = new Map();
  sandbox.document.getElementById = (id) => {
    if (!elMap.has(id)) {
      const classes = new Set(['hidden']);
      const el = makeStubEl();
      el.id = id;
      el.clientWidth = 1440;
      el.options = [];
      el.dataset = {};
      el.classList = {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined) { if (classes.has(x)) classes.delete(x); else classes.add(x); } else if (f) classes.add(x); else classes.delete(x); },
        contains: (x) => classes.has(x),
      };
      elMap.set(id, el);
    }
    return elMap.get(id);
  };
  try {
    const out = vm.runInContext(`(() => {
      liveDB = createSampleDemoDB();
      ui.demoMode = false;
      ui.whatIfMode = false;
      ui.activeTab = 'matrix';
      ui.timeUnit = 'month';
      ui.startMonth = getCurrentMonthKey();
      ui.horizon = 4;
      ui.cellColorMode = 'fill';
      window.innerWidth = 1440;

      // Rich Detailed Row Labels in By Dept
      ui.compactRowLabels = false;
      ui.axis = 'department'; renderMatrix();
      const deptDetailed = document.getElementById('matrixWrapper').innerHTML;

      // Rich Detailed Row Labels + Enhanced 2-row Timeline bars with larger text-[11px] dept chips
      ui.axis = 'timeline'; renderMatrix();
      const tlDetailed = document.getElementById('matrixWrapper').innerHTML;

      // Vertical Row Labels in Timeline uses tighter .timeline-vertical-text
      ui.compactRowLabels = true;
      renderMatrix();
      const tlVertical = document.getElementById('matrixWrapper').innerHTML;

      // Welcome Splash Screen open + dismiss with name & welcomeSeen persistence
      ui.welcomeSeen = false;
      openWelcomeModal(true);
      const welcomeHtml = document.getElementById('modalCard').innerHTML;
      const modalOpen = !document.getElementById('modalOverlay').classList.contains('hidden');
      document.getElementById('welcomeUserNameInput').value = 'Marco Formaggi';
      document.getElementById('welcomeDontShowAgain').checked = true;
      dismissWelcomeModal();
      const seenAfter = ui.welcomeSeen;
      const userAfter = ui.userName;
      const modalClosedAfter = document.getElementById('modalOverlay').classList.contains('hidden');

      return { deptDetailed, tlDetailed, tlVertical, welcomeHtml, modalOpen, seenAfter, userAfter, modalClosedAfter };
    })()`, ctx);

    assert.ok(out.deptDetailed.includes('Peak ') && out.deptDetailed.includes('Elena Rostova') && out.deptDetailed.includes('proj'), 'Detailed By Dept row label displays Peak %, Manager, and active project count');
    assert.ok(out.tlDetailed.includes('timeline-bar-std') && out.tlDetailed.includes('text-[11px] font-bold'), 'Standard Timeline renders enhanced 2-row bar with readable 11px department chips');
    assert.ok(out.tlDetailed.includes('Budget') && out.tlDetailed.includes('S. Chen') && out.tlDetailed.includes('depts'), 'Detailed Timeline/Project row label displays Budget bar, Owner, Priority, and active dept count');
    assert.ok(out.tlVertical.includes('timeline-vertical-text'), 'Vertical Timeline row header uses tighter .timeline-vertical-text');
    assert.equal(out.modalOpen, true, 'openWelcomeModal opens splash screen dialog');
    assert.ok(out.welcomeHtml.includes('Welcome to PulsePlan') && out.welcomeHtml.includes('Explore Demo Sandbox') && out.welcomeHtml.includes('Load Shared Database'), 'Welcome modal renders greeting and guided setup paths');
    assert.equal(out.seenAfter, true, 'dismissWelcomeModal persists ui.welcomeSeen = true');
    assert.equal(out.userAfter, 'Marco Formaggi', 'dismissWelcomeModal saves display name');
    assert.equal(out.modalClosedAfter, true, 'dismissWelcomeModal closes dialog cleanly');
  } finally {
    sandbox.document.getElementById = prevGetById;
  }
});

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    await t.fn();
    console.log(`✅ PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${t.name}\n   ${err.message}`);
    failed++;
  }
}

console.log(`\nSummary: ${passed}/${tests.length} tests passed${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
