    /* ============================================================================
     * 13. BUILT-IN SEARCHABLE USER MANUAL & FEATURE REFERENCE
     * ============================================================================ */

    const MANUAL_SECTIONS = [
      {
        id: 'overview',
        title: 'Getting Started & Core Concepts',
        badge: 'Basics',
        keywords: 'getting started demo live database fte days hours weekly pro rata departments projects milestones setup',
        bodyHtml: `
          <p class="text-slate-600 leading-relaxed">
            <strong>PulsePlan</strong> is a self-contained, offline-ready company roadmap, capacity, and utilisation planner.
            All data lives locally in your browser or in a shared <code class="px-1 py-0.5 rounded bg-slate-100 font-mono">.json</code> file you link via Google Drive Desktop or a company network folder.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Weekly Source of Truth (Pro-Rata)</div>
              <p class="text-slate-600 leading-relaxed">Allocations and capacities are stored per <strong>ISO Week</strong> as a continuous <strong>FTE</strong> headcount rate. Switching between <strong>FTE</strong>, <strong>Days</strong>, and <strong>Hours</strong> converts automatically (default <code class="px-1 rounded bg-white font-mono">1.0 FTE = 5d/wk = 40h/wk</code>). Monthly edits pro-rate seamlessly across 4-week and 5-week ISO months.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Live DB vs. Demo Sandbox</div>
              <p class="text-slate-600 leading-relaxed">Use <strong>Demo: ON</strong> in the header to experiment with realistic sample data without touching your real company plan. Click <strong>Reset</strong> in the amber Demo banner anytime to restore the sample scenario.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Departments, Projects &amp; Setup</div>
              <p class="text-slate-600 leading-relaxed">Configure Departments (with default FTE capacity, color, and manager), Projects (code, status, priority, owner, color), Milestones, and conversion/threshold rules in the <strong>Data &amp; Setup</strong> tab.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Active User &amp; Dark Mode</div>
              <p class="text-slate-600 leading-relaxed">Click your initials pill in the header to switch your active name/role (recorded in Change Log, Snapshots, and Sync metadata). Click the Moon/Sun icon to switch between Light and Dark themes.</p>
            </div>
          </div>`,
      },
      {
        id: 'roadmap',
        title: 'Roadmap Matrix (Standard View)',
        badge: 'Planning',
        keywords: 'roadmap matrix department project weeks months fte color accent fill 3-level drag drop copy period range comments capacity override bottleneck search filter',
        bodyHtml: `
          <div class="space-y-3">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Views, Sticky Headers &amp; Navigation</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; <strong>Grouping:</strong> Switch rows between <strong>By Department</strong> (capacity vs. load) and <strong>By Project</strong> (effort across teams, with automatic <strong>&#9888; Over</strong> bottleneck badges whenever an assigned department is overallocated).</li>
                <li>&bull; <strong>Time Scale &amp; Horizon:</strong> Switch between <strong>Months</strong> and <strong>Weeks</strong>, display 1 to 24 periods, and step with <strong>&lsaquo; / Today / &rsaquo;</strong> or keyboard arrows.</li>
                <li>&bull; <strong>Sticky Column Headers:</strong> While scrolling down, only the Week/Month column headers stay pinned at the top of the screen—keeping maximum space for roadmap cards.</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Fast Editing, Drag &amp; Drop, and Bulk Copy</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; <strong>Quick Actions on Hover:</strong> Hover any allocation card for instant <strong>&minus; / +</strong> stepping and <strong>&rarr;</strong> to copy into the next period.</li>
                <li>&bull; <strong>Multi-Period Range Fill:</strong> Click any card or <strong>+ Add</strong> to open the Allocation Modal. Set either a <strong>Repeat count</strong> (1–24) or pick a <strong>Through End Week/Month</strong> to fill an entire span in one click.</li>
                <li>&bull; <strong>Copy Entire Period:</strong> Hover any column header and click <strong>Copy &rarr;</strong> to duplicate all visible allocations from that week/month into the next period.</li>
                <li>&bull; <strong>Drag &amp; Drop:</strong> Drag allocation cards or milestones between cells (toggle <strong>Drag: Move / Copy</strong> or hold <code class="px-1 rounded bg-white font-mono">Alt</code> to copy). Drag row handles (&#8942;&#8942;) or click &#9650;/&#9660; to reorder rows.</li>
                <li>&bull; <strong>Variable Capacity &amp; Comments:</strong> Click the <code class="px-1 rounded bg-white font-mono">alloc / cap</code> readout in any cell to set period-specific capacity overrides (tagged <span class="px-1 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">Var</span>). Click empty cell space or the speech-bubble icon to edit inline cell comments.</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">4 Card Colour Schemes &amp; Smart Filters</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; <strong>Accent:</strong> Clean white cards with left colour stripe. <strong>Fill:</strong> Solid high-contrast entity colour cards. <strong>By FTE:</strong> 6-tier heat scale (% of dept capacity). <strong>3-Level:</strong> Green / Yellow / Red demand tiers with configurable thresholds (<strong>&#9881; Tune</strong>).</li>
                <li>&bull; <strong>Filters &amp; Display Panel:</strong> Click <strong>Filters &amp; Display</strong> in the roadmap bar to expand Search, Department/Project filters, Quick Filter chips (<strong>Overallocated</strong>, <strong>At Risk</strong>, <strong>Has Notes</strong>), Units, Start Date, Comments, Hide Empty, Drag Mode, and Saved Views—keeping the primary bar compact while active filter counts stay visible on the badge.</li>
              </ul>
            </div>
          </div>`,
      },
      {
        id: 'meeting',
        title: 'Meeting / Projector View & Spotlight',
        badge: 'Presenting',
        keywords: 'meeting view projector spotlight vertical column arrows dates fullscreen hide empty 1 2 3 4 periods',
        bodyHtml: `
          <p class="text-slate-600 leading-relaxed">
            Click <strong>Meeting View</strong> in the header (or press <code class="px-1 rounded bg-slate-100 font-mono">M</code>) for a high-contrast, clutter-free layout designed for steering committees and screen sharing.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">1–4 Equal-Width Columns &amp; Dates</div>
              <p class="text-slate-600 leading-relaxed">Choose <strong>1, 2, 3, or 4</strong> weeks or months. All period columns render at strictly equal widths with full date ranges right under each week/month title.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Vertical First Column &amp; Sticky Arrows</div>
              <p class="text-slate-600 leading-relaxed">The row-name column compacts to a 62 px vertical spine to maximize card space. Use the <strong>&lsaquo;</strong> and <strong>&rsaquo;</strong> arrows (plus the <strong>Today</strong> pill) right inside the sticky column header while scrolled down.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Project Spotlight (&#9678;)</div>
              <p class="text-slate-600 leading-relaxed">Pick any project from the <strong>Spotlight</strong> dropdown in Meeting View, click the <strong>&#9678;</strong> button on any card (visible in Meeting View and on hover in Standard View), or click a Project row spine. Matching cards highlight with a crisp ring while all other items dim—press <code class="px-1 rounded bg-white font-mono">Esc</code> to clear.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Hide Empty, Fullscreen &amp; Print Slide</div>
              <p class="text-slate-600 leading-relaxed">Toggle <strong>Hide Empty</strong> to omit inactive rows in the visible window, click <strong>Fullscreen</strong> (or press <code class="px-1 rounded bg-white font-mono">F</code>) for projectors, or click <strong>Print Slide</strong> to export the clean 1–4 period table directly to a landscape slide/PDF.</p>
            </div>
          </div>`,
      },
      {
        id: 'powertools',
        title: 'Shift Schedule, What-If, Holidays & CSV Import',
        badge: 'Power Tools',
        keywords: 'shift project slip delay holiday shutdown capacity range budget archive completed what-if scenario sandbox clone saved views presets csv excel paste import',
        bodyHtml: `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">&#8644; Shift Project Schedule (&plusmn;N Wks/Mos)</div>
              <p class="text-slate-600 leading-relaxed">Click <strong>&#8644; Shift</strong> on any project row in <strong>By Project</strong> view or in <strong>Data &amp; Setup &rarr; Projects</strong> to move all allocations, comments, and milestones together (with optional baseline preservation to track slip, plus full Undo).</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">What-If Scenario Sandbox</div>
              <p class="text-slate-600 leading-relaxed">Click <strong>What-If</strong> in the top header to clone your real <strong>Live DB</strong> into an isolated in-memory sandbox. Test reschedules or hiring changes safely while viewing live diffs, then click <strong>Commit to Live</strong> or <strong>Discard</strong>.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Range Capacity &amp; Holiday / Shutdown %</div>
              <p class="text-slate-600 leading-relaxed">Set variable capacity across a <strong>Start &rarr; End</strong> date span inside the Capacity Modal, or use <strong>Holiday / Shutdown %</strong> in <strong>Data &amp; Setup &rarr; Departments</strong> to scale multiple departments at once (e.g. 50% half-week or 0% shutdown).</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Project Effort Budgets &amp; Archiving</div>
              <p class="text-slate-600 leading-relaxed">Set an optional <strong>Effort Budget (Person-Days)</strong> per project to see live burn % in <strong>By Project</strong> view, Setup, and Health KPIs. <strong>Archive</strong> completed projects to hide them from active planning without losing history or snapshots.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Saved Views / Presets</div>
              <p class="text-slate-600 leading-relaxed">Click <strong>Views</strong> in the Roadmap toolbar to bookmark your current filters, horizon, axis, color mode, and Meeting View settings under a name for 1-click recall.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="font-bold text-slate-900">Paste from Excel / CSV Importer</div>
              <p class="text-slate-600 leading-relaxed">Click <strong>Import CSV / Excel</strong> in <strong>Data &amp; Setup</strong> to paste tabular <code class="px-1 rounded bg-white font-mono">Dept, Project, Period, Value</code> rows straight from spreadsheets with live validation and bulk Undo.</p>
            </div>
          </div>`,
      },
      {
        id: 'health',
        title: 'Health, Heatmap & Snapshot Comparison',
        badge: 'Analytics',
        keywords: 'health kpi chart heatmap capacity snapshots baseline pin comparison diff csv changelog audit trail budget',
        bodyHtml: `
          <div class="space-y-3">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Org Health, Budget KPIs &amp; Interactive Heatmap</div>
              <p class="text-slate-600 leading-relaxed">The <strong>Health &amp; Evolution</strong> tab tracks Average Organisation Utilisation, Bottleneck Slots, Milestones Health, and Project Budgets. Tap any bar in the <strong>Load vs. Variable Capacity</strong> chart, or click any cell in the <strong>Department &times; Period Capacity Heatmap</strong> to jump straight to that slot in the Roadmap Matrix.</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Baselines, Pinning &amp; A vs. B Comparison</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; <strong>Save Snapshot:</strong> Freeze the current plan anytime. Check <strong>Pin</strong> on official baselines to protect them from automatic rolling retention caps.</li>
                <li>&bull; <strong>Compare Any Two States:</strong> Pick a <strong>Baseline (A)</strong> snapshot and compare against the <strong>Current Active Plan</strong> or another snapshot across 5 views: <em>Period Diff</em>, <em>By Project</em>, <em>Cells</em>, <em>Milestones</em>, and <em>Capacity</em>.</li>
                <li>&bull; <strong>Audit Change Log:</strong> Every edit is recorded with timestamp, user, category, and summary—searchable and exportable to CSV.</li>
              </ul>
            </div>
          </div>`,
      },
      {
        id: 'sync',
        title: 'Shared File Sync, Conflict Guard & Exports',
        badge: 'Sync & PDF',
        keywords: 'sync shared file google drive conflict guard overwrite reload backup json csv pdf export offline retention rolling prune',
        bodyHtml: `
          <div class="space-y-3">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Shared Folder Auto-Sync &amp; Pre-Write Conflict Guard</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; On desktop Chrome/Edge, link a shared <code class="px-1 rounded bg-white font-mono">.json</code> file in Google Drive Desktop, OneDrive, or a company network share via <strong>Sync &amp; Snapshots</strong>. Edits auto-save and teammate updates auto-reload via polling + window focus.</li>
                <li>&bull; <strong>Pre-Write Conflict Guard:</strong> Before saving, PulsePlan verifies the file timestamp on disk. If a teammate saved changes since your last sync, auto-save pauses and opens a <strong>Sync Conflict</strong> dialog so you can <em>Reload Theirs</em>, <em>Keep Mine</em>, or <em>Download Local Backup</em> without losing work.</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900">Vector PDF, JSON/CSV &amp; Retention Hygiene</div>
              <ul class="space-y-1 text-slate-600 leading-relaxed">
                <li>&bull; <strong>Export PDF:</strong> Generates a multi-page vector PDF with your chosen card colour style, 4–6 periods/page, executive KPIs, load chart, department health, milestones, comments appendix, and snapshot diff (automatically falls back to clean landscape browser print when offline).</li>
                <li>&bull; <strong>Rolling Retention Caps:</strong> Configure max dump history, change log, and unpinned snapshots in <strong>Sync &amp; Snapshots</strong> to keep synced JSON files lean, with one-click <strong>Archive Trimmed &amp; Prune</strong>.</li>
              </ul>
            </div>
          </div>`,
      },
      {
        id: 'mobile',
        title: 'Mobile & Touch Workflow',
        badge: 'Mobile',
        keywords: 'mobile phone tablet touch cards grid swipe accordion bottom sheet share',
        bodyHtml: `
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div class="font-bold text-slate-900">Mobile-First Hybrid Layout</div>
            <ul class="space-y-1 text-slate-600 leading-relaxed">
              <li>&bull; On viewports under 768 px, PulsePlan automatically switches to a <strong>Period-Focus Card Deck</strong> with swipeable week/month pills (carrying live health dots), expandable department/project accordions, large touch steppers, and a bottom navigation bar.</li>
              <li>&bull; Tap <strong>Grid / Cards</strong> in the top header anytime to peek at the compact 2D table (ideal in landscape orientation).</li>
              <li>&bull; Tap <strong>&#8943;</strong> on any mobile card for the Touch Action Sheet (Edit, Extend, Move/Copy to another period, Remove), and use <strong>Share / Save JSON</strong> for native iOS/Android Share Sheet integration.</li>
            </ul>
          </div>`,
      },
      {
        id: 'shortcuts',
        title: 'Undo/Redo & Keyboard Shortcuts',
        badge: 'Shortcuts',
        keywords: 'undo redo ctrl z ctrl y keyboard shortcuts arrow left right escape fullscreen today meeting manual',
        bodyHtml: `
          <p class="text-slate-600 leading-relaxed">
            PulsePlan keeps a <strong>30-step Undo / Redo</strong> history for edits on the active database (accessible via toolbar buttons, keyboard shortcuts, or the inline <strong>Undo</strong> button inside action toasts).
          </p>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <tr>
                  <th scope="col" class="px-3 py-2 font-bold">Shortcut</th>
                  <th scope="col" class="px-3 py-2 font-bold">Action</th>
                  <th scope="col" class="px-3 py-2 font-bold">Where</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">Ctrl+Z / Cmd+Z</td><td class="px-3 py-2">Undo last roadmap or setup edit</td><td class="px-3 py-2 text-slate-500">Global</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">Ctrl+Y / Cmd+Shift+Z</td><td class="px-3 py-2">Redo last undone edit</td><td class="px-3 py-2 text-slate-500">Global</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">&larr; / &rarr;</td><td class="px-3 py-2">Step timeline back / forward by 1 week or month</td><td class="px-3 py-2 text-slate-500">Roadmap Tab</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">T</td><td class="px-3 py-2">Jump timeline to current week / month (Today)</td><td class="px-3 py-2 text-slate-500">Roadmap Tab</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">M</td><td class="px-3 py-2">Toggle Meeting / Projector View</td><td class="px-3 py-2 text-slate-500">Roadmap Tab</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">1 / 2 / 3 / 4</td><td class="px-3 py-2">Show 1, 2, 3, or 4 weeks/months</td><td class="px-3 py-2 text-slate-500">Meeting View</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">F</td><td class="px-3 py-2">Toggle browser Fullscreen presentation</td><td class="px-3 py-2 text-slate-500">Meeting View</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">Esc</td><td class="px-3 py-2">Close modal &rarr; Clear Spotlight &rarr; Exit Meeting View</td><td class="px-3 py-2 text-slate-500">Global</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">Alt + Drag</td><td class="px-3 py-2">Copy an allocation card instead of moving it</td><td class="px-3 py-2 text-slate-500">Roadmap Matrix</td></tr>
                <tr><td class="px-3 py-2 font-mono font-bold text-indigo-700">?</td><td class="px-3 py-2">Open this User Manual</td><td class="px-3 py-2 text-slate-500">Global</td></tr>
              </tbody>
            </table>
          </div>`,
      },
    ];

    let _manualActiveSection = 'all';

    function openManualModal(sectionId = 'all') {
      _manualActiveSection = sectionId || 'all';
      showModal(`
        <div class="p-5 space-y-4 text-xs">
          <div class="w-10 h-1.5 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true"></div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 id="modalTitle" class="text-base font-extrabold text-slate-900">PulsePlan User Manual</h3>
                <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase">Offline-Ready</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">Complete guide to roadmap planning, Meeting View, analytics, file sync, and shortcuts.</p>
            </div>
            <button type="button" aria-label="Close manual" onclick="closeModal()" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl font-bold leading-none shrink-0">&times;</button>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label for="manualSearchInput" class="sr-only">Search manual topics</label>
            <input id="manualSearchInput" type="text" placeholder="Search manual (e.g., spotlight, conflict, undo, PDF, pro-rata)..." oninput="renderManualContent()"
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800" />
          </div>

          <div id="manualTopicTabs" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"></div>

          <div id="manualBodyContent" class="space-y-4 max-h-[56dvh] overflow-y-auto pr-1"></div>

          <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Tip: Press <code class="px-1 rounded bg-slate-100 font-mono">?</code> anytime to open this guide.</span>
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">Close Manual</button>
          </div>
        </div>`, 'max-w-4xl');

      renderManualContent();
    }

    function setManualSection(secId) {
      _manualActiveSection = secId || 'all';
      renderManualContent();
    }

    function renderManualContent() {
      const tabsEl = document.getElementById('manualTopicTabs');
      const bodyEl = document.getElementById('manualBodyContent');
      const q = (document.getElementById('manualSearchInput')?.value || '').trim().toLowerCase();
      if (!tabsEl || !bodyEl) return;

      const tabItems = [{ id: 'all', label: 'All Topics' }, ...MANUAL_SECTIONS.map(s => ({ id: s.id, label: s.badge }))];
      tabsEl.innerHTML = tabItems.map(t => {
        const active = _manualActiveSection === t.id;
        return `
          <button type="button" onclick="setManualSection('${t.id}')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${active ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}">
            ${escapeHtml(t.label)}
          </button>`;
      }).join('');

      const filtered = MANUAL_SECTIONS.filter(sec => {
        if (_manualActiveSection !== 'all' && sec.id !== _manualActiveSection) return false;
        if (!q) return true;
        const haystack = `${sec.title} ${sec.badge} ${sec.keywords} ${sec.bodyHtml.replace(/<[^>]+>/g, ' ')}`.toLowerCase();
        return haystack.includes(q);
      });

      if (filtered.length === 0) {
        bodyEl.innerHTML = `<div class="p-6 text-center text-slate-500 rounded-xl border border-dashed border-slate-300">No manual topics matched &ldquo;${escapeHtml(q)}&rdquo;. <button type="button" onclick="document.getElementById('manualSearchInput').value=''; setManualSection('all');" class="font-bold text-indigo-600 hover:underline ml-1">Show all topics</button></div>`;
        return;
      }

      bodyEl.innerHTML = filtered.map(sec => `
        <section class="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-extrabold text-slate-900">${escapeHtml(sec.title)}</h4>
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">${escapeHtml(sec.badge)}</span>
          </div>
          ${sec.bodyHtml}
        </section>`).join('');
    }
