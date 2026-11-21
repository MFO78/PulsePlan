    /* ============================================================================
     * 11. MOBILE SHEETS, UI ACTIONS, THEME, MEETING VIEW & TOAST NOTIFICATIONS
     * ============================================================================ */

    function openMobileFiltersSheet() {
      syncMobileControlsUI(getActiveDB());
      const dlg = document.getElementById('mobileFiltersSheet');
      if (!dlg) return;
      if (typeof dlg.showModal === 'function') {
        if (!dlg.open) dlg.showModal();
      } else {
        dlg.setAttribute('open', 'open');
      }
    }

    function openMobileQuickAddSheet() {
      const dlg = document.getElementById('mobileQuickAddSheet');
      if (!dlg) return;
      if (typeof dlg.showModal === 'function') {
        if (!dlg.open) dlg.showModal();
      } else {
        dlg.setAttribute('open', 'open');
      }
    }

    function toggleMobileLayoutMode() {
      ui.mobileLayoutMode = ui.mobileLayoutMode === 'grid' ? 'cards' : 'grid';
      persistUIPrefs();
      triggerHaptic(8);
      renderAll();
      showToast(ui.mobileLayoutMode === 'grid' ? 'Compact 2D Matrix Grid active' : 'Period-Focus Card Deck active', 'info');
    }

    function switchTab(tab) {
      ui.activeTab = tab;
      persistUIPrefs();
      renderAll();
      if (isMobileViewport()) {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
      }
    }

    function applyDarkMode() {
      const isDark = Boolean(ui.darkMode);
      document.documentElement.classList.toggle('dark', isDark);
      const btn = document.getElementById('darkModeToggleBtn');
      if (btn) btn.setAttribute('aria-pressed', String(isDark));
      const chip = document.getElementById('darkModeStateChip');
      if (chip) {
        chip.textContent = isDark ? 'ON' : 'OFF';
        chip.className = isDark
          ? 'text-[10px] font-bold text-indigo-400'
          : 'text-[10px] font-bold text-slate-400';
      }
      const moon = document.getElementById('darkModeIconMoon');
      const sun = document.getElementById('darkModeIconSun');
      if (moon && sun) {
        moon.classList.toggle('hidden', isDark);
        sun.classList.toggle('hidden', !isDark);
      }
    }

    function toggleHeaderWorkspaceMenu(event) {
      if (event) event.stopPropagation();
      const pop = document.getElementById('headerWorkspacePopover');
      const btn = document.getElementById('headerMenuBtn');
      const chev = document.getElementById('headerMenuChevron');
      if (!pop || !btn) return;
      const willOpen = pop.classList.contains('hidden');
      pop.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
      if (chev) chev.textContent = willOpen ? '▴' : '▾';
    }

    function closeHeaderWorkspaceMenu() {
      const pop = document.getElementById('headerWorkspacePopover');
      const btn = document.getElementById('headerMenuBtn');
      const chev = document.getElementById('headerMenuChevron');
      if (pop) pop.classList.add('hidden');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (chev) chev.textContent = '▾';
    }

    function setMeetingNoteSize(size) {
      ui.meetingNoteSize = (size === 'sm' || size === 'lg') ? size : 'md';
      persistUIPrefs();
      renderAll();
    }

    function toggleDarkMode() {
      ui.darkMode = !ui.darkMode;
      persistUIPrefs();
      applyDarkMode();
      if (ui.activeTab === 'health') renderHealthDashboard();
      showToast(ui.darkMode ? 'Dark Mode enabled' : 'Light Mode enabled', 'info');
    }

    function applyMeetingMode() {
      const active = Boolean(ui.meetingMode);
      document.documentElement.classList.toggle('meeting-view', active);
      const btn = document.getElementById('meetingModeToggleBtn');
      const lbl = document.getElementById('meetingModeLabel');
      if (btn && lbl) {
        btn.setAttribute('aria-pressed', String(active));
        if (active) {
          btn.className = 'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-400 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer';
          lbl.textContent = 'Meeting View: ON';
        } else {
          btn.className = 'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer';
          lbl.textContent = 'Meeting View';
        }
      }
    }

    function toggleMeetingMode() {
      ui.meetingMode = !ui.meetingMode;
      const curH = Number(ui.meetingHorizon);
      if (ui.meetingMode && (!Number.isInteger(curH) || curH < 1 || curH > 4)) {
        ui.meetingHorizon = 2;
      }
      persistUIPrefs();
      renderAll();
      const modeNames = { accent: 'accent-border', fill: 'color-filled', fte: '6-tier FTE', fte3: '3-level G/Y/R demand' };
      showToast(
        ui.meetingMode
          ? `Meeting View ON — clean ${ui.meetingHorizon}-period layout with ${modeNames[getActiveCellColorMode()]} cards`
          : 'Standard View restored',
        'info'
      );
    }

    function setCellColorMode(mode) {
      const valid = (mode === 'fill' || mode === 'fte' || mode === 'fte3') ? mode : 'accent';
      if (ui.meetingMode) ui.meetingCellColorMode = valid;
      else ui.cellColorMode = valid;
      persistUIPrefs();
      renderAll();
      const labels = {
        accent: 'Accent Border',
        fill: 'Full Color Fill',
        fte: '6-Tier FTE Heat Scale',
        fte3: '3-Level Demand (Green / Yellow / Red)',
      };
      showToast(`Cell cards switched to ${labels[valid]}`, 'info');
    }

    function toggleShowCellComments() {
      ui.showCellComments = !ui.showCellComments;
      persistUIPrefs();
      renderAll();
    }

    function toggleDemoMode() {
      if (ui.whatIfMode) {
        ui.whatIfMode = false;
        whatIfDB = null;
      }
      ui.demoMode = !ui.demoMode;
      ui.filterDept = 'all';
      ui.filterProj = 'all';
      ui.spotlightProjId = '';
      ui.compareSnapshotId = '';
      ui.compareTargetId = '__CURRENT__';
      ui.mobileSelectedPeriod = '';
      clearUndoHistory();
      if (!ui.demoMode && supportsFileSystemAccess() && !linkedFileHandle && !syncWarningState.type) {
        syncWarningState = rememberedFileHandle
          ? { type: 'permission', fileName: rememberedFileHandle.name, dismissed: false }
          : { type: 'unlinked', fileName: '', dismissed: false };
      }
      persistUIPrefs();
      renderAll();
      showToast(
        ui.demoMode
          ? 'Demo Mode enabled — explore freely without touching your Live DB'
          : 'Switched to Live Company Database',
        'info'
      );
    }

    function setAxis(axis) { ui.axis = axis; persistUIPrefs(); renderAll(); }
    function setTimeUnit(unit) {
      if (ui.timeUnit !== unit) {
        if (unit === 'week') {
          const wks = getWeeksInMonth(ui.startMonth);
          if (wks.length) ui.startWeek = wks[0];
        } else {
          ui.startMonth = getWeekOwningMonth(ui.startWeek);
        }
        ui.timeUnit = unit;
        ui.mobileSelectedPeriod = '';
        persistUIPrefs();
        renderAll();
      }
    }
    function setManpowerUnit(unit) { ui.manpowerUnit = unit; persistUIPrefs(); renderAll(); }
    function setHorizon(val) {
      if (ui.meetingMode) {
        ui.meetingHorizon = Math.max(1, Math.min(4, parseInt(val, 10) || 2));
      } else {
        ui.horizon = Math.max(1, Math.min(24, parseInt(val, 10) || 6));
      }
      persistUIPrefs();
      renderAll();
    }
    function stepHorizon(delta) {
      const options = ui.meetingMode ? [1, 2, 3, 4] : [1, 2, 4, 6, 8, 12, 16, 24];
      const cur = getActiveHorizon();
      let idx = options.indexOf(cur);
      if (idx === -1) {
        idx = options.findIndex(v => v >= cur);
        if (idx === -1) idx = options.length - 1;
      }
      const nextIdx = Math.max(0, Math.min(options.length - 1, idx + delta));
      if (options[nextIdx] !== cur) setHorizon(options[nextIdx]);
    }
    function shiftStartPeriod(delta) {
      if (ui.timeUnit === 'month') ui.startMonth = addMonthsToMonthKey(ui.startMonth, delta);
      else ui.startWeek = addWeeksToWeekKey(ui.startWeek, delta);
      persistUIPrefs();
      renderAll();
    }
    function jumpToToday() {
      ui.startMonth = getCurrentMonthKey();
      ui.startWeek = getCurrentWeekKey();
      ui.mobileSelectedPeriod = ui.timeUnit === 'month' ? ui.startMonth : ui.startWeek;
      persistUIPrefs();
      renderAll();
    }
    function setStartPeriodDirect(val) {
      if (!val) return;
      if (ui.timeUnit === 'month') ui.startMonth = val;
      else ui.startWeek = val;
      ui.mobileSelectedPeriod = val;
      persistUIPrefs();
      renderAll();
    }
    function setFilterDept(val) { ui.filterDept = val; renderAll(); }
    function setFilterProj(val) { ui.filterProj = val; renderAll(); }
    function toggleDragMode() {
      ui.dragMode = ui.dragMode === 'move' ? 'copy' : 'move';
      persistUIPrefs();
      renderAll();
    }
    function toggleHideEmptyRows() {
      ui.hideEmptyRows = !ui.hideEmptyRows;
      persistUIPrefs();
      renderAll();
    }
    function toggleMatrixSettingsDrawer() {
      ui.matrixSettingsOpen = !ui.matrixSettingsOpen;
      persistUIPrefs();
      renderAll();
    }
    function setSpotlightProject(projId) {
      ui.spotlightProjId = projId || '';
      renderAll();
    }
    function toggleSpotlightProject(projId) {
      ui.spotlightProjId = ui.spotlightProjId === projId ? '' : (projId || '');
      renderAll();
    }
    function setMatrixSearch(val) {
      ui.matrixSearch = String(val || '');
      if (ui.activeTab === 'matrix') {
        if (shouldRenderMobileCards()) renderMobileMatrixCards();
        else renderMatrix();
        const clearBtn = document.getElementById('btnClearMatrixFilters');
        if (clearBtn) {
          const hasAnyFilter = Boolean(ui.matrixSearch.trim() || ui.filterOverOnly || ui.filterAtRiskOnly || ui.filterHasNotesOnly || ui.filterDept !== 'all' || ui.filterProj !== 'all');
          clearBtn.classList.toggle('hidden', !hasAnyFilter);
        }
      }
    }
    function toggleQuickFilter(kind) {
      if (kind === 'over') ui.filterOverOnly = !ui.filterOverOnly;
      else if (kind === 'atRisk') ui.filterAtRiskOnly = !ui.filterAtRiskOnly;
      else if (kind === 'notes') ui.filterHasNotesOnly = !ui.filterHasNotesOnly;
      renderAll();
    }
    function clearMatrixFilters() {
      ui.matrixSearch = '';
      ui.filterOverOnly = false;
      ui.filterAtRiskOnly = false;
      ui.filterHasNotesOnly = false;
      ui.filterDept = 'all';
      ui.filterProj = 'all';
      renderAll();
    }
    function toggleFullscreenPresentation() {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      } catch (e) {}
    }

    // Mod 2 Snapshot Comparison Controls
    function setCompareSnapshot(id) {
      ui.compareSnapshotId = id;
      persistUIPrefs();
      renderSnapshotComparison();
    }
    function setCompareTarget(id) {
      ui.compareTargetId = id || '__CURRENT__';
      persistUIPrefs();
      renderSnapshotComparison();
    }
    function swapCompareSnapshots() {
      if (!ui.compareSnapshotId || ui.compareTargetId === '__CURRENT__') {
        showToast('Select two saved snapshots to swap Baseline (A) and Target (B).', 'info');
        return;
      }
      const tmp = ui.compareSnapshotId;
      ui.compareSnapshotId = ui.compareTargetId;
      ui.compareTargetId = tmp;
      persistUIPrefs();
      renderHealthDashboard();
    }
    function toggleCompareChangedOnly(checked) {
      ui.compareChangedOnly = Boolean(checked);
      persistUIPrefs();
      renderSnapshotComparison();
    }
    function setSnapshotCompareTab(sub) {
      ui.compareSubTab = sub;
      persistUIPrefs();
      renderSnapshotComparison();
    }

    function showToast(msg, type = 'info', opts = {}) {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const styles = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
        warning: 'bg-amber-500 text-white',
        info: 'bg-slate-900 text-white',
      };
      const toast = document.createElement('div');
      toast.className = `pointer-events-auto px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center justify-between gap-2.5 transition-all ${styles[type] || styles.info}`;
      const msgSpan = document.createElement('span');
      msgSpan.textContent = msg;
      toast.appendChild(msgSpan);

      if (opts && opts.undoable && _undoStack.length > 0) {
        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold underline shrink-0 transition';
        undoBtn.textContent = 'Undo';
        undoBtn.onclick = () => {
          toast.remove();
          undoLastChange();
        };
        toast.appendChild(undoBtn);
      }

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
      }, opts && opts.undoable ? 4400 : 3200);
    }

    /* ============================================================================
     * 12. INITIALIZATION, VIEWPORT ADAPTATION & ACCESSIBLE KEYBOARD NAV
     * ============================================================================ */

    let _lastWasMobileViewport = null;

    function setupResponsiveViewportWatcher() {
      _lastWasMobileViewport = isMobileViewport();
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const nowMobile = isMobileViewport();
          if (nowMobile !== _lastWasMobileViewport) {
            _lastWasMobileViewport = nowMobile;
            renderAll();
          } else {
            syncMatrixFloatingHeaderMetrics();
            updateMatrixFloatingHeaderVisibility();
          }
        }, 120);
      });
    }

    function setupAccessibleTablistKeyboardNav() {
      document.addEventListener('fullscreenchange', () => {
        const fsBtn = document.getElementById('meetingFullscreenBtn');
        if (fsBtn) fsBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
        requestAnimationFrame(() => {
          syncMatrixFloatingHeaderMetrics();
          updateMatrixFloatingHeaderVisibility();
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen()) {
          closeModal();
          return;
        }

        // Keep Tab focus trapped cleanly inside open modal dialog (WCAG 2.4.3)
        if (e.key === 'Tab' && isModalOpen()) {
          const card = document.getElementById('modalCard');
          if (!card) return;
          const focusables = [...card.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
          return;
        }

        const active = document.activeElement;
        const isTyping = active && (
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable
        );
        const anyDialogOpen = isModalOpen() || Boolean(document.querySelector('dialog[open]'));

        // Global Undo / Redo shortcuts (Ctrl+Z / Cmd+Z / Ctrl+Y / Cmd+Shift+Z)
        if (!isTyping && !anyDialogOpen && (e.ctrlKey || e.metaKey) && !e.altKey) {
          const k = e.key.toLowerCase();
          if (k === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoLastChange();
            return;
          }
          if (k === 'y' || (k === 'z' && e.shiftKey)) {
            e.preventDefault();
            redoLastChange();
            return;
          }
        }

        // ArrowLeft / ArrowRight navigation for WAI-ARIA role="tablist"
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && active && active.getAttribute('role') === 'tab') {
          const tablist = active.closest('[role="tablist"]');
          if (tablist) {
            const tabs = [...tablist.querySelectorAll('[role="tab"]:not([disabled])')];
            const idx = tabs.indexOf(active);
            if (idx !== -1) {
              e.preventDefault();
              const nextIdx = e.key === 'ArrowRight'
                ? (idx + 1) % tabs.length
                : (idx - 1 + tabs.length) % tabs.length;
              tabs[nextIdx].focus();
              tabs[nextIdx].click();
              return;
            }
          }
        }

        // Open Built-In User Manual with '?' from any tab
        if (!isTyping && !anyDialogOpen && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === '?') {
          e.preventDefault();
          openManualModal();
          return;
        }

        // Roadmap & Meeting View Presenter Keyboard Shortcuts
        if (isTyping || anyDialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'Escape') {
          const pop = document.getElementById('headerWorkspacePopover');
          if (pop && !pop.classList.contains('hidden')) {
            closeHeaderWorkspaceMenu();
            return;
          }
          if (ui.activeTab === 'matrix') {
            if (ui.spotlightProjId) {
              setSpotlightProject('');
            } else if (ui.meetingMode) {
              toggleMeetingMode();
            }
          }
          return;
        }
        if (ui.activeTab !== 'matrix') return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          shiftStartPeriod(-1);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          shiftStartPeriod(1);
          return;
        }
        if (ui.meetingMode && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          setHorizon(Number(e.key));
          return;
        }
        const lower = e.key.toLowerCase();
        if (lower === 't') {
          e.preventDefault();
          jumpToToday();
        } else if (lower === 'm') {
          e.preventDefault();
          toggleMeetingMode();
        } else if (lower === 'f' && ui.meetingMode) {
          e.preventDefault();
          toggleFullscreenPresentation();
        }
      });

      document.addEventListener('click', (e) => {
        const wrap = document.getElementById('headerMenuWrap');
        if (wrap && !wrap.contains(e.target)) closeHeaderWorkspaceMenu();
      });
    }

    async function initApp() {
      // 1. Load saved UI preferences (preserving all Mobile Hybrid + Mod 1–4 defaults on upgrade)
      try {
        const savedUI = safeGetStorage(STORAGE_KEYS.UI_PREFS);
        if (savedUI) {
          const parsedUI = JSON.parse(savedUI);
          const mergedPdfOpts = {
            colorMode: 'match',
            colsPerPage: 6,
            ...ui.pdfOptions,
            ...(parsedUI.pdfOptions || {}),
          };
          ui = { ...ui, ...parsedUI, pdfOptions: mergedPdfOpts };
          if (parsedUI.autoReloadFromFile === undefined) ui.autoReloadFromFile = true;
          if (parsedUI.meetingHorizon === undefined) ui.meetingHorizon = 2;
          if (parsedUI.meetingNoteSize === undefined) ui.meetingNoteSize = 'md';
          if (parsedUI.cellColorMode === undefined) ui.cellColorMode = 'accent';
          if (parsedUI.meetingCellColorMode === undefined) ui.meetingCellColorMode = 'fill';
          if (parsedUI.mobileLayoutMode === undefined) ui.mobileLayoutMode = 'cards';
          if (!Array.isArray(ui.mobileCollapsedIds)) ui.mobileCollapsedIds = [];
          if (parsedUI.compareTargetId === undefined) ui.compareTargetId = '__CURRENT__';
          if (parsedUI.compareChangedOnly === undefined) ui.compareChangedOnly = true;
          if (parsedUI.compareSubTab === undefined) ui.compareSubTab = 'deptPeriod';
          if (parsedUI.hideEmptyRows === undefined) ui.hideEmptyRows = false;
          ui.spotlightProjId = '';
          ui.matrixSearch = '';
          ui.filterOverOnly = false;
          ui.filterAtRiskOnly = false;
          ui.filterHasNotesOnly = false;
          if (!Array.isArray(ui.recentUsers)) ui.recentUsers = [];
        } else {
          ui.pdfOptions = { colorMode: 'match', colsPerPage: 6, ...ui.pdfOptions };
        }
      } catch (e) {}

      // 2. Load or initialize Live DB
      try {
        const savedLive = safeGetStorage(STORAGE_KEYS.LIVE_DB);
        liveDB = savedLive ? (normalizeAndMigrateDB(JSON.parse(savedLive)) || createEmptyDB()) : createEmptyDB();
      } catch (e) {
        liveDB = createEmptyDB();
      }

      // 3. Load or initialize isolated Demo DB
      try {
        const savedDemo = safeGetStorage(STORAGE_KEYS.DEMO_DB);
        demoDB = savedDemo ? (normalizeAndMigrateDB(JSON.parse(savedDemo)) || createSampleDemoDB()) : createSampleDemoDB();
      } catch (e) {
        demoDB = createSampleDemoDB();
      }

      // 4. Retrieve previously linked shared file handle (desktop FS-API)
      rememberedFileHandle = await loadRememberedHandle();

      // 5. Accessible keyboard nav, modal focus trap, floating column headers & responsive watcher
      setupAccessibleTablistKeyboardNav();
      setupResponsiveViewportWatcher();
      setupMatrixFloatingHeaderSync();

      // 6. Auto-check linked file immediately whenever the window/tab regains focus
      window.addEventListener('focus', () => {
        if (linkedFileHandle && !ui.demoMode) checkExternalFileUpdates();
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && linkedFileHandle && !ui.demoMode) checkExternalFileUpdates();
      });

      // 7. Apply theme & render UI immediately
      applyDarkMode();
      applyMeetingMode();
      renderAll();

      // 8. Auto-reconnect to remembered sync file on desktop (stays clean & warning-free on mobile)
      await autoReconnectSyncFile();
    }

    window.addEventListener('DOMContentLoaded', initApp);
