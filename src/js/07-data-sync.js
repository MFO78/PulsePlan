    /* ============================================================================
     * 7. DATA & SETUP TAB RENDERER (WITH MOD 3 RETENTION & MOD 4 3-LEVEL SETTINGS)
     * ============================================================================ */

    function switchDataSubTab(sub) {
      ui.dataSubTab = sub;
      persistUIPrefs();
      renderDataTab();
    }

    function onFte3BasisChange(basis) {
      const isAbs = basis === 'absoluteFte';
      const pctWrap = document.getElementById('fte3PctInputsWrap');
      const absWrap = document.getElementById('fte3AbsInputsWrap');
      if (pctWrap) pctWrap.classList.toggle('hidden', isAbs);
      if (absWrap) absWrap.classList.toggle('hidden', !isAbs);
    }

    function renderDataTab() {
      const db = getActiveDB();
      ['departments', 'projects', 'milestones', 'settings'].forEach(s => {
        const active = ui.dataSubTab === s;
        const btn = document.getElementById(`subnav-${s}`);
        const panel = document.getElementById(`subtab-${s}`);
        if (btn) {
          btn.setAttribute('aria-selected', String(active));
          btn.className = active
            ? 'px-3 py-2 md:py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white transition whitespace-nowrap'
            : 'px-3 py-2 md:py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition whitespace-nowrap';
        }
        if (panel) panel.classList.toggle('hidden', !active);
      });

      const actionBox = document.getElementById('dataSubTabAction');
      const archivedCount = db.projects.filter(p => p.archived).length;
      if (ui.dataSubTab === 'departments') {
        actionBox.innerHTML = `
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="openHolidayFactorModal()" class="px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition">Holiday / Shutdown %</button>
            <button type="button" onclick="openCsvImportModal()" class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition">Import CSV / Excel</button>
            <button type="button" onclick="openDeptModal()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">+ Add Department</button>
          </div>`;
      } else if (ui.dataSubTab === 'projects') {
        actionBox.innerHTML = `
          <div class="flex flex-wrap items-center gap-2">
            ${archivedCount > 0 ? `<button type="button" onclick="toggleShowArchivedProjects()" class="px-3 py-2 rounded-xl border text-xs font-semibold transition ${ui.showArchivedProjects ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}">${ui.showArchivedProjects ? 'Hide' : 'Show'} Archived (${archivedCount})</button>` : ''}
            <button type="button" onclick="openCsvImportModal()" class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition">Import CSV / Excel</button>
            <button type="button" onclick="openProjectModal()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">+ Add Project</button>
          </div>`;
      } else if (ui.dataSubTab === 'milestones') {
        actionBox.innerHTML = `<button type="button" onclick="openMilestoneModal()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">+ Add Milestone</button>`;
      } else {
        actionBox.innerHTML = '';
      }

      const dBody = document.getElementById('dataDepartmentsBody');
      if (db.departments.length === 0) {
        dBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No departments yet. Click "+ Add Department" to start.</td></tr>`;
      } else {
        dBody.innerHTML = db.departments.map((d, idx) => {
          const overrideCount = Object.keys(db.capacityOverrides || {}).filter(k => k.startsWith(`${d.id}::`)).length;
          return `
            <tr class="hover:bg-slate-50/70">
              <th scope="row" class="px-4 py-3 font-bold text-slate-900 text-left">
                <div class="flex items-center gap-2">
                  <div class="inline-flex flex-col text-[10px] leading-none text-slate-400">
                    <button type="button" aria-label="Move ${escapeHtml(d.name)} up" onclick="moveRowOrder('department', '${d.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move up" class="p-1 hover:text-indigo-700 disabled:opacity-25">&#9650;</button>
                    <button type="button" aria-label="Move ${escapeHtml(d.name)} down" onclick="moveRowOrder('department', '${d.id}', 1)" ${idx === db.departments.length - 1 ? 'disabled' : ''} title="Move down" class="p-1 hover:text-indigo-700 disabled:opacity-25">&#9660;</button>
                  </div>
                  <span class="w-3 h-3 rounded-full shrink-0" style="background:${d.color}" aria-hidden="true"></span>
                  <span>${escapeHtml(d.name)}</span>
                </div>
              </th>
              <td class="px-4 py-3 font-mono font-bold text-slate-600">${escapeHtml(d.code)}</td>
              <td class="px-4 py-3 text-slate-600">${escapeHtml(d.manager || '—')}</td>
              <td class="px-4 py-3 font-bold text-slate-900">
                <div class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                  <button type="button" aria-label="Decrease ${escapeHtml(d.name)} default capacity" onclick="quickStepDeptDefaultCapacity('${d.id}', -0.5)" title="Decrease default capacity by 0.5 FTE" class="px-2.5 py-1.5 md:px-2 md:py-0.5 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold transition">&minus;</button>
                  <span class="px-2.5 py-1.5 md:py-0.5 tabular-nums border-x border-slate-200 bg-white">${d.defaultCapacity} FTE</span>
                  <button type="button" aria-label="Increase ${escapeHtml(d.name)} default capacity" onclick="quickStepDeptDefaultCapacity('${d.id}', 0.5)" title="Increase default capacity by 0.5 FTE" class="px-2.5 py-1.5 md:px-2 md:py-0.5 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold transition">+</button>
                </div>
              </td>
              <td class="px-4 py-3">
                <button type="button" onclick="openCapacityModal('${d.id}', '${ui.timeUnit === 'month' ? ui.startMonth : ui.startWeek}')"
                  class="px-2.5 py-1.5 md:px-2 md:py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold hover:bg-sky-100 transition whitespace-nowrap">
                  ${overrideCount} wk override${overrideCount === 1 ? '' : 's'} &bull; Edit
                </button>
              </td>
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <button type="button" onclick="openDeptModal('${d.id}')" class="px-2 py-1 text-indigo-600 hover:underline font-semibold">Edit</button>
                <button type="button" onclick="deleteDept('${d.id}')" class="px-2 py-1 text-rose-600 hover:underline font-semibold">Delete</button>
              </td>
            </tr>`;
        }).join('');
      }

      const pBody = document.getElementById('dataProjectsBody');
      const displayedProjects = ui.showArchivedProjects ? db.projects : db.projects.filter(p => !p.archived);
      if (displayedProjects.length === 0) {
        pBody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-400">${db.projects.length > 0 ? 'All projects are archived. Click "Show Archived" above to view them.' : 'No projects yet. Click "+ Add Project" to start.'}</td></tr>`;
      } else {
        pBody.innerHTML = displayedProjects.map((p) => {
          const idx = db.projects.indexOf(p);
          const plannedDays = getProjectTotalPlannedDays(p.id, db);
          const budgetDays = Number(p.budgetDays) || 0;
          const pct = budgetDays > 0 ? Math.round((plannedDays / budgetDays) * 100) : 0;
          const budgetHtml = budgetDays > 0
            ? `<div class="space-y-1 min-w-[110px]">
                 <div class="flex items-center justify-between text-[11px] font-bold tabular-nums">
                   <span class="${pct > 100 ? 'text-rose-600' : pct >= 85 ? 'text-amber-700' : 'text-slate-700'}">${plannedDays} / ${budgetDays}d</span>
                   <span class="${pct > 100 ? 'text-rose-600' : 'text-slate-500'}">${pct}%</span>
                 </div>
                 <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full ${pct > 100 ? 'bg-rose-500' : pct >= 85 ? 'bg-amber-500' : 'bg-indigo-500'}" style="width:${Math.min(100, pct)}%"></div></div>
               </div>`
            : `<span class="text-slate-400 tabular-nums">${plannedDays > 0 ? `${plannedDays}d planned` : '—'}</span>`;
          return `
            <tr class="hover:bg-slate-50/70 ${p.archived ? 'opacity-65' : ''}">
              <th scope="row" class="px-4 py-3 font-bold text-slate-900 text-left">
                <div class="flex items-center gap-2">
                  <div class="inline-flex flex-col text-[10px] leading-none text-slate-400">
                    <button type="button" aria-label="Move ${escapeHtml(p.name)} up" onclick="moveRowOrder('project', '${p.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move up" class="p-1 hover:text-indigo-700 disabled:opacity-25">&#9650;</button>
                    <button type="button" aria-label="Move ${escapeHtml(p.name)} down" onclick="moveRowOrder('project', '${p.id}', 1)" ${idx === db.projects.length - 1 ? 'disabled' : ''} title="Move down" class="p-1 hover:text-indigo-700 disabled:opacity-25">&#9660;</button>
                  </div>
                  <span class="w-3 h-3 rounded-full shrink-0" style="background:${p.color}" aria-hidden="true"></span>
                  <span>${escapeHtml(p.name)}</span>
                  ${p.archived ? '<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase">Archived</span>' : ''}
                </div>
              </th>
              <td class="px-4 py-3 font-mono font-bold text-indigo-700">${escapeHtml(p.code)}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">${escapeHtml(p.status)}</span></td>
              <td class="px-4 py-3 text-slate-600">${escapeHtml(p.priority || 'Medium')}</td>
              <td class="px-4 py-3 text-slate-600">${escapeHtml(p.owner || '—')}</td>
              <td class="px-4 py-3">${budgetHtml}</td>
              <td class="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                <button type="button" onclick="openShiftProjectModal('${p.id}')" title="Shift all allocations, comments, and milestones by ±N weeks/months" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold transition">&#8644; Shift</button>
                <button type="button" onclick="toggleArchiveProject('${p.id}')" class="px-2 py-1 text-slate-600 hover:text-indigo-700 hover:underline font-semibold">${p.archived ? 'Restore' : 'Archive'}</button>
                <button type="button" onclick="openProjectModal('${p.id}')" class="px-2 py-1 text-indigo-600 hover:underline font-semibold">Edit</button>
                <button type="button" onclick="deleteProject('${p.id}')" class="px-2 py-1 text-rose-600 hover:underline font-semibold">Delete</button>
              </td>
            </tr>`;
        }).join('');
      }

      const mBody = document.getElementById('dataMilestonesBody');
      if (db.milestones.length === 0) {
        mBody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">No milestones yet. Click "+ Add Milestone" to track key deliverables.</td></tr>`;
      } else {
        mBody.innerHTML = db.milestones.map(m => {
          const p = db.projects.find(x => x.id === m.projectId);
          const d = db.departments.find(x => x.id === m.deptId);
          const drift = getMilestoneDriftDays(m);
          const driftHtml = drift === 0
            ? '<span class="text-emerald-700 font-semibold">On Plan</span>'
            : drift > 0
              ? `<span class="text-rose-600 font-bold">▲ +${drift}d Slip</span>`
              : `<span class="text-emerald-600 font-bold">▼ ${drift}d Early</span>`;
          return `
            <tr class="hover:bg-slate-50/70">
              <th scope="row" class="px-4 py-3 font-bold text-slate-900 text-left"><span class="text-violet-600 mr-1" aria-hidden="true">◆</span>${escapeHtml(m.title)}</th>
              <td class="px-4 py-3 text-slate-700">${p ? `[${escapeHtml(p.code)}] ${escapeHtml(p.name)}` : '—'}</td>
              <td class="px-4 py-3 text-slate-600">${d ? escapeHtml(d.name) : 'Auto'}</td>
              <td class="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(m.baselineDate || '—')}</td>
              <td class="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">${escapeHtml(m.date || '—')}</td>
              <td class="px-4 py-3 whitespace-nowrap">${driftHtml}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">${escapeHtml(m.status || 'Pending')}</span></td>
              <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                <button type="button" onclick="openMilestoneModal('${m.id}')" class="px-2 py-1 text-indigo-600 hover:underline font-semibold">Edit</button>
                <button type="button" onclick="deleteMilestoneFromModal('${m.id}')" class="px-2 py-1 text-rose-600 hover:underline font-semibold">Delete</button>
              </td>
            </tr>`;
        }).join('');
      }

      document.getElementById('setDaysPerWeek').value = db.settings.daysPerWeek || 5;
      document.getElementById('setHoursPerDay').value = db.settings.hoursPerDay || 8;
      document.getElementById('setWarnThreshold').value = db.settings.warnThreshold || 85;
      document.getElementById('setOverThreshold').value = db.settings.overThreshold || 100;
      document.getElementById('setUserName').value = ui.userName || 'Project Mgr';

      const fte3 = getFte3Settings(db);
      document.getElementById('setFte3Basis').value = fte3.basis;
      document.getElementById('setFte3YellowPct').value = fte3.yellowPct;
      document.getElementById('setFte3RedPct').value = fte3.redPct;
      document.getElementById('setFte3YellowFte').value = fte3.yellowFte;
      document.getElementById('setFte3RedFte').value = fte3.redFte;
      onFte3BasisChange(fte3.basis);

      const ret = getRetentionSettings(db);
      document.getElementById('setMaxDumpHistory').value = ret.maxDumpHistory;
      document.getElementById('setMaxChangeLog').value = ret.maxChangeLog;
      document.getElementById('setMaxSnapshots').value = ret.maxSnapshots;
      document.getElementById('setAutoPruneOnSave').checked = Boolean(ret.autoPruneOnSave);
    }

    function saveSettingsFromTab() {
      const db = getActiveDB();
      db.settings.daysPerWeek = Math.max(1, Math.min(7, parseFloat(document.getElementById('setDaysPerWeek').value) || 5));
      db.settings.hoursPerDay = Math.max(1, Math.min(24, parseFloat(document.getElementById('setHoursPerDay').value) || 8));
      db.settings.warnThreshold = Math.max(50, Math.min(150, parseInt(document.getElementById('setWarnThreshold').value, 10) || 85));
      db.settings.overThreshold = Math.max(80, Math.min(200, parseInt(document.getElementById('setOverThreshold').value, 10) || 100));

      const basis = document.getElementById('setFte3Basis').value === 'absoluteFte' ? 'absoluteFte' : 'capacityPct';
      const yellowPct = Math.max(5, Math.min(95, parseInt(document.getElementById('setFte3YellowPct').value, 10) || 25));
      const redPct = Math.max(yellowPct + 5, Math.min(150, parseInt(document.getElementById('setFte3RedPct').value, 10) || 50));
      const yellowFte = Math.max(0.25, Math.min(50, parseFloat(document.getElementById('setFte3YellowFte').value) || 1.0));
      const redFte = Math.max(yellowFte + 0.25, Math.min(100, parseFloat(document.getElementById('setFte3RedFte').value) || 2.5));
      db.settings.fte3Scheme = { basis, yellowPct, redPct, yellowFte, redFte };

      const maxDumpHistory = Math.max(5, Math.min(100, parseInt(document.getElementById('setMaxDumpHistory').value, 10) || 15));
      const maxChangeLog = Math.max(10, Math.min(500, parseInt(document.getElementById('setMaxChangeLog').value, 10) || 100));
      const maxSnapshots = Math.max(1, Math.min(50, parseInt(document.getElementById('setMaxSnapshots').value, 10) || 10));
      const autoPruneOnSave = Boolean(document.getElementById('setAutoPruneOnSave').checked);
      db.settings.retention = { maxDumpHistory, maxChangeLog, maxSnapshots, autoPruneOnSave };

      setActiveUserName(document.getElementById('setUserName').value || 'Project Mgr', false);
      if (autoPruneOnSave) enforceRollingHistory(db);

      recordChange('Settings', `Updated units (${db.settings.daysPerWeek}d/wk, ${db.settings.hoursPerDay}h/d), 3-level FTE (${basis}), & rolling limits (${maxDumpHistory}/${maxChangeLog}/${maxSnapshots})`);
      renderAll();
      showToast('Settings saved', 'success');
    }

    function quickStepDeptDefaultCapacity(deptId, delta) {
      const db = getActiveDB();
      const d = db.departments.find(x => x.id === deptId);
      if (!d) return;
      const next = Math.max(0, Math.round(((Number(d.defaultCapacity) || 0) + delta) * 100) / 100);
      pushUndoState(`Adjust [${d.code}] default capacity`);
      d.defaultCapacity = next;
      triggerHaptic(8);
      recordChange('Department', `Adjusted [${d.code}] ${d.name} default capacity to ${next} FTE`);
      renderAll();
    }

    /* ============================================================================
     * 8. MOBILE-AWARE SHARED FILE SYNC, SNAPSHOTS & MOD 3 PAYLOAD HYGIENE
     * ============================================================================ */

    function supportsFileSystemAccess() {
      return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';
    }

    function openHandleIDB() {
      return new Promise((resolve, reject) => {
        try {
          const req = indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(IDB_STORE)) {
              req.result.createObjectStore(IDB_STORE);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    async function saveRememberedHandle(handle) {
      try {
        const db = await openHandleIDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
      } catch (e) {}
    }

    async function loadRememberedHandle() {
      try {
        const db = await openHandleIDB();
        return await new Promise((resolve) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    }

    async function clearRememberedHandle() {
      try {
        const db = await openHandleIDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
      } catch (e) {}
    }

    async function openSharedDatabaseFile() {
      if (!supportsFileSystemAccess()) {
        showToast('Direct folder sync requires desktop Chrome/Edge. Use Share/Save & Import JSON in Sync.', 'warning');
        return;
      }
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'PulsePlan JSON Database', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        });
        if (handle) await attachAndLoadFileHandle(handle, false);
      } catch (e) {
        if (e.name !== 'AbortError') {
          showToast('Could not open file picker. Use Import JSON instead.', 'warning');
        }
      }
    }

    async function createSharedDatabaseFile() {
      if (!supportsFileSystemAccess()) {
        downloadJsonBackup();
        return;
      }
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'pulseplan_company_roadmap.json',
          types: [{ description: 'PulsePlan JSON Database', accept: { 'application/json': ['.json'] } }],
        });
        if (!handle) return;
        ui.demoMode = false;
        persistUIPrefs();
        linkedFileHandle = handle;
        rememberedFileHandle = handle;
        syncWarningState = { type: null, fileName: '', dismissed: false };
        await saveRememberedHandle(handle);
        await writeDBToLinkedFile();
        startFilePolling();
        renderAll();
        showToast(`Created & linked "${handle.name}" for auto-save`, 'success');
      } catch (e) {
        if (e.name !== 'AbortError') {
          showToast('Could not create linked file (use Share/Save JSON instead).', 'warning');
        }
      }
    }

    async function reconnectRememberedFile() {
      if (!rememberedFileHandle) return;
      try {
        const perm = await rememberedFileHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          await attachAndLoadFileHandle(rememberedFileHandle, false);
        } else {
          setSyncWarning('permission', rememberedFileHandle.name);
          showToast('Permission denied to access the remembered sync file.', 'warning');
        }
      } catch (e) {
        setSyncWarning('missing', rememberedFileHandle.name);
        showToast(`Sync file "${rememberedFileHandle.name}" could not be found or accessed.`, 'error');
      }
    }

    async function autoReconnectSyncFile() {
      // On mobile browsers without File System Access API, stay cleanly in local storage without showing desktop warnings
      if (!supportsFileSystemAccess()) {
        syncWarningState = { type: null, fileName: '', dismissed: false };
        renderSyncWarningBanner();
        return;
      }
      if (!rememberedFileHandle) {
        if (!ui.demoMode) setSyncWarning('unlinked', '');
        return;
      }
      try {
        if (typeof rememberedFileHandle.queryPermission === 'function') {
          const perm = await rememberedFileHandle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            await attachAndLoadFileHandle(rememberedFileHandle, true);
            return;
          } else {
            setSyncWarning('permission', rememberedFileHandle.name);
            return;
          }
        }
      } catch (e) {
        if (e && (e.name === 'NotFoundError' || e.name === 'NotReadableError')) {
          setSyncWarning('missing', rememberedFileHandle.name);
          showToast(`Warning: Sync file "${rememberedFileHandle.name}" is missing or disconnected.`, 'error');
          return;
        }
        setSyncWarning('permission', rememberedFileHandle.name);
      }
    }

    function setSyncWarning(type, fileName = '') {
      syncWarningState = { type, fileName, dismissed: false };
      renderSyncWarningBanner();
      updateSyncStatusUI();
    }

    function dismissSyncWarning() {
      syncWarningState.dismissed = true;
      renderSyncWarningBanner();
    }

    function renderSyncWarningBanner() {
      const banner = document.getElementById('syncWarningBanner');
      const msgEl = document.getElementById('syncWarningMsg');
      const actionsEl = document.getElementById('syncWarningActions');
      if (!banner || !msgEl || !actionsEl) return;

      // Never clutter mobile browsers (which lack FS Access API) with desktop-only file-link warnings
      if (!supportsFileSystemAccess() || ui.demoMode || linkedFileHandle || !syncWarningState.type || syncWarningState.dismissed) {
        banner.classList.add('hidden');
        return;
      }

      const name = escapeHtml(syncWarningState.fileName || 'shared database');
      banner.classList.remove('hidden');

      if (syncWarningState.type === 'missing') {
        banner.className = 'border-t border-rose-200 bg-rose-50 text-rose-900 px-4 py-2';
        msgEl.innerHTML = `<strong>Sync File Not Found:</strong> "${name}" could not be accessed (file moved, renamed, or drive disconnected). Changes are saved locally only.`;
        actionsEl.innerHTML = `
          <button type="button" onclick="openSharedDatabaseFile()" class="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition">Locate / Relink File</button>
          <button type="button" onclick="createSharedDatabaseFile()" class="px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-semibold transition">Create New</button>
          <button type="button" onclick="dismissSyncWarning()" class="px-2 py-1 rounded-lg text-rose-700 hover:underline font-medium">Dismiss</button>`;
      } else if (syncWarningState.type === 'permission') {
        banner.className = 'border-t border-amber-200 bg-amber-50 text-amber-900 px-4 py-2';
        msgEl.innerHTML = `<strong>Reconnect Sync File:</strong> Click to restore automatic sync with <code class="font-mono px-1 rounded bg-white/70">${name}</code> (browser security requires 1 click after restart).`;
        actionsEl.innerHTML = `
          <button type="button" onclick="reconnectRememberedFile()" class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">Reconnect Now</button>
          <button type="button" onclick="openSharedDatabaseFile()" class="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold transition">Choose Different File</button>
          <button type="button" onclick="dismissSyncWarning()" class="px-2 py-1 rounded-lg text-amber-800 hover:underline font-medium">Dismiss</button>`;
      } else if (syncWarningState.type === 'unlinked') {
        banner.className = 'border-t border-amber-200 bg-amber-50 text-amber-900 px-4 py-2';
        msgEl.innerHTML = `<strong>No Sync File Connected:</strong> Working in browser storage only. Link a shared <code class="font-mono px-1 rounded bg-white/70">.json</code> file (Google Drive or company server) for automatic team sync.`;
        actionsEl.innerHTML = `
          <button type="button" onclick="openSharedDatabaseFile()" class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">Open &amp; Link File</button>
          <button type="button" onclick="createSharedDatabaseFile()" class="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold transition">Create Sync File</button>
          <button type="button" onclick="dismissSyncWarning()" class="px-2 py-1 rounded-lg text-amber-800 hover:underline font-medium">Dismiss</button>`;
      }
    }

    async function attachAndLoadFileHandle(handle, isAutoReconnect = false, isSilentAutoReload = false) {
      let file;
      try {
        file = await handle.getFile();
      } catch (e) {
        linkedFileHandle = null;
        setSyncWarning('missing', handle.name);
        showToast(`Warning: Sync file "${handle.name}" was not found or is unreachable.`, 'error');
        return;
      }

      isReloadingFromFile = true;
      try {
        const rawText = (await file.text()).replace(/^\uFEFF/, '');
        const parsed = JSON.parse(rawText);
        const migrated = normalizeAndMigrateDB(parsed);
        if (!migrated) {
          if (!isSilentAutoReload) showToast('Selected JSON file is not a valid PulsePlan database.', 'error');
          return;
        }
        liveDB = migrated;
        ui.demoMode = false;
        clearUndoHistory();

        const shifted = isSilentAutoReload ? false : syncHorizonAfterDBLoad(liveDB);

        persistUIPrefs();
        linkedFileHandle = handle;
        rememberedFileHandle = handle;
        lastKnownFileModified = file.lastModified;
        pendingAutoReload = false;
        syncWarningState = { type: null, fileName: '', dismissed: false };
        document.getElementById('externalUpdateBanner').classList.add('hidden');
        if (!isSilentAutoReload) await saveRememberedHandle(handle);
        safeSetStorage(STORAGE_KEYS.LIVE_DB, JSON.stringify(liveDB));
        startFilePolling();
        renderAll();

        if (isSilentAutoReload) {
          const who = liveDB.meta?.lastModifiedBy || 'a teammate';
          showToast(`Auto-reloaded latest changes from "${handle.name}" (${who}, Rev ${liveDB.meta?.revision || '?'})`, 'info');
        } else {
          const allocCount = Object.keys(liveDB.allocations).length;
          showToast(
            `${isAutoReconnect ? 'Auto-reconnected' : 'Connected'} to "${handle.name}" (${liveDB.departments.length} depts, ${liveDB.projects.length} projects, ${allocCount} wk allocs${shifted ? ' — jumped to data start' : ''})`,
            'success'
          );
        }
      } catch (err) {
        console.error('Sync file parse error:', err);
        if (!isSilentAutoReload) showToast('Failed to parse JSON database file.', 'error');
      } finally {
        isReloadingFromFile = false;
      }
    }

    function unlinkSharedFile() {
      linkedFileHandle = null;
      rememberedFileHandle = null;
      lastKnownFileModified = 0;
      pendingAutoReload = false;
      stopFilePolling();
      clearRememberedHandle();
      document.getElementById('externalUpdateBanner').classList.add('hidden');
      setSyncWarning('unlinked', '');
      renderSyncTab();
      updateSyncStatusUI();
      showToast('Unlinked shared file — continuing in browser storage', 'info');
    }

    function scheduleAutoSaveToFile() {
      if (!linkedFileHandle || !ui.autoSaveToFile || ui.demoMode) return;
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      updateSyncStatusUI('saving');
      saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        writeDBToLinkedFile();
      }, 600);
    }

    async function writeDBToLinkedFile({ forceOverwrite = false } = {}) {
      if (!linkedFileHandle || ui.demoMode) return;
      isSavingToFile = true;
      try {
        // Pre-write conflict guard: detect external teammate edits before overwriting
        if (!forceOverwrite && lastKnownFileModified) {
          const diskFile = await linkedFileHandle.getFile();
          if (diskFile.lastModified > lastKnownFileModified + 500) {
            let extMeta = { lastModifiedBy: 'a teammate', revision: '?' };
            try {
              const parsed = JSON.parse((await diskFile.text()).replace(/^\uFEFF/, ''));
              if (parsed && parsed.meta) extMeta = parsed.meta;
            } catch (parseErr) {}
            updateSyncStatusUI('conflict');
            openSyncConflictModal(extMeta, diskFile.lastModified);
            return;
          }
        }
        if (getRetentionSettings(liveDB).autoPruneOnSave) {
          enforceRollingHistory(liveDB);
        }
        const writable = await linkedFileHandle.createWritable();
        await writable.write(JSON.stringify(liveDB, null, 2));
        await writable.close();
        const file = await linkedFileHandle.getFile();
        lastKnownFileModified = file.lastModified;
        updateSyncStatusUI('synced');
        if (ui.activeTab === 'sync') renderSyncTab();
      } catch (e) {
        console.warn('Auto-save failed:', e);
        if (e && (e.name === 'NotFoundError' || e.name === 'NotReadableError')) {
          const missingName = linkedFileHandle.name;
          linkedFileHandle = null;
          stopFilePolling();
          setSyncWarning('missing', missingName);
          showToast(`Sync file "${missingName}" is no longer reachable! Saved locally only.`, 'error');
          return;
        }
        updateSyncStatusUI('error');
        showToast('Auto-save to linked file failed. Check file permissions.', 'error');
      } finally {
        isSavingToFile = false;
      }
    }

    async function forceOverwriteLinkedFile() {
      closeModal();
      await writeDBToLinkedFile({ forceOverwrite: true });
      showToast('Kept your local changes and updated the shared sync file', 'success');
    }

    function startFilePolling() {
      stopFilePolling();
      if (!linkedFileHandle || !ui.pollIntervalMs) return;
      pollTimerId = setInterval(checkExternalFileUpdates, ui.pollIntervalMs);
    }

    function stopFilePolling() {
      if (pollTimerId) {
        clearInterval(pollTimerId);
        pollTimerId = null;
      }
    }

    function isModalOpen() {
      const overlay = document.getElementById('modalOverlay');
      return overlay && !overlay.classList.contains('hidden');
    }

    async function checkExternalFileUpdates() {
      if (!linkedFileHandle || ui.demoMode || isSavingToFile || isReloadingFromFile || saveDebounceTimer) return;
      try {
        const file = await linkedFileHandle.getFile();
        if (lastKnownFileModified && file.lastModified > lastKnownFileModified + 500) {
          if (ui.autoReloadFromFile) {
            if (isModalOpen()) {
              pendingAutoReload = true;
              const text = await file.text();
              const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
              const who = parsed.meta?.lastModifiedBy || 'a teammate';
              document.getElementById('externalUpdateMsg').textContent =
                `New update from ${who} will auto-load when you close this dialog.`;
              document.getElementById('externalUpdateBanner').classList.remove('hidden');
              return;
            }
            await attachAndLoadFileHandle(linkedFileHandle, false, true);
          } else {
            const text = await file.text();
            const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
            const who = parsed.meta?.lastModifiedBy || 'a teammate';
            const when = new Date(file.lastModified).toLocaleTimeString();
            document.getElementById('externalUpdateMsg').textContent =
              `New update in "${linkedFileHandle.name}" saved by ${who} at ${when} (Rev ${parsed.meta?.revision || '?'}).`;
            document.getElementById('externalUpdateBanner').classList.remove('hidden');
          }
        }
      } catch (e) {
        if (e && (e.name === 'NotFoundError' || e.name === 'NotReadableError')) {
          const missingName = linkedFileHandle.name;
          linkedFileHandle = null;
          stopFilePolling();
          setSyncWarning('missing', missingName);
          showToast(`Warning: Sync file "${missingName}" was disconnected or deleted.`, 'error');
        }
      }
    }

    async function reloadFromLinkedFile() {
      if (!linkedFileHandle) return;
      document.getElementById('externalUpdateBanner').classList.add('hidden');
      await attachAndLoadFileHandle(linkedFileHandle, false, true);
    }

    function dismissExternalUpdate() {
      pendingAutoReload = false;
      document.getElementById('externalUpdateBanner').classList.add('hidden');
    }

    function updateSyncStatusUI(state = 'idle') {
      const dot = document.getElementById('headerSyncDot');
      const text = document.getElementById('headerSyncText');
      const mDot = document.getElementById('mobileNavSyncDot');

      const setDots = (cls) => {
        if (dot) dot.className = `w-2 h-2 rounded-full ${cls}`;
        if (mDot) mDot.className = `absolute top-1.5 right-4 w-2 h-2 rounded-full ${cls}`;
      };

      if (ui.demoMode) {
        setDots('bg-amber-500');
        if (text) text.textContent = 'Demo Sandbox';
        return;
      }
      if (!linkedFileHandle) {
        if (!supportsFileSystemAccess()) {
          setDots('bg-emerald-500');
          if (text) text.textContent = 'Browser Saved';
          return;
        }
        if (syncWarningState.type === 'missing') {
          setDots('bg-rose-500');
          if (text) text.textContent = 'Sync Missing';
        } else if (syncWarningState.type === 'permission') {
          setDots('bg-amber-500');
          if (text) text.textContent = 'Reconnect Sync';
        } else {
          setDots('bg-amber-400');
          if (text) text.textContent = 'Local Only';
        }
        return;
      }
      if (state === 'saving') {
        setDots('bg-indigo-500 animate-ping');
        if (text) text.textContent = 'Saving...';
      } else if (state === 'conflict') {
        setDots('bg-rose-500 animate-pulse');
        if (text) text.textContent = 'Sync Conflict';
      } else if (state === 'error') {
        setDots('bg-rose-500');
        if (text) text.textContent = 'Sync Error';
      } else {
        setDots('bg-emerald-500');
        if (text) text.textContent = ui.autoReloadFromFile ? `Auto-Sync: ${linkedFileHandle.name}` : `Synced: ${linkedFileHandle.name}`;
      }
    }

    function renderSyncTab() {
      const db = getActiveDB();
      const ret = getRetentionSettings(db);
      const metrics = computePayloadMetrics(db);
      const hasFsApi = supportsFileSystemAccess();

      const badge = document.getElementById('syncCardBadge');
      const statusBox = document.getElementById('syncFileStatusBox');
      const fsControls = document.getElementById('desktopFsSyncControls');
      const btnReconnect = document.getElementById('btnReconnectFile');
      const btnUnlink = document.getElementById('btnUnlinkFile');

      if (fsControls) fsControls.classList.toggle('hidden', !hasFsApi);

      const chkSave = document.getElementById('chkAutoSave');
      const chkRel = document.getElementById('chkAutoReload');
      const pollSel = document.getElementById('pollIntervalSelect');
      if (chkSave) chkSave.checked = Boolean(ui.autoSaveToFile);
      if (chkRel) chkRel.checked = Boolean(ui.autoReloadFromFile);
      if (pollSel) pollSel.value = String(ui.pollIntervalMs);

      const fsNote = document.getElementById('fsApiNote');
      if (fsNote) {
        fsNote.textContent = hasFsApi
          ? 'Your browser supports direct auto-save & automatic live reload with Google Drive Desktop & company network folders.'
          : 'Mobile / Portable Mode: Your changes save automatically on this device. Use "Share / Save JSON" to send directly to Google Drive, iCloud Files, or Teams, and "Import JSON" to load updates.';
      }

      if (linkedFileHandle) {
        badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap';
        badge.textContent = ui.autoReloadFromFile ? 'Auto-Sync Active' : 'Live Linked';
        statusBox.innerHTML = `
          <div class="flex items-center justify-between"><span class="text-slate-500">Connected File:</span><span class="font-mono font-bold text-slate-900">${escapeHtml(linkedFileHandle.name)}</span></div>
          <div class="flex items-center justify-between"><span class="text-slate-500">Revision:</span><span class="font-semibold text-slate-800">Rev ${db.meta?.revision || 1}</span></div>
          <div class="flex items-center justify-between"><span class="text-slate-500">Last Saved:</span><span class="text-slate-700">${new Date(db.meta?.lastModifiedAt || Date.now()).toLocaleString()} by ${escapeHtml(db.meta?.lastModifiedBy || ui.userName)}</span></div>`;
        if (btnReconnect) btnReconnect.classList.add('hidden');
        if (btnUnlink) btnUnlink.classList.remove('hidden');
      } else if (!hasFsApi) {
        badge.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100 text-indigo-800 whitespace-nowrap';
        badge.textContent = 'Mobile / Local';
        statusBox.innerHTML = `
          <div class="flex items-center justify-between"><span class="text-slate-500">Storage:</span><span class="font-bold text-slate-900">Saved on Device (Rev ${db.meta?.revision || 1})</span></div>
          <div class="flex items-center justify-between"><span class="text-slate-500">Last Updated:</span><span class="text-slate-700">${new Date(db.meta?.lastModifiedAt || Date.now()).toLocaleString()}</span></div>
          <div class="text-[11px] text-slate-600 pt-1">Tap <strong>Share / Save JSON</strong> below to push updates straight to Google Drive, Files, or Teams, or tap <strong>Import JSON</strong> to open a colleague&rsquo;s latest file.</div>`;
      } else {
        badge.className = syncWarningState.type === 'missing'
          ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-700 whitespace-nowrap'
          : 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap';
        badge.textContent = syncWarningState.type === 'missing' ? 'File Missing' : 'Local Only';
        statusBox.innerHTML = `
          <div class="text-slate-700">
            ${rememberedFileHandle
              ? `Last linked file: <code class="font-mono font-bold">${escapeHtml(rememberedFileHandle.name)}</code> — click <strong>Reconnect Remembered File</strong> or relink it.`
              : 'Currently saving to browser storage only. Link a shared <code class="font-mono">.json</code> file in your Google Drive Desktop or network folder to sync with your team.'}
          </div>`;
        if (btnReconnect) btnReconnect.classList.toggle('hidden', !rememberedFileHandle);
        if (btnUnlink) btnUnlink.classList.add('hidden');
      }

      // Snapshots List (with Mod 3 Baseline Pinning)
      const snapBadge = document.getElementById('snapshotsCountBadge');
      if (snapBadge) {
        snapBadge.textContent = `${metrics.unpinnedSnapCount}/${ret.maxSnapshots} unpinned${metrics.pinnedSnapCount ? ` • ${metrics.pinnedSnapCount} pinned` : ''}`;
      }
      const snapList = document.getElementById('snapshotsList');
      if (db.snapshots.length === 0) {
        snapList.innerHTML = '<p class="text-xs text-slate-400 py-8 text-center">No snapshots saved yet. Tap "+ Save" to freeze a baseline.</p>';
      } else {
        snapList.innerHTML = db.snapshots.map(s => `
          <div class="p-3.5 rounded-xl border ${s.pinned ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/70'} flex flex-wrap items-start justify-between gap-2 text-xs">
            <div class="space-y-0.5 min-w-0">
              <div class="font-bold text-slate-900 flex items-center gap-1.5">
                ${s.pinned ? '<span title="Pinned baseline (protected from rolling eviction)" class="text-amber-600">📌</span>' : ''}
                <span>${escapeHtml(s.name)}</span>
              </div>
              <div class="text-[11px] text-slate-500">${new Date(s.createdAt).toLocaleString()} &bull; ${escapeHtml(s.createdBy || 'PM')}</div>
              ${s.notes ? `<div class="text-[11px] text-slate-600 pt-1">${escapeHtml(s.notes)}</div>` : ''}
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" onclick="toggleSnapshotPin('${s.id}')" title="${s.pinned ? 'Unpin snapshot' : 'Pin baseline to protect from rolling eviction'}"
                class="px-2.5 py-1.5 md:px-2 md:py-1 rounded-lg border text-[11px] font-semibold transition ${s.pinned ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">
                ${s.pinned ? 'Pinned' : 'Pin'}
              </button>
              <button type="button" onclick="ui.compareSnapshotId='${s.id}'; ui.compareTargetId='__CURRENT__'; switchTab('health')" class="px-2.5 py-1.5 md:py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition">Compare</button>
              <button type="button" onclick="restoreSnapshot('${s.id}')" class="px-2.5 py-1.5 md:py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition">Restore</button>
              <button type="button" onclick="deleteSnapshot('${s.id}')" class="px-2 py-1.5 md:py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition">Delete</button>
            </div>
          </div>`).join('');
      }

      // Mod 3: Rolling Dump History & Payload Breakdown UI
      const totalBadge = document.getElementById('payloadTotalBadge');
      if (totalBadge) totalBadge.textContent = `Total DB: ${formatBytes(metrics.totalBytes)}`;

      const grid = document.getElementById('payloadBreakdownGrid');
      if (grid) {
        const snapHigh = Math.max(1, Math.round(ret.maxSnapshots * 0.8));
        const logHigh = Math.max(1, Math.round(ret.maxChangeLog * 0.8));
        const dumpHigh = Math.max(1, Math.round(ret.maxDumpHistory * 0.8));
        grid.innerHTML = `
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Core Roadmap Data</dt>
            <dd class="text-sm font-extrabold text-slate-900 tabular-nums">${formatBytes(metrics.coreBytes)}</dd>
            <div class="text-[11px] text-slate-500">${db.departments.length} depts &bull; ${db.projects.length} projs &bull; ${Object.keys(db.allocations || {}).length} wk allocs</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between">
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Snapshots</dt>
              <span class="text-[11px] font-bold text-slate-700 tabular-nums">${formatBytes(metrics.snapsBytes)}</span>
            </div>
            <dd class="text-xs font-bold text-slate-800 tabular-nums">${metrics.unpinnedSnapCount} / ${ret.maxSnapshots} unpinned ${metrics.pinnedSnapCount ? `(+${metrics.pinnedSnapCount} 📌)` : ''}</dd>
            <meter class="retention-meter" min="0" max="${ret.maxSnapshots}" low="${Math.max(1, Math.round(ret.maxSnapshots * 0.5))}" high="${snapHigh}" optimum="0" value="${Math.min(ret.maxSnapshots, metrics.unpinnedSnapCount)}">${metrics.unpinnedSnapCount} of ${ret.maxSnapshots}</meter>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between">
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Change Log</dt>
              <span class="text-[11px] font-bold text-slate-700 tabular-nums">${formatBytes(metrics.logBytes)}</span>
            </div>
            <dd class="text-xs font-bold text-slate-800 tabular-nums">${metrics.logCount} / ${ret.maxChangeLog} records</dd>
            <meter class="retention-meter" min="0" max="${ret.maxChangeLog}" low="${Math.max(1, Math.round(ret.maxChangeLog * 0.5))}" high="${logHigh}" optimum="0" value="${Math.min(ret.maxChangeLog, metrics.logCount)}">${metrics.logCount} of ${ret.maxChangeLog}</meter>
          </div>
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between">
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dump History</dt>
              <span class="text-[11px] font-bold text-slate-700 tabular-nums">${formatBytes(metrics.dumpBytes)}</span>
            </div>
            <dd class="text-xs font-bold text-slate-800 tabular-nums">${metrics.dumpCount} / ${ret.maxDumpHistory} records</dd>
            <meter class="retention-meter" min="0" max="${ret.maxDumpHistory}" low="${Math.max(1, Math.round(ret.maxDumpHistory * 0.5))}" high="${dumpHigh}" optimum="0" value="${Math.min(ret.maxDumpHistory, metrics.dumpCount)}">${metrics.dumpCount} of ${ret.maxDumpHistory}</meter>
          </div>`;
      }

      const inpDump = document.getElementById('syncMaxDumpHistory');
      const inpLog = document.getElementById('syncMaxChangeLog');
      const inpSnap = document.getElementById('syncMaxSnapshots');
      if (inpDump) inpDump.value = ret.maxDumpHistory;
      if (inpLog) inpLog.value = ret.maxChangeLog;
      if (inpSnap) inpSnap.value = ret.maxSnapshots;
      previewRollingPrune();

      const dumpTable = document.getElementById('dumpHistoryTable');
      const dumps = db.dumpHistory || [];
      if (dumpTable) {
        if (dumps.length === 0) {
          dumpTable.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No exports or dumps recorded yet. Share or save a JSON, CSV, or PDF to populate the rolling history.</p>';
        } else {
          const fmtStyles = {
            JSON: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            PDF: 'bg-rose-50 text-rose-700 border-rose-200',
            CSV: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            ARCHIVE: 'bg-amber-50 text-amber-800 border-amber-200',
          };
          dumpTable.innerHTML = `
            <table class="w-full text-left text-xs">
              <caption class="sr-only">Rolling history of recent database exports and dumps</caption>
              <thead class="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th scope="col" class="px-3 py-2">When</th>
                  <th scope="col" class="px-3 py-2">Format</th>
                  <th scope="col" class="px-3 py-2">File</th>
                  <th scope="col" class="px-3 py-2">User</th>
                  <th scope="col" class="px-3 py-2">Rev</th>
                  <th scope="col" class="px-3 py-2 text-right">Size</th>
                  <th scope="col" class="px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${dumps.map(d => `
                  <tr class="hover:bg-slate-50/70">
                    <td class="px-3 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">${new Date(d.timestamp).toLocaleString()}</td>
                    <td class="px-3 py-2"><span class="px-1.5 py-0.5 rounded border text-[10px] font-bold ${fmtStyles[d.format] || 'bg-slate-100 text-slate-700 border-slate-200'}">${escapeHtml(d.format)}</span></td>
                    <td class="px-3 py-2 font-mono text-[11px] text-slate-800 max-w-[180px] truncate" title="${escapeHtml(d.filename)}">${escapeHtml(d.filename || '—')}</td>
                    <td class="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">${escapeHtml(d.user)}</td>
                    <td class="px-3 py-2 font-mono text-slate-500">v${d.revision || 1}</td>
                    <td class="px-3 py-2 text-right tabular-nums text-slate-600 whitespace-nowrap">${d.sizeBytes ? formatBytes(d.sizeBytes) : '—'}</td>
                    <td class="px-3 py-2 text-slate-600">${escapeHtml(d.summary || '—')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`;
        }
      }
    }

    function readSyncRetentionLimitsFromUI() {
      const db = getActiveDB();
      const cur = getRetentionSettings(db);
      return {
        maxDumpHistory: Math.max(5, Math.min(100, parseInt(document.getElementById('syncMaxDumpHistory')?.value, 10) || cur.maxDumpHistory)),
        maxChangeLog: Math.max(10, Math.min(500, parseInt(document.getElementById('syncMaxChangeLog')?.value, 10) || cur.maxChangeLog)),
        maxSnapshots: Math.max(1, Math.min(50, parseInt(document.getElementById('syncMaxSnapshots')?.value, 10) || cur.maxSnapshots)),
        autoPruneOnSave: cur.autoPruneOnSave,
      };
    }

    function previewRollingPrune() {
      const db = getActiveDB();
      const limits = readSyncRetentionLimitsFromUI();
      const dry = enforceRollingHistory(db, { dryRun: true, limits });
      const previewEl = document.getElementById('retentionPrunePreview');
      const archBtn = document.getElementById('btnArchiveAndPrune');
      const totalWillPrune = dry.prunedLog + dry.prunedSnaps + dry.prunedDumps;

      if (previewEl) {
        if (totalWillPrune > 0 || dry.orphansRemoved > 0) {
          const parts = [];
          if (dry.prunedDumps) parts.push(`${dry.prunedDumps} dump record(s)`);
          if (dry.prunedLog) parts.push(`${dry.prunedLog} change log entry(ies)`);
          if (dry.prunedSnaps) parts.push(`${dry.prunedSnaps} unpinned snapshot(s)`);
          if (dry.orphansRemoved) parts.push(`${dry.orphansRemoved} orphan key(s)`);
          previewEl.innerHTML = `<span class="text-amber-700 font-semibold">Pending cleanup:</span> will trim ${parts.join(', ')} (~${formatBytes(dry.savedBytes)} saved).`;
        } else {
          previewEl.textContent = 'All rolling history streams are cleanly within your selected limits.';
        }
      }
      if (archBtn) archBtn.classList.toggle('hidden', totalWillPrune === 0);
    }

    function compactDatabaseNow() {
      const db = getActiveDB();
      const limits = readSyncRetentionLimitsFromUI();
      db.settings.retention = limits;
      const res = enforceRollingHistory(db, { dryRun: false, limits });
      touchDBAndSave();
      renderAll();
      const out = document.getElementById('compactOutputMsg');
      const totalPruned = res.prunedLog + res.prunedSnaps + res.prunedDumps + res.orphansRemoved;
      const msg = totalPruned > 0
        ? `Compacted: removed ${totalPruned} item(s), saved ${formatBytes(res.savedBytes)}.`
        : 'Retention limits saved — database is already compact.';
      if (out) out.textContent = msg;
      showToast(msg, 'success');
    }

    async function archiveAndPruneHistory() {
      const db = getActiveDB();
      const limits = readSyncRetentionLimitsFromUI();
      const dry = enforceRollingHistory(db, { dryRun: true, limits });
      if (dry.retiredArchive) {
        const archiveJson = JSON.stringify(dry.retiredArchive, null, 2);
        const fname = `pulseplan_retired_history_${new Date().toISOString().slice(0, 10)}.json`;
        const outcome = await shareOrDownloadFile(new Blob([archiveJson], { type: 'application/json' }), fname, 'application/json', 'PulsePlan Retired History Archive');
        if (outcome === 'cancelled') return;
        recordDumpEvent('ARCHIVE', fname, archiveJson.length, `Archived ${dry.prunedSnaps} snaps, ${dry.prunedLog} logs, ${dry.prunedDumps} dumps`);
      }
      compactDatabaseNow();
    }

    function clearDumpHistory() {
      const db = getActiveDB();
      if (!db.dumpHistory || db.dumpHistory.length === 0) return;
      openConfirmModal('Clear Rolling Dump History', `Clear all ${db.dumpHistory.length} entries from the rolling dump log? Your roadmap data and snapshots will not be affected.`, 'Clear Log', () => {
        db.dumpHistory = [];
        touchDBAndSave();
        renderSyncTab();
        showToast('Dump history cleared', 'info');
      });
    }

    function toggleSnapshotPin(id) {
      const db = getActiveDB();
      const snap = db.snapshots.find(s => s.id === id);
      if (!snap) return;
      snap.pinned = !snap.pinned;
      touchDBAndSave();
      renderAll();
      showToast(snap.pinned ? `Pinned "${snap.name}" (protected from rolling eviction)` : `Unpinned "${snap.name}"`, 'info');
    }

    function toggleAutoSave(checked) {
      ui.autoSaveToFile = checked;
      persistUIPrefs();
      showToast(checked ? 'Auto-save enabled' : 'Auto-save paused', 'info');
    }

    function toggleAutoReload(checked) {
      ui.autoReloadFromFile = checked;
      persistUIPrefs();
      updateSyncStatusUI();
      if (ui.activeTab === 'sync') renderSyncTab();
      if (checked && linkedFileHandle) checkExternalFileUpdates();
      showToast(
        checked
          ? 'Auto-reload enabled — team updates will load automatically'
          : 'Auto-reload paused — banner will prompt before reloading',
        'info'
      );
    }

    function setPollInterval(val) {
      ui.pollIntervalMs = parseInt(val, 10) || 0;
      persistUIPrefs();
      startFilePolling();
      showToast(ui.pollIntervalMs ? `Checking shared file every ${ui.pollIntervalMs / 1000}s` : 'Auto-polling disabled', 'info');
    }

