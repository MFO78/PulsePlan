    /* ============================================================================
     * 14. POWER TOOLS: SHIFT PROJECT, HOLIDAYS, WHAT-IF, SAVED VIEWS, CSV IMPORT
     * ============================================================================ */

    /* ---------- 14A. Shift Project Schedule (±N Weeks / Months) ---------- */

    function shiftISODateByMonths(isoDate, deltaMonths) {
      if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
      const d = parseISODate(isoDate);
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + (parseInt(deltaMonths, 10) || 0));
      const maxDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, maxDay));
      return dateToISODate(d);
    }

    function computeWeekDeltaForMonthShift(anchorWeekKey, deltaMonths) {
      const srcMonth = getWeekOwningMonth(anchorWeekKey);
      const dstMonth = addMonthsToMonthKey(srcMonth, deltaMonths);
      const srcWks = getWeeksInMonth(srcMonth);
      const dstWks = getWeeksInMonth(dstMonth);
      const srcMon = isoWeekKeyToMonday(srcWks[0] || anchorWeekKey);
      const dstMon = isoWeekKeyToMonday(dstWks[0] || anchorWeekKey);
      return Math.round((dstMon - srcMon) / (7 * 86400000));
    }

    function shiftProjectSchedule(projId, delta, unit = 'week', opts = {}, db = getActiveDB()) {
      const shiftNum = parseInt(delta, 10) || 0;
      if (!projId || shiftNum === 0 || !db) return { movedAllocs: 0, movedComments: 0, movedMilestones: 0 };

      const shiftMilestones = opts.shiftMilestones !== false;
      const shiftBaseline = Boolean(opts.shiftBaseline);
      const shiftComments = opts.shiftComments !== false;

      // Collect existing project allocations
      const projAllocEntries = [];
      Object.entries(db.allocations || {}).forEach(([k, v]) => {
        const parts = k.split('::');
        if (parts[1] === projId && /^\d{4}-W\d{2}$/.test(parts[2])) {
          projAllocEntries.push({ key: k, deptId: parts[0], weekKey: parts[2], fte: Number(v) || 0 });
        }
      });

      // Compute exact lossless week delta (1-to-1 bijection across ISO weeks)
      let weekDelta = shiftNum;
      if (unit === 'month') {
        const sortedWks = projAllocEntries.map(e => e.weekKey).sort();
        const anchorWk = sortedWks[0] || ui.startWeek || getCurrentWeekKey();
        weekDelta = computeWeekDeltaForMonthShift(anchorWk, shiftNum);
      }

      // Remove old allocation keys first so overlapping shifts never clobber newly written keys
      projAllocEntries.forEach(e => { delete db.allocations[e.key]; });
      projAllocEntries.forEach(e => {
        const targetWk = addWeeksToWeekKey(e.weekKey, weekDelta);
        db.allocations[`${e.deptId}::${projId}::${targetWk}`] = e.fte;
      });

      let movedComments = 0;
      if (shiftComments && db.comments) {
        const projCommentEntries = [];
        Object.entries(db.comments).forEach(([k, text]) => {
          const parts = k.split('::');
          if (parts[1] === projId && parts[2]) {
            projCommentEntries.push({ key: k, deptId: parts[0], periodKey: parts[2], text });
          }
        });
        projCommentEntries.forEach(e => { delete db.comments[e.key]; });
        projCommentEntries.forEach(e => {
          let targetPk = e.periodKey;
          if (/^\d{4}-W\d{2}$/.test(e.periodKey)) {
            targetPk = addWeeksToWeekKey(e.periodKey, weekDelta);
          } else if (/^\d{4}-\d{2}$/.test(e.periodKey)) {
            targetPk = unit === 'month'
              ? addMonthsToMonthKey(e.periodKey, shiftNum)
              : getWeekOwningMonth(addWeeksToWeekKey(getWeeksInMonth(e.periodKey)[0] || getCurrentWeekKey(), weekDelta));
          }
          db.comments[`${e.deptId}::${projId}::${targetPk}`] = e.text;
          movedComments++;
        });
      }

      let movedMilestones = 0;
      if (shiftMilestones && Array.isArray(db.milestones)) {
        db.milestones.forEach(m => {
          if (m.projectId !== projId) return;
          if (m.date) {
            m.date = unit === 'month' ? shiftISODateByMonths(m.date, shiftNum) : addDaysToISODate(m.date, shiftNum * 7);
            movedMilestones++;
          }
          if (shiftBaseline && m.baselineDate) {
            m.baselineDate = unit === 'month' ? shiftISODateByMonths(m.baselineDate, shiftNum) : addDaysToISODate(m.baselineDate, shiftNum * 7);
          }
        });
      }

      return { movedAllocs: projAllocEntries.length, movedComments, movedMilestones, weekDelta };
    }

    function openShiftProjectModal(projId) {
      const db = getActiveDB();
      const p = db.projects.find(x => x.id === projId);
      if (!p) return;

      const allocCount = Object.keys(db.allocations || {}).filter(k => k.split('::')[1] === projId).length;
      const msCount = (db.milestones || []).filter(m => m.projectId === projId).length;
      const cmtCount = Object.keys(db.comments || {}).filter(k => k.split('::')[1] === projId).length;

      showModal(`
        <div class="p-5 space-y-4 text-xs">
          <div class="w-10 h-1.5 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 id="modalTitle" class="text-base font-bold text-slate-900">Shift Project Schedule</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Move all allocations, notes, and milestones for <strong>[${escapeHtml(p.code)}] ${escapeHtml(p.name)}</strong> together.</p>
            </div>
            <button type="button" aria-label="Close dialog" onclick="closeModal()" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl font-bold leading-none">&times;</button>
          </div>

          <input type="hidden" id="mShiftProjId" value="${p.id}" />

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-700">
            <span><strong>${allocCount}</strong> weekly allocation${allocCount === 1 ? '' : 's'}</span>
            <span class="text-slate-300">|</span>
            <span><strong>${msCount}</strong> milestone${msCount === 1 ? '' : 's'}</span>
            <span class="text-slate-300">|</span>
            <span><strong>${cmtCount}</strong> cell comment${cmtCount === 1 ? '' : 's'}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="mShiftDelta" class="block font-semibold text-slate-700 mb-1">Shift Amount (+ delay / &minus; pull forward)</label>
              <div class="flex items-center gap-1.5">
                <button type="button" aria-label="Decrease shift" onclick="stepNumericInput('mShiftDelta', -1, -52, 52, 0)"
                  class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-base shrink-0">&minus;</button>
                <input id="mShiftDelta" type="number" inputmode="numeric" min="-52" max="52" step="1" value="1"
                  class="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-center" />
                <button type="button" aria-label="Increase shift" onclick="stepNumericInput('mShiftDelta', 1, -52, 52, 0)"
                  class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-base shrink-0">+</button>
              </div>
            </div>
            <div>
              <label for="mShiftUnit" class="block font-semibold text-slate-700 mb-1">Time Unit</label>
              <select id="mShiftUnit" class="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold">
                <option value="week" ${ui.timeUnit === 'week' ? 'selected' : ''}>ISO Weeks</option>
                <option value="month" ${ui.timeUnit === 'month' ? 'selected' : ''}>Calendar Months</option>
              </select>
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input id="mShiftMilestones" type="checkbox" checked class="rounded text-indigo-600" />
              <span class="font-semibold text-slate-700">Shift project milestone target dates</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input id="mShiftBaseline" type="checkbox" class="rounded text-indigo-600" />
              <span class="text-slate-600">Also shift milestone baseline dates <span class="text-slate-400">(unchecked preserves slip drift tracking)</span></span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input id="mShiftComments" type="checkbox" checked class="rounded text-indigo-600" />
              <span class="font-semibold text-slate-700">Shift cell comments along with allocations</span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold">Cancel</button>
            <button type="button" onclick="applyShiftProjectModal()" class="px-4 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Shift Schedule</button>
          </div>
        </div>`, 'max-w-md');
    }

    function applyShiftProjectModal() {
      const db = getActiveDB();
      const projId = document.getElementById('mShiftProjId')?.value;
      const delta = parseInt(document.getElementById('mShiftDelta')?.value, 10) || 0;
      const unit = document.getElementById('mShiftUnit')?.value === 'month' ? 'month' : 'week';
      const shiftMilestones = Boolean(document.getElementById('mShiftMilestones')?.checked);
      const shiftBaseline = Boolean(document.getElementById('mShiftBaseline')?.checked);
      const shiftComments = Boolean(document.getElementById('mShiftComments')?.checked);

      if (!delta) { showToast('Enter a non-zero shift amount (e.g. +2 or -1).', 'warning'); return; }
      const p = db.projects.find(x => x.id === projId);
      if (!p) return;

      const signStr = delta > 0 ? `+${delta}` : String(delta);
      const unitLbl = `${unit}${Math.abs(delta) === 1 ? '' : 's'}`;
      pushUndoState(`Shift [${p.code}] by ${signStr} ${unitLbl}`);
      const res = shiftProjectSchedule(projId, delta, unit, { shiftMilestones, shiftBaseline, shiftComments }, db);
      recordChange('Project', `Shifted [${p.code}] ${p.name} by ${signStr} ${unitLbl} (${res.movedAllocs} alloc wks, ${res.movedMilestones} milestones)`);
      closeModal();
      renderAll();
      showToast(`Shifted [${p.code}] by ${signStr} ${unitLbl} (${res.movedAllocs} weeks, ${res.movedMilestones} milestones)`, 'success', { undoable: true });
    }

    /* ---------- 14B. Company-Wide Holiday / Shutdown Capacity Factor ---------- */

    function applyHolidayFactor(deptIds, startPk, count, timeUnit, pctFactor, db = getActiveDB()) {
      const cleanPct = Math.max(0, Math.min(200, Number(pctFactor)));
      const numPeriods = Math.max(1, Math.min(24, parseInt(count, 10) || 1));
      const targets = (db.departments || []).filter(d => deptIds.includes(d.id));
      let updatedWeeks = 0;

      let curPk = startPk;
      for (let i = 0; i < numPeriods; i++) {
        const wks = timeUnit === 'month' ? getWeeksInMonth(curPk) : [curPk];
        wks.forEach(wk => {
          targets.forEach(d => {
            const key = `${d.id}::${wk}`;
            if (Math.abs(cleanPct - 100) < 0.01) {
              delete db.capacityOverrides[key];
            } else {
              const scaled = Math.round(((Number(d.defaultCapacity) || 0) * (cleanPct / 100)) * 20) / 20;
              db.capacityOverrides[key] = Math.max(0, scaled);
            }
            updatedWeeks++;
          });
        });
        curPk = timeUnit === 'month' ? addMonthsToMonthKey(curPk, 1) : addWeeksToWeekKey(curPk, 1);
      }
      return { updatedWeeks, deptCount: targets.length };
    }

    function openHolidayFactorModal(prePeriod = '') {
      const db = getActiveDB();
      if (db.departments.length === 0) {
        showToast('Add at least one Department first.', 'warning');
        return;
      }
      const anchor = prePeriod || (ui.timeUnit === 'month' ? ui.startMonth : ui.startWeek);
      const startOpts = buildPeriodSelectOptions(anchor, ui.timeUnit, 4, 20);
      const deptChecks = db.departments.map(d => `
        <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
          <input type="checkbox" data-holiday-dept="1" class="rounded text-indigo-600" value="${d.id}" checked />
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${d.color}"></span>
          <span>${escapeHtml(d.code)}</span>
        </label>`).join('');

      showModal(`
        <div class="p-5 space-y-4 text-xs">
          <div class="w-10 h-1.5 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 id="modalTitle" class="text-base font-bold text-slate-900">Company Holiday / Shutdown Capacity %</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Scale default capacity across departments for holidays, summer dips, or shutdown weeks.</p>
            </div>
            <button type="button" aria-label="Close dialog" onclick="closeModal()" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl font-bold leading-none">&times;</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="mHolStart" class="block font-semibold text-slate-700 mb-1">Start ${ui.timeUnit === 'month' ? 'Month' : 'ISO Week'}</label>
              <select id="mHolStart" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                ${startOpts.map(o => `<option value="${o.key}" ${o.key === anchor ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="mHolCount" class="block font-semibold text-slate-700 mb-1">Duration (${ui.timeUnit}s)</label>
              <div class="flex items-center gap-1.5">
                <button type="button" onclick="stepNumericInput('mHolCount', -1, 1, 12, 0)" class="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 font-bold">&minus;</button>
                <input id="mHolCount" type="number" inputmode="numeric" min="1" max="12" value="1" class="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-center" />
                <button type="button" onclick="stepNumericInput('mHolCount', 1, 1, 12, 0)" class="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 font-bold">+</button>
              </div>
            </div>
          </div>

          <div>
            <label for="mHolPct" class="block font-semibold text-slate-700 mb-1">Available Capacity Factor (%)</label>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <button type="button" onclick="document.getElementById('mHolPct').value='0'" class="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">0% Shutdown</button>
              <button type="button" onclick="document.getElementById('mHolPct').value='50'" class="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px]">50% Half-Week</button>
              <button type="button" onclick="document.getElementById('mHolPct').value='80'" class="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-bold text-[11px]">80% 4-Day Wk</button>
              <button type="button" onclick="document.getElementById('mHolPct').value='100'" class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">100% Reset</button>
            </div>
            <input id="mHolPct" type="number" inputmode="numeric" min="0" max="200" step="5" value="80" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
          </div>

          <div>
            <div class="font-semibold text-slate-700 mb-1.5">Departments</div>
            <div class="flex flex-wrap gap-1.5">${deptChecks}</div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold">Cancel</button>
            <button type="button" onclick="applyHolidayFactorModal()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Apply Capacity Factor</button>
          </div>
        </div>`, 'max-w-md');
    }

    function applyHolidayFactorModal() {
      const db = getActiveDB();
      const startPk = document.getElementById('mHolStart')?.value;
      const count = Math.max(1, Math.min(12, parseInt(document.getElementById('mHolCount')?.value, 10) || 1));
      const pct = parseFloat(document.getElementById('mHolPct')?.value);
      const deptIds = [...document.querySelectorAll('input[data-holiday-dept]:checked')].map(el => el.value);

      if (isNaN(pct) || pct < 0 || pct > 200) { showToast('Enter a percentage between 0 and 200.', 'warning'); return; }
      if (deptIds.length === 0) { showToast('Select at least one department.', 'warning'); return; }

      pushUndoState(`Apply ${pct}% capacity factor`);
      const res = applyHolidayFactor(deptIds, startPk, count, ui.timeUnit, pct, db);
      recordChange('Capacity', `Applied ${pct}% capacity factor to ${res.deptCount} dept(s) starting ${startPk} (${count} ${ui.timeUnit}${count === 1 ? '' : 's'})`);
      closeModal();
      renderAll();
      showToast(`Updated capacity for ${res.deptCount} department${res.deptCount === 1 ? '' : 's'} (${pct}%)`, 'success', { undoable: true });
    }

    /* ---------- 14C. What-If Scenario Mode (Clone Live DB Safely) ---------- */

    function computeWhatIfDeltaSummary() {
      if (!whatIfDB || !liveDB) return 'Testing changes on a temporary clone of your Live DB.';
      const liveA = liveDB.allocations || {};
      const wiA = whatIfDB.allocations || {};
      const allKeys = new Set([...Object.keys(liveA), ...Object.keys(wiA)]);
      let changedAllocs = 0;
      let netFteWks = 0;
      allKeys.forEach(k => {
        const a = Number(liveA[k]) || 0;
        const b = Number(wiA[k]) || 0;
        if (Math.abs(a - b) > 0.001) {
          changedAllocs++;
          netFteWks += (b - a);
        }
      });

      const liveC = liveDB.capacityOverrides || {};
      const wiC = whatIfDB.capacityOverrides || {};
      const capKeys = new Set([...Object.keys(liveC), ...Object.keys(wiC)]);
      let changedCaps = 0;
      capKeys.forEach(k => {
        if (liveC[k] !== wiC[k]) changedCaps++;
      });

      if (changedAllocs === 0 && changedCaps === 0 && JSON.stringify(liveDB.milestones) === JSON.stringify(whatIfDB.milestones)) {
        return 'Cloned from Live DB — make test edits freely; your Live DB & shared file remain untouched.';
      }
      const parts = [];
      if (changedAllocs > 0) parts.push(`${changedAllocs} alloc wk${changedAllocs === 1 ? '' : 's'} (${netFteWks >= 0 ? '+' : ''}${Math.round(netFteWks * 10) / 10} FTE-wks)`);
      if (changedCaps > 0) parts.push(`${changedCaps} cap override${changedCaps === 1 ? '' : 's'}`);
      return `Sandbox diff vs. Live: ${parts.length ? parts.join(' • ') : 'metadata/milestone edits'} — Live DB untouched until Commit.`;
    }

    function enterWhatIfMode() {
      if (!liveDB) return;
      ui.demoMode = false;
      whatIfDB = JSON.parse(JSON.stringify(liveDB));
      ui.whatIfMode = true;
      clearUndoHistory();
      renderAll();
      showToast('What-If Sandbox active — testing on a clone of your Live DB', 'info');
    }

    function discardWhatIfMode() {
      ui.whatIfMode = false;
      whatIfDB = null;
      clearUndoHistory();
      renderAll();
      showToast('What-If scenario discarded — Live DB restored', 'info');
    }

    function commitWhatIfToLive() {
      if (!whatIfDB || !ui.whatIfMode) return;
      openConfirmModal(
        'Commit What-If Scenario to Live DB',
        'Apply all changes from your What-If sandbox to the Live Company Database (and sync to any linked shared file)?',
        'Commit to Live',
        () => {
          const prevLiveSnapshot = captureUndoSnapshot(liveDB);
          liveDB = JSON.parse(JSON.stringify(whatIfDB));
          ui.whatIfMode = false;
          whatIfDB = null;
          clearUndoHistory();
          _undoStack.push({ label: 'Commit What-If Scenario', data: prevLiveSnapshot });
          recordChange('Scenario', 'Committed What-If sandbox scenario to Live DB');
          renderAll();
          showToast('What-If scenario committed to Live DB', 'success', { undoable: true });
        }
      );
    }

    function toggleWhatIfMode() {
      if (ui.whatIfMode && whatIfDB) {
        discardWhatIfMode();
      } else {
        enterWhatIfMode();
      }
    }

    /* ---------- 14D. Saved Views / Presets ---------- */

    function getSavedViews() {
      try {
        const raw = safeGetStorage(STORAGE_KEYS.SAVED_VIEWS);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    function persistSavedViews(list) {
      safeSetStorage(STORAGE_KEYS.SAVED_VIEWS, JSON.stringify(list.slice(0, 20)));
    }

    function openSavedViewsModal() {
      const views = getSavedViews();
      const rowsHtml = views.length === 0
        ? `<div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500">No saved views yet. Save your current filters, horizon, and color mode below for 1-click recall.</div>`
        : views.map(v => `
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-slate-900 truncate">${escapeHtml(v.name)}</div>
                <div class="text-[10px] text-slate-500 truncate">
                  ${v.state.meetingMode ? `Meeting (${v.state.meetingHorizon} ${v.state.timeUnit}s)` : `${v.state.axis === 'project' ? 'By Project' : 'By Dept'} • ${v.state.horizon} ${v.state.timeUnit}s`}
                  &bull; ${escapeHtml(v.state.cellColorMode || 'accent')}
                  ${v.state.hideEmptyRows ? ' • Active Only' : ''}
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="applySavedViewPreset('${v.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition">Load</button>
                <button type="button" onclick="deleteSavedViewPreset('${v.id}')" class="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-[11px] transition">Delete</button>
              </div>
            </div>`).join('');

      showModal(`
        <div class="p-5 space-y-4 text-xs">
          <div class="w-10 h-1.5 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 id="modalTitle" class="text-base font-bold text-slate-900">Saved Views &amp; Presets</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Bookmark filter combinations, horizons, and Meeting View setups for instant switching.</p>
            </div>
            <button type="button" aria-label="Close dialog" onclick="closeModal()" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl font-bold leading-none">&times;</button>
          </div>

          <div class="flex items-center gap-2">
            <label for="mSavedViewName" class="sr-only">New view preset name</label>
            <input id="mSavedViewName" type="text" placeholder="e.g. Steering Committee 2W, Eng Bottlenecks..."
              onkeydown="if(event.key==='Enter'){event.preventDefault();saveCurrentViewPreset();}"
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800" />
            <button type="button" onclick="saveCurrentViewPreset()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0">Save Current</button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto">${rowsHtml}</div>
        </div>`, 'max-w-md');
    }

    function saveCurrentViewPreset() {
      const name = (document.getElementById('mSavedViewName')?.value || '').trim();
      if (!name) { showToast('Enter a name for this view preset.', 'warning'); return; }
      const list = getSavedViews();
      list.unshift({
        id: uid('view'),
        name,
        createdAt: new Date().toISOString(),
        state: {
          axis: ui.axis,
          timeUnit: ui.timeUnit,
          manpowerUnit: ui.manpowerUnit,
          horizon: ui.horizon,
          meetingMode: ui.meetingMode,
          meetingHorizon: ui.meetingHorizon,
          cellColorMode: ui.cellColorMode,
          meetingCellColorMode: ui.meetingCellColorMode,
          filterDept: ui.filterDept,
          filterProj: ui.filterProj,
          hideEmptyRows: ui.hideEmptyRows,
          filterOverOnly: ui.filterOverOnly,
          filterAtRiskOnly: ui.filterAtRiskOnly,
          filterHasNotesOnly: ui.filterHasNotesOnly,
          spotlightProjId: ui.spotlightProjId,
          showCellComments: ui.showCellComments,
        },
      });
      persistSavedViews(list);
      openSavedViewsModal();
      renderAll();
      showToast(`Saved view "${name}"`, 'success');
    }

    function applySavedViewPreset(id) {
      const view = getSavedViews().find(v => v.id === id);
      if (!view || !view.state) return;
      Object.assign(ui, view.state, { activeTab: 'matrix' });
      persistUIPrefs();
      closeModal();
      renderAll();
      showToast(`Loaded view "${view.name}"`, 'info');
    }

    function deleteSavedViewPreset(id) {
      const list = getSavedViews().filter(v => v.id !== id);
      persistSavedViews(list);
      openSavedViewsModal();
      renderAll();
    }

    /* ---------- 14E. Meeting Slide Print Export (Always Light Mode, Full-Width Fit) ---------- */

    function printMeetingSlide() {
      const root = document.documentElement;
      const wasDark = root.classList.contains('dark');
      const table = document.querySelector('#matrixWrapper table[data-period-count]');

      // Always print in crisp Light Mode and fit 100% of columns onto the landscape page
      if (wasDark) root.classList.remove('dark');
      root.classList.add('print-meeting-slide');
      if (table) {
        table.style.width = '100%';
        const stickyCol = table.querySelector('colgroup col[data-sticky-col]');
        if (stickyCol) stickyCol.style.width = '56px';
        table.querySelectorAll('colgroup col[data-period-col]').forEach(col => {
          col.style.width = 'auto';
        });
      }

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        root.classList.remove('print-meeting-slide');
        if (wasDark) root.classList.add('dark');
        if (typeof applyMatrixFullColumnWidths === 'function') applyMatrixFullColumnWidths();
        if (typeof syncMatrixFloatingHeaderMetrics === 'function') syncMatrixFloatingHeaderMetrics();
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 2000);
      }, 60);
    }

    /* ---------- 14F. Paste from Excel / CSV Importer ---------- */

    function parseDelimitedAllocations(rawText, unit = 'fte', db = getActiveDB()) {
      const lines = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
      const valid = [];
      const errors = [];

      const findDept = (token) => {
        const t = token.trim().toLowerCase();
        return (db.departments || []).find(d => d.code.toLowerCase() === t || d.name.toLowerCase() === t || d.id.toLowerCase() === t) || null;
      };
      const findProj = (token) => {
        const t = token.trim().toLowerCase();
        return (db.projects || []).find(p => p.code.toLowerCase() === t || p.name.toLowerCase() === t || p.id.toLowerCase() === t) || null;
      };

      lines.forEach((line, idx) => {
        const sep = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 4) {
          errors.push({ line: idx + 1, raw: line, reason: 'Expected 4 columns: Dept, Project, Period, Value' });
          return;
        }
        // Skip header row automatically
        const numVal = parseFloat(cols[3].replace(',', '.'));
        if (idx === 0 && isNaN(numVal)) return;

        const dept = findDept(cols[0]);
        const proj = findProj(cols[1]);
        const pInfo = normalizeWeekKeyFormat(cols[2]);
        if (!dept) { errors.push({ line: idx + 1, raw: line, reason: `Unknown department "${cols[0]}"` }); return; }
        if (!proj) { errors.push({ line: idx + 1, raw: line, reason: `Unknown project "${cols[1]}"` }); return; }
        if (!pInfo) { errors.push({ line: idx + 1, raw: line, reason: `Invalid period "${cols[2]}" (use YYYY-MM or YYYY-Www)` }); return; }
        if (isNaN(numVal) || numVal < 0) { errors.push({ line: idx + 1, raw: line, reason: `Invalid value "${cols[3]}"` }); return; }

        const fte = displayValueToFte(numVal, pInfo.key, pInfo.kind, unit);
        valid.push({
          line: idx + 1,
          deptId: dept.id, deptCode: dept.code,
          projId: proj.id, projCode: proj.code,
          periodKey: pInfo.key, timeUnit: pInfo.kind,
          rawVal: numVal, unit, fte,
        });
      });

      return { valid, errors };
    }

    let _pendingCsvImportRows = [];

    function openCsvImportModal() {
      _pendingCsvImportRows = [];
      const db = getActiveDB();
      const exDept = db.departments[0]?.code || 'ENG';
      const exProj = db.projects[0]?.code || 'NVA';
      const exPeriod = ui.timeUnit === 'month' ? ui.startMonth : ui.startWeek;

      showModal(`
        <div class="p-5 space-y-4 text-xs">
          <div class="w-10 h-1.5 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 id="modalTitle" class="text-base font-bold text-slate-900">Import Allocations (Paste from Excel / CSV)</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Paste tab- or comma-separated rows: <code class="px-1 rounded bg-slate-100 font-mono">Department, Project, Period, Value</code></p>
            </div>
            <button type="button" aria-label="Close dialog" onclick="closeModal()" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl font-bold leading-none">&times;</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="mCsvUnit" class="block font-semibold text-slate-700 mb-1">Input Value Unit</label>
              <select id="mCsvUnit" onchange="previewCsvImport()" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold">
                <option value="fte" ${ui.manpowerUnit === 'fte' ? 'selected' : ''}>FTE (Headcount Rate)</option>
                <option value="days" ${ui.manpowerUnit === 'days' ? 'selected' : ''}>Person-Days</option>
                <option value="hours" ${ui.manpowerUnit === 'hours' ? 'selected' : ''}>Hours</option>
              </select>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              Matches Departments &amp; Projects by <strong>Code</strong> or <strong>Name</strong>. Period accepts <code class="font-mono">YYYY-MM</code> or <code class="font-mono">YYYY-Www</code>.
            </div>
          </div>

          <div>
            <label for="mCsvInput" class="block font-semibold text-slate-700 mb-1">Paste Rows Here</label>
            <textarea id="mCsvInput" rows="6" oninput="previewCsvImport()"
              placeholder="${escapeHtml(exDept)}, ${escapeHtml(exProj)}, ${escapeHtml(exPeriod)}, 2.5"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs leading-relaxed"></textarea>
          </div>

          <div id="mCsvPreviewBox" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
            Paste rows above to validate and preview before importing.
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold">Cancel</button>
            <button id="btnExecuteCsvImport" type="button" disabled onclick="executeCsvImport()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold">Import Valid Rows</button>
          </div>
        </div>`, 'max-w-2xl');
    }

    function previewCsvImport() {
      const text = document.getElementById('mCsvInput')?.value || '';
      const unit = document.getElementById('mCsvUnit')?.value || 'fte';
      const box = document.getElementById('mCsvPreviewBox');
      const btn = document.getElementById('btnExecuteCsvImport');
      if (!box || !btn) return;

      if (!text.trim()) {
        _pendingCsvImportRows = [];
        btn.disabled = true;
        box.innerHTML = 'Paste rows above to validate and preview before importing.';
        return;
      }

      const { valid, errors } = parseDelimitedAllocations(text, unit, getActiveDB());
      _pendingCsvImportRows = valid;
      btn.disabled = valid.length === 0;
      btn.textContent = valid.length > 0 ? `Import ${valid.length} Row${valid.length === 1 ? '' : 's'}` : 'Import Valid Rows';

      const previewRows = valid.slice(0, 6).map(r => `
        <tr class="border-t border-slate-200/70">
          <td class="py-1 pr-2 font-mono font-bold">${escapeHtml(r.deptCode)}</td>
          <td class="py-1 pr-2 font-mono font-bold text-indigo-700">${escapeHtml(r.projCode)}</td>
          <td class="py-1 pr-2 font-mono">${escapeHtml(r.periodKey)}</td>
          <td class="py-1 font-bold tabular-nums">${formatValue(r.rawVal, r.unit)} (${formatValue(r.fte, 'fte')})</td>
        </tr>`).join('');

      const errHtml = errors.length > 0
        ? `<div class="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 space-y-0.5 text-[11px]">
             <div class="font-bold">${errors.length} row${errors.length === 1 ? '' : 's'} skipped:</div>
             ${errors.slice(0, 4).map(e => `<div>Line ${e.line}: ${escapeHtml(e.reason)}</div>`).join('')}
           </div>`
        : '';

      box.innerHTML = `
        <div class="flex items-center justify-between font-bold text-slate-800 mb-1.5">
          <span class="text-emerald-700">${valid.length} valid row${valid.length === 1 ? '' : 's'} ready</span>
          ${valid.length > 6 ? `<span class="text-[10px] text-slate-400">Showing first 6</span>` : ''}
        </div>
        ${valid.length > 0 ? `<table class="w-full text-left text-[11px]"><tbody>${previewRows}</tbody></table>` : ''}
        ${errHtml}`;
    }

    function executeCsvImport() {
      if (_pendingCsvImportRows.length === 0) return;
      const db = getActiveDB();
      pushUndoState(`Import ${_pendingCsvImportRows.length} CSV allocations`);
      _pendingCsvImportRows.forEach(r => {
        setAllocationForPeriod(r.deptId, r.projId, r.periodKey, r.timeUnit, r.fte, db);
      });
      const count = _pendingCsvImportRows.length;
      _pendingCsvImportRows = [];
      recordChange('Import', `Bulk imported ${count} allocation row${count === 1 ? '' : 's'} via CSV/Excel paste`);
      closeModal();
      renderAll();
      showToast(`Imported ${count} allocation${count === 1 ? '' : 's'}`, 'success', { undoable: true });
    }

    /* ---------- 14G. Heatmap Cell Jump & Project Archiving ---------- */

    function jumpToMatrixCell(deptId, pk) {
      ui.activeTab = 'matrix';
      ui.axis = 'department';
      if (shouldRenderMobileCards()) {
        ui.mobileSelectedPeriod = pk;
      }
      persistUIPrefs();
      renderAll();
      setTimeout(() => openCellDetailModal(deptId, pk), 40);
    }

    function toggleArchiveProject(projId) {
      const db = getActiveDB();
      const p = db.projects.find(x => x.id === projId);
      if (!p) return;
      pushUndoState(`${p.archived ? 'Restore' : 'Archive'} project [${p.code}]`);
      p.archived = !p.archived;
      if (p.archived && ui.filterProj === projId) ui.filterProj = 'all';
      if (p.archived && ui.spotlightProjId === projId) ui.spotlightProjId = '';
      recordChange('Project', `${p.archived ? 'Archived' : 'Restored'} project [${p.code}] ${p.name}`);
      renderAll();
      showToast(`${p.archived ? 'Archived' : 'Restored'} [${p.code}] ${p.name}`, 'info', { undoable: true });
    }

    function toggleShowArchivedProjects() {
      ui.showArchivedProjects = !ui.showArchivedProjects;
      persistUIPrefs();
      renderDataTab();
    }
