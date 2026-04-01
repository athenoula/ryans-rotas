# Ryan's Rotas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly static web app that lets Ryan manage 24-hour care rotas — mark Home/Away days, auto-generate shift assignments, track contracted hours, and export to Excel/PDF.

**Architecture:** Single-page app with vanilla HTML/CSS/JS. No backend — localStorage for persistence, JSON export/import for backup. Client-side Excel (SheetJS) and PDF (jsPDF) generation.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), SheetJS (xlsx), jsPDF

**Spec:** `docs/superpowers/specs/2026-04-01-ryans-rotas-design.md`

---

## File Structure

```
ryans-rotas/
  index.html                    # Single entry point, loads all JS modules
  src/
    css/
      styles.css                # All styles, mobile-first responsive
    js/
      app.js                    # App init, routing between screens, nav rendering
      data.js                   # Data layer: models, localStorage CRUD, JSON backup
      shiftTemplates.js         # Shift template definitions and hour calculations
      workers.js                # Workers screen: list, add, edit, deactivate
      yearPlanner.js            # Year planner screen: 12-month calendar, Home/Away toggle
      monthlyRota.js            # Monthly rota screen: shift table, inline editing
      prePopulate.js            # Pre-populate form: A/L, preferences, blocked shifts
      autoFill.js               # Auto-fill algorithm: assignment logic
      hoursDashboard.js         # Hours dashboard screen: contract tracking table
      export.js                 # Excel and PDF generation
    lib/
      xlsx.full.min.js          # SheetJS library (downloaded)
      jspdf.umd.min.js          # jsPDF library (downloaded)
      jspdf.plugin.autotable.min.js  # jsPDF AutoTable plugin for tables
  tests/
    data.test.js                # Data layer unit tests
    shiftTemplates.test.js      # Shift template tests
    autoFill.test.js            # Auto-fill algorithm tests
    hoursDashboard.test.js      # Hours calculation tests
    test-runner.html            # In-browser test runner (no Node needed)
```

**Testing approach:** Since this is a no-build vanilla JS app, tests run in the browser via a simple test runner HTML file. Each test file uses a minimal assertion library included in `test-runner.html`. Tests cover the data layer, shift templates, auto-fill algorithm, and hours calculations — the core logic. UI screens are tested manually.

---

### Task 1: Project Scaffold and Test Runner

**Files:**
- Create: `index.html`
- Create: `src/css/styles.css`
- Create: `src/js/app.js`
- Create: `tests/test-runner.html`

- [ ] **Step 1: Create the test runner**

This is a simple HTML page that loads test files and runs assertions in the browser. It includes a minimal test framework.

```html
<!-- tests/test-runner.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ryan's Rotas — Tests</title>
  <style>
    body { font-family: monospace; padding: 1rem; background: #1a1a2e; color: #e2e8f0; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .suite { margin: 1rem 0; padding: 0.5rem; border-left: 3px solid #334155; }
    .suite-title { font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem; }
    #summary { margin-top: 2rem; font-size: 1.2rem; padding: 1rem; border-radius: 8px; }
    #summary.all-pass { background: #052e16; border: 1px solid #22c55e; }
    #summary.has-fail { background: #450a0a; border: 1px solid #ef4444; }
  </style>
</head>
<body>
  <h1>Ryan's Rotas — Test Runner</h1>
  <div id="results"></div>
  <div id="summary"></div>

  <script>
    window.testResults = { passed: 0, failed: 0, suites: [] };
    window.currentSuite = null;

    window.describe = function(name, fn) {
      window.currentSuite = { name, tests: [] };
      window.testResults.suites.push(window.currentSuite);
      fn();
      window.currentSuite = null;
    };

    window.it = function(name, fn) {
      try {
        fn();
        window.currentSuite.tests.push({ name, passed: true });
        window.testResults.passed++;
      } catch (e) {
        window.currentSuite.tests.push({ name, passed: false, error: e.message });
        window.testResults.failed++;
      }
    };

    window.assert = {
      equal(a, b) {
        if (a !== b) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
      },
      deepEqual(a, b) {
        if (JSON.stringify(a) !== JSON.stringify(b))
          throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
      },
      ok(val) {
        if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`);
      },
      notOk(val) {
        if (val) throw new Error(`Expected falsy, got ${JSON.stringify(val)}`);
      },
      throws(fn) {
        let threw = false;
        try { fn(); } catch (e) { threw = true; }
        if (!threw) throw new Error('Expected function to throw');
      }
    };

    window.renderResults = function() {
      const el = document.getElementById('results');
      let html = '';
      for (const suite of window.testResults.suites) {
        html += `<div class="suite"><div class="suite-title">${suite.name}</div>`;
        for (const t of suite.tests) {
          if (t.passed) {
            html += `<div class="pass">✓ ${t.name}</div>`;
          } else {
            html += `<div class="fail">✗ ${t.name} — ${t.error}</div>`;
          }
        }
        html += '</div>';
      }
      el.innerHTML = html;

      const sum = document.getElementById('summary');
      const total = window.testResults.passed + window.testResults.failed;
      if (window.testResults.failed === 0) {
        sum.className = 'all-pass';
        sum.textContent = `All ${total} tests passed`;
      } else {
        sum.className = 'has-fail';
        sum.textContent = `${window.testResults.failed} of ${total} tests failed`;
      }
    };
  </script>

  <!-- Test files loaded here — add new test scripts below -->
  <script type="module">
    // Tests will be added as modules in later tasks
    // For now, run a smoke test
    describe('Test Runner', () => {
      it('works', () => {
        assert.equal(1 + 1, 2);
      });
    });

    renderResults();
  </script>
</body>
</html>
```

- [ ] **Step 2: Open test runner and verify it works**

Open `tests/test-runner.html` in a browser. Expected: green "All 1 tests passed" with "✓ works" under "Test Runner".

- [ ] **Step 3: Create the base CSS**

```css
/* src/css/styles.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-card-alt: #1a2744;
  --bg-home: #0a1628;
  --bg-away: #1a0d06;
  --border: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --blue: #4a9eff;
  --blue-badge: #1e40af;
  --amber: #f59e0b;
  --amber-badge: #b45309;
  --green: #22c55e;
  --red: #ef4444;
  --purple: #a855f7;
}

html { font-size: 16px; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding-bottom: 4rem;
}

/* Navigation - bottom tabs on mobile */
.nav-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #0f172a;
  border-top: 1px solid var(--border);
  z-index: 100;
}

.nav-tab {
  flex: 1;
  padding: 0.5rem 0;
  text-align: center;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  background: none;
}

.nav-tab.active { color: var(--blue); }
.nav-tab-icon { font-size: 1.2rem; display: block; margin-bottom: 2px; }

/* Screen container */
.screen { display: none; padding: 1rem; }
.screen.active { display: block; }

/* Header bar */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.header h1 { font-size: 1.1rem; }
.header-actions { display: flex; gap: 0.5rem; }

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}
.btn-primary { background: var(--blue); color: white; }
.btn-success { background: var(--green); color: white; }
.btn-danger { background: var(--red); color: white; }
.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}
.badge-home { background: var(--blue-badge); color: white; }
.badge-away { background: var(--amber-badge); color: white; }

/* Form elements */
input, select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  width: 100%;
}
label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}
.form-group { margin-bottom: 1rem; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal h2 { font-size: 1.1rem; margin-bottom: 1rem; }

/* Responsive - desktop */
@media (min-width: 768px) {
  body { padding-bottom: 0; }
  .nav-tabs {
    position: static;
    border-top: none;
    border-bottom: 1px solid var(--border);
    justify-content: center;
    gap: 1rem;
  }
  .nav-tab { flex: none; padding: 0.75rem 1.5rem; font-size: 0.85rem; }
  .nav-tab-icon { display: inline; margin-right: 0.3rem; font-size: 1rem; }
  .screen { max-width: 1200px; margin: 0 auto; }
}
```

- [ ] **Step 4: Create the app shell (index.html)**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ryan's Rotas</title>
  <link rel="stylesheet" href="src/css/styles.css">
</head>
<body>
  <!-- Navigation -->
  <nav class="nav-tabs" id="nav">
    <button class="nav-tab active" data-screen="yearPlanner">
      <span class="nav-tab-icon">📅</span>Year
    </button>
    <button class="nav-tab" data-screen="monthlyRota">
      <span class="nav-tab-icon">📋</span>Rota
    </button>
    <button class="nav-tab" data-screen="hours">
      <span class="nav-tab-icon">📊</span>Hours
    </button>
    <button class="nav-tab" data-screen="workers">
      <span class="nav-tab-icon">👥</span>Workers
    </button>
    <button class="nav-tab" data-screen="settings">
      <span class="nav-tab-icon">⚙️</span>More
    </button>
  </nav>

  <!-- Screens -->
  <div id="screen-yearPlanner" class="screen active"></div>
  <div id="screen-monthlyRota" class="screen"></div>
  <div id="screen-hours" class="screen"></div>
  <div id="screen-workers" class="screen"></div>
  <div id="screen-settings" class="screen"></div>

  <!-- Modal container -->
  <div id="modal-root"></div>

  <script type="module" src="src/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create the app.js routing**

```javascript
// src/js/app.js
import { initData } from './data.js';
import { renderYearPlanner } from './yearPlanner.js';
import { renderMonthlyRota } from './monthlyRota.js';
import { renderHoursDashboard } from './hoursDashboard.js';
import { renderWorkers } from './workers.js';
import { renderSettings } from './export.js';

const screens = {
  yearPlanner: renderYearPlanner,
  monthlyRota: renderMonthlyRota,
  hours: renderHoursDashboard,
  workers: renderWorkers,
  settings: renderSettings,
};

let currentScreen = 'yearPlanner';

export function navigate(screenName) {
  currentScreen = screenName;

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.screen === screenName);
  });

  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.id === `screen-${screenName}`);
  });

  const renderFn = screens[screenName];
  if (renderFn) {
    const container = document.getElementById(`screen-${screenName}`);
    renderFn(container);
  }
}

export function showModal(contentHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay">
    <div class="modal">${contentHtml}</div>
  </div>`;
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function init() {
  initData();

  document.getElementById('nav').addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab');
    if (tab) navigate(tab.dataset.screen);
  });

  navigate('yearPlanner');
}

// Create placeholder modules so imports don't fail
init();
```

- [ ] **Step 6: Create placeholder modules**

Create empty placeholder exports for each module so the app loads without errors. Each will be replaced in later tasks.

```javascript
// src/js/data.js
export function initData() {}

// src/js/yearPlanner.js
export function renderYearPlanner(container) {
  container.innerHTML = '<h2>Year Planner</h2><p>Coming soon</p>';
}

// src/js/monthlyRota.js
export function renderMonthlyRota(container) {
  container.innerHTML = '<h2>Monthly Rota</h2><p>Coming soon</p>';
}

// src/js/hoursDashboard.js
export function renderHoursDashboard(container) {
  container.innerHTML = '<h2>Hours Dashboard</h2><p>Coming soon</p>';
}

// src/js/workers.js
export function renderWorkers(container) {
  container.innerHTML = '<h2>Workers</h2><p>Coming soon</p>';
}

// src/js/export.js
export function renderSettings(container) {
  container.innerHTML = '<h2>Settings</h2><p>Coming soon</p>';
}

// src/js/shiftTemplates.js
// (empty for now)

// src/js/autoFill.js
// (empty for now)

// src/js/prePopulate.js
// (empty for now)
```

- [ ] **Step 7: Open index.html in a browser and verify**

Open `index.html` in a browser (use a local server like `python3 -m http.server 8000` since ES modules need HTTP). Expected: dark themed app with 5 bottom tabs. Clicking each tab shows its placeholder text. Year Planner is active by default.

- [ ] **Step 8: Commit**

```bash
git init
echo ".superpowers/" >> .gitignore
echo ".DS_Store" >> .gitignore
git add index.html src/css/styles.css src/js/app.js src/js/data.js src/js/yearPlanner.js src/js/monthlyRota.js src/js/hoursDashboard.js src/js/workers.js src/js/export.js src/js/shiftTemplates.js src/js/autoFill.js src/js/prePopulate.js tests/test-runner.html .gitignore
git commit -m "feat: project scaffold with app shell, routing, and test runner"
```

---

### Task 2: Data Layer and Shift Templates

**Files:**
- Create: `src/js/data.js` (replace placeholder)
- Create: `src/js/shiftTemplates.js` (replace placeholder)
- Create: `tests/data.test.js`
- Create: `tests/shiftTemplates.test.js`
- Modify: `tests/test-runner.html` (add test imports)

- [ ] **Step 1: Write tests for shift templates**

```javascript
// tests/shiftTemplates.test.js
import { SHIFT_TEMPLATES, getShiftsForMode, calculateHours } from '../src/js/shiftTemplates.js';

describe('Shift Templates', () => {
  it('returns 4 home shifts', () => {
    const shifts = getShiftsForMode('home');
    assert.equal(shifts.length, 4);
    assert.equal(shifts[0].type, 'shortDay');
    assert.equal(shifts[1].type, 'longDay');
    assert.equal(shifts[2].type, 'wakingNight');
    assert.equal(shifts[3].type, 'wakingNight');
  });

  it('returns 4 away shifts', () => {
    const shifts = getShiftsForMode('away');
    assert.equal(shifts.length, 4);
    assert.equal(shifts[0].type, 'dayShift');
    assert.equal(shifts[1].type, 'dayShift');
    assert.equal(shifts[2].type, 'sleepNight');
    assert.equal(shifts[3].type, 'sleepNight');
  });

  it('calculates hours for same-day span', () => {
    assert.equal(calculateHours('09:00', '18:00'), 9);
    assert.equal(calculateHours('09:00', '21:00'), 12);
    assert.equal(calculateHours('09:00', '23:00'), 14);
  });

  it('calculates hours for overnight span', () => {
    assert.equal(calculateHours('21:00', '09:00'), 12);
    assert.equal(calculateHours('23:00', '09:00'), 10);
  });

  it('home shifts have correct default hours', () => {
    const shifts = getShiftsForMode('home');
    assert.equal(shifts[0].hours, 9);
    assert.equal(shifts[1].hours, 12);
    assert.equal(shifts[2].hours, 12);
    assert.equal(shifts[3].hours, 12);
  });

  it('away shifts have correct default hours', () => {
    const shifts = getShiftsForMode('away');
    assert.equal(shifts[0].hours, 14);
    assert.equal(shifts[1].hours, 14);
    assert.equal(shifts[2].hours, 10);
    assert.equal(shifts[3].hours, 10);
  });
});
```

- [ ] **Step 2: Add test import to test-runner.html**

Replace the inline `<script type="module">` block at the bottom of `tests/test-runner.html`:

```html
<script type="module">
  import '../tests/shiftTemplates.test.js';
  // Future test imports will go here
  renderResults();
</script>
```

- [ ] **Step 3: Run tests — verify they fail**

Serve the project (`python3 -m http.server 8000`) and open `http://localhost:8000/tests/test-runner.html`. Expected: failures because `shiftTemplates.js` exports nothing yet.

- [ ] **Step 4: Implement shift templates**

```javascript
// src/js/shiftTemplates.js
export const SHIFT_TEMPLATES = {
  home: [
    { type: 'shortDay', label: 'Short Day', startTime: '09:00', endTime: '18:00', hours: 9 },
    { type: 'longDay', label: 'Long Day', startTime: '09:00', endTime: '21:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
    { type: 'wakingNight', label: 'Waking Night', startTime: '21:00', endTime: '09:00', hours: 12 },
  ],
  away: [
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '23:00', hours: 14 },
    { type: 'dayShift', label: 'Day Shift', startTime: '09:00', endTime: '23:00', hours: 14 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
    { type: 'sleepNight', label: 'Sleep Night', startTime: '23:00', endTime: '09:00', hours: 10 },
  ],
};

export function getShiftsForMode(mode) {
  return SHIFT_TEMPLATES[mode].map(t => ({ ...t }));
}

export function calculateHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // overnight
  return (endMins - startMins) / 60;
}
```

- [ ] **Step 5: Run tests — verify they pass**

Refresh `test-runner.html`. Expected: all 6 shift template tests pass (green).

- [ ] **Step 6: Write tests for data layer**

```javascript
// tests/data.test.js
import {
  initData, getWorkers, addWorker, updateWorker, deactivateWorker,
  getYearCalendar, setDayMode,
  getRota, saveRota,
  getAvailability, saveAvailability,
  exportAllData, importAllData
} from '../src/js/data.js';

describe('Data Layer — Workers', () => {
  it('initialises with default workers', () => {
    localStorage.clear();
    initData();
    const workers = getWorkers();
    assert.equal(workers.length, 9);
    assert.equal(workers[0].name, 'Karen Hughes');
    assert.equal(workers[0].contractType, 'maximum');
    assert.equal(workers[0].monthlyHours, 150);
  });

  it('adds a new worker', () => {
    localStorage.clear();
    initData();
    addWorker({ name: 'Test Worker', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: [], active: true });
    const workers = getWorkers();
    assert.equal(workers.length, 10);
    assert.equal(workers[9].name, 'Test Worker');
    assert.ok(workers[9].id);
  });

  it('updates a worker', () => {
    localStorage.clear();
    initData();
    const workers = getWorkers();
    updateWorker(workers[0].id, { monthlyHours: 160 });
    const updated = getWorkers();
    assert.equal(updated[0].monthlyHours, 160);
  });

  it('deactivates a worker', () => {
    localStorage.clear();
    initData();
    const workers = getWorkers();
    deactivateWorker(workers[0].id);
    const updated = getWorkers();
    assert.equal(updated[0].active, false);
  });
});

describe('Data Layer — Year Calendar', () => {
  it('returns empty calendar for new year', () => {
    localStorage.clear();
    initData();
    const cal = getYearCalendar(2026);
    assert.equal(cal.year, 2026);
    assert.deepEqual(cal.days, {});
  });

  it('sets a day mode', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-01', 'home');
    const cal = getYearCalendar(2026);
    assert.equal(cal.days['2026-04-01'], 'home');
  });

  it('toggles a day mode', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-01', 'home');
    setDayMode(2026, '2026-04-01', 'away');
    const cal = getYearCalendar(2026);
    assert.equal(cal.days['2026-04-01'], 'away');
  });
});

describe('Data Layer — Rota', () => {
  it('returns null for missing rota', () => {
    localStorage.clear();
    initData();
    assert.equal(getRota('2026-04'), null);
  });

  it('saves and retrieves a rota', () => {
    localStorage.clear();
    initData();
    const rota = { month: '2026-04', days: [], version: 'V1', status: 'draft' };
    saveRota(rota);
    const loaded = getRota('2026-04');
    assert.equal(loaded.month, '2026-04');
    assert.equal(loaded.version, 'V1');
  });
});

describe('Data Layer — Availability', () => {
  it('returns empty availability for new month/worker', () => {
    localStorage.clear();
    initData();
    const avail = getAvailability('w1', '2026-04');
    assert.deepEqual(avail.annualLeaveDays, []);
    assert.deepEqual(avail.preferredShifts, []);
    assert.deepEqual(avail.blockedShifts, []);
  });

  it('saves and retrieves availability', () => {
    localStorage.clear();
    initData();
    saveAvailability({ workerId: 'w1', month: '2026-04', annualLeaveDays: [7, 8], preferredShifts: [], blockedShifts: [] });
    const avail = getAvailability('w1', '2026-04');
    assert.deepEqual(avail.annualLeaveDays, [7, 8]);
  });
});

describe('Data Layer — Backup', () => {
  it('exports and imports all data', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-01', 'home');
    const exported = exportAllData();
    localStorage.clear();
    initData();
    importAllData(exported);
    const cal = getYearCalendar(2026);
    assert.equal(cal.days['2026-04-01'], 'home');
  });
});
```

- [ ] **Step 7: Add data test import to test-runner.html**

```html
<script type="module">
  import '../tests/shiftTemplates.test.js';
  import '../tests/data.test.js';
  renderResults();
</script>
```

- [ ] **Step 8: Run tests — verify they fail**

Refresh `test-runner.html`. Expected: shift template tests pass, data tests fail.

- [ ] **Step 9: Implement data layer**

```javascript
// src/js/data.js
const STORAGE_KEY = 'ryansRotas';

const DEFAULT_WORKERS = [
  { id: 'w1', name: 'Karen Hughes', team: 'home', contractType: 'maximum', monthlyHours: 150, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w2', name: 'Alayo Obafemi', team: 'home', contractType: 'maximum', monthlyHours: 150, allowedShiftTypes: ['shortDay', 'longDay', 'wakingNight'], active: true },
  { id: 'w3', name: 'Andrew Cockbill', team: 'away', contractType: 'away-linked', monthlyHours: null, allowedShiftTypes: ['dayShift', 'sleepNight'], active: true },
  { id: 'w4', name: 'Kapil Kumar Kumar', team: 'away', contractType: 'minimum', monthlyHours: 150, allowedShiftTypes: ['dayShift', 'sleepNight'], active: true },
  { id: 'w5', name: 'Karen Cockbill', team: 'bank', contractType: 'bank', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w6', name: 'Ankita', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay', 'wakingNight'], active: true },
  { id: 'w7', name: 'Adekemi', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['wakingNight'], active: true },
  { id: 'w8', name: 'Paige', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w9', name: 'Imogen Parkinson', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
];

let data = null;

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    data = JSON.parse(raw);
  } else {
    data = { workers: structuredClone(DEFAULT_WORKERS), calendars: {}, rotas: {}, availability: {} };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function initData() {
  load();
  if (!data.workers || data.workers.length === 0) {
    data.workers = structuredClone(DEFAULT_WORKERS);
    save();
  }
}

// Workers
export function getWorkers(includeInactive = false) {
  return includeInactive ? [...data.workers] : data.workers.filter(w => w.active);
}

export function getWorkerById(id) {
  return data.workers.find(w => w.id === id) || null;
}

export function addWorker(worker) {
  const id = 'w' + Date.now() + Math.random().toString(36).slice(2, 6);
  data.workers.push({ ...worker, id });
  save();
  return id;
}

export function updateWorker(id, updates) {
  const idx = data.workers.findIndex(w => w.id === id);
  if (idx === -1) return;
  data.workers[idx] = { ...data.workers[idx], ...updates };
  save();
}

export function deactivateWorker(id) {
  updateWorker(id, { active: false });
}

// Year Calendar
export function getYearCalendar(year) {
  return data.calendars[year] || { year, days: {} };
}

export function setDayMode(year, dateStr, mode) {
  if (!data.calendars[year]) {
    data.calendars[year] = { year, days: {} };
  }
  if (mode === null) {
    delete data.calendars[year].days[dateStr];
  } else {
    data.calendars[year].days[dateStr] = mode;
  }
  save();
}

// Rotas
export function getRota(month) {
  return data.rotas[month] || null;
}

export function saveRota(rota) {
  data.rotas[rota.month] = rota;
  save();
}

// Availability
export function getAvailability(workerId, month) {
  const key = `${workerId}_${month}`;
  return data.availability[key] || { workerId, month, annualLeaveDays: [], preferredShifts: [], blockedShifts: [] };
}

export function saveAvailability(avail) {
  const key = `${avail.workerId}_${avail.month}`;
  data.availability[key] = avail;
  save();
}

// Backup
export function exportAllData() {
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr) {
  data = JSON.parse(jsonStr);
  save();
}
```

- [ ] **Step 10: Run all tests — verify they pass**

Refresh `test-runner.html`. Expected: all shift template and data layer tests pass (green).

- [ ] **Step 11: Commit**

```bash
git add src/js/data.js src/js/shiftTemplates.js tests/data.test.js tests/shiftTemplates.test.js tests/test-runner.html
git commit -m "feat: data layer with localStorage persistence and shift templates"
```

---

### Task 3: Workers Screen

**Files:**
- Modify: `src/js/workers.js`

- [ ] **Step 1: Implement the Workers screen**

```javascript
// src/js/workers.js
import { getWorkers, addWorker, updateWorker, deactivateWorker } from './data.js';
import { showModal, closeModal } from './app.js';

export function renderWorkers(container) {
  const workers = getWorkers(true);
  const active = workers.filter(w => w.active);
  const inactive = workers.filter(w => !w.active);

  container.innerHTML = `
    <div class="header">
      <h1>Workers</h1>
      <button class="btn btn-primary" id="add-worker-btn">+ Add</button>
    </div>
    <div style="padding: 1rem;">
      ${active.map(w => workerCard(w)).join('')}
      ${inactive.length > 0 ? `
        <h3 style="color: var(--text-dim); margin: 1rem 0 0.5rem;">Inactive</h3>
        ${inactive.map(w => workerCard(w, true)).join('')}
      ` : ''}
    </div>
  `;

  container.querySelector('#add-worker-btn').addEventListener('click', () => openWorkerForm());
  container.querySelectorAll('.edit-worker').forEach(btn => {
    btn.addEventListener('click', () => openWorkerForm(btn.dataset.id));
  });
  container.querySelectorAll('.deactivate-worker').forEach(btn => {
    btn.addEventListener('click', () => {
      deactivateWorker(btn.dataset.id);
      renderWorkers(container);
    });
  });
  container.querySelectorAll('.reactivate-worker').forEach(btn => {
    btn.addEventListener('click', () => {
      updateWorker(btn.dataset.id, { active: true });
      renderWorkers(container);
    });
  });
}

function workerCard(worker, inactive = false) {
  const teamColors = { home: 'var(--blue)', away: 'var(--amber)', bank: 'var(--purple)', adhoc: 'var(--text-dim)' };
  const contractLabels = { maximum: 'Max', minimum: 'Min', 'away-linked': 'Away', bank: 'Bank', adhoc: 'Ad hoc' };

  return `
    <div class="card" style="${inactive ? 'opacity: 0.5;' : ''}">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${worker.name}</strong>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <span class="badge" style="background: ${teamColors[worker.team]}">${worker.team}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${contractLabels[worker.contractType]}${worker.monthlyHours ? ` · ${worker.monthlyHours}hrs/mo` : ''}</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-ghost edit-worker" data-id="${worker.id}">Edit</button>
          ${inactive
            ? `<button class="btn btn-ghost reactivate-worker" data-id="${worker.id}">Reactivate</button>`
            : `<button class="btn btn-ghost deactivate-worker" data-id="${worker.id}" style="color: var(--red);">Deactivate</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function openWorkerForm(editId = null) {
  const workers = getWorkers(true);
  const worker = editId ? workers.find(w => w.id === editId) : null;
  const isEdit = !!worker;

  const shiftTypeOptions = [
    { value: 'shortDay', label: 'Short Day' },
    { value: 'longDay', label: 'Long Day' },
    { value: 'wakingNight', label: 'Waking Night' },
    { value: 'dayShift', label: 'Day Shift (Away)' },
    { value: 'sleepNight', label: 'Sleep Night (Away)' },
  ];

  showModal(`
    <h2>${isEdit ? 'Edit' : 'Add'} Worker</h2>
    <form id="worker-form">
      <div class="form-group">
        <label>Name</label>
        <input type="text" name="name" value="${worker?.name || ''}" required>
      </div>
      <div class="form-group">
        <label>Team</label>
        <select name="team">
          <option value="home" ${worker?.team === 'home' ? 'selected' : ''}>Home</option>
          <option value="away" ${worker?.team === 'away' ? 'selected' : ''}>Away</option>
          <option value="bank" ${worker?.team === 'bank' ? 'selected' : ''}>Bank</option>
          <option value="adhoc" ${worker?.team === 'adhoc' ? 'selected' : ''}>Ad hoc</option>
        </select>
      </div>
      <div class="form-group">
        <label>Contract Type</label>
        <select name="contractType">
          <option value="maximum" ${worker?.contractType === 'maximum' ? 'selected' : ''}>Maximum (warn over)</option>
          <option value="minimum" ${worker?.contractType === 'minimum' ? 'selected' : ''}>Minimum (warn under)</option>
          <option value="away-linked" ${worker?.contractType === 'away-linked' ? 'selected' : ''}>Away-linked</option>
          <option value="bank" ${worker?.contractType === 'bank' ? 'selected' : ''}>Bank</option>
          <option value="adhoc" ${worker?.contractType === 'adhoc' ? 'selected' : ''}>Ad hoc</option>
        </select>
      </div>
      <div class="form-group">
        <label>Monthly Hours Target (leave blank if N/A)</label>
        <input type="number" name="monthlyHours" value="${worker?.monthlyHours || ''}">
      </div>
      <div class="form-group">
        <label>Allowed Shift Types</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem;">
          ${shiftTypeOptions.map(st => `
            <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text);">
              <input type="checkbox" name="shiftType" value="${st.value}"
                ${worker?.allowedShiftTypes?.includes(st.value) ? 'checked' : ''}>
              ${st.label}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
        <button type="button" class="btn btn-ghost" id="cancel-worker">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-worker').addEventListener('click', closeModal);
  document.getElementById('worker-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const shiftTypes = Array.from(form.querySelectorAll('input[name="shiftType"]:checked')).map(cb => cb.value);
    const workerData = {
      name: form.name.value.trim(),
      team: form.team.value,
      contractType: form.contractType.value,
      monthlyHours: form.monthlyHours.value ? Number(form.monthlyHours.value) : null,
      allowedShiftTypes: shiftTypes,
      active: true,
    };

    if (isEdit) {
      updateWorker(editId, workerData);
    } else {
      addWorker(workerData);
    }

    closeModal();
    const container = document.getElementById('screen-workers');
    renderWorkers(container);
  });
}
```

- [ ] **Step 2: Open the app and test the Workers screen**

Navigate to the Workers tab. Expected: 9 default workers displayed as cards with team badges, contract info, Edit and Deactivate buttons. Click "Add" to see the form modal. Edit a worker and verify changes persist after refresh.

- [ ] **Step 3: Commit**

```bash
git add src/js/workers.js
git commit -m "feat: workers screen with add, edit, deactivate"
```

---

### Task 4: Year Planner Screen

**Files:**
- Modify: `src/js/yearPlanner.js`

- [ ] **Step 1: Implement the Year Planner**

```javascript
// src/js/yearPlanner.js
import { getYearCalendar, setDayMode } from './data.js';

let currentYear = new Date().getFullYear();

export function renderYearPlanner(container) {
  const cal = getYearCalendar(currentYear);

  container.innerHTML = `
    <div class="header">
      <button class="btn btn-ghost" id="prev-year">← ${currentYear - 1}</button>
      <h1>${currentYear}</h1>
      <button class="btn btn-ghost" id="next-year">${currentYear + 1} →</button>
    </div>
    <div style="padding: 0.5rem;">
      <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; font-size: 0.8rem;">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--blue-badge);border-radius:3px;"></span> Home</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--amber-badge);border-radius:3px;"></span> Away</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--bg-card);border-radius:3px;border:1px solid var(--border);"></span> Not set</span>
      </div>
      <div class="year-grid" id="year-grid">
        ${renderMonths(cal)}
      </div>
    </div>
  `;

  addYearStyles();

  container.querySelector('#prev-year').addEventListener('click', () => { currentYear--; renderYearPlanner(container); });
  container.querySelector('#next-year').addEventListener('click', () => { currentYear++; renderYearPlanner(container); });

  container.querySelector('#year-grid').addEventListener('click', (e) => {
    const dayEl = e.target.closest('.yp-day[data-date]');
    if (!dayEl) return;
    const dateStr = dayEl.dataset.date;
    const currentMode = cal.days[dateStr] || null;
    let nextMode;
    if (currentMode === null) nextMode = 'home';
    else if (currentMode === 'home') nextMode = 'away';
    else nextMode = null;

    setDayMode(currentYear, dateStr, nextMode);
    renderYearPlanner(container);
  });
}

function renderMonths(cal) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const monthName = new Date(currentYear, m, 1).toLocaleString('en-GB', { month: 'long' });
    const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
    const firstDow = new Date(currentYear, m, 1).getDay(); // 0=Sun
    const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0

    let homeDays = 0, awayDays = 0;
    let dayCells = '';
    for (let i = 0; i < startOffset; i++) {
      dayCells += '<div class="yp-day empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mode = cal.days[dateStr] || null;
      let cls = 'yp-day';
      if (mode === 'home') { cls += ' home'; homeDays++; }
      else if (mode === 'away') { cls += ' away'; awayDays++; }
      dayCells += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
    }

    months.push(`
      <div class="yp-month">
        <div class="yp-month-header">
          <strong>${monthName}</strong>
          <span class="yp-month-summary">${homeDays}H ${awayDays}A</span>
        </div>
        <div class="yp-dow">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
        <div class="yp-days">${dayCells}</div>
      </div>
    `);
  }
  return months.join('');
}

function addYearStyles() {
  if (document.getElementById('yp-styles')) return;
  const style = document.createElement('style');
  style.id = 'yp-styles';
  style.textContent = `
    .year-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .yp-month {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
    }
    .yp-month-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .yp-month-summary { font-size: 0.75rem; color: var(--text-muted); }
    .yp-dow {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.7rem;
      color: var(--text-dim);
      margin-bottom: 0.25rem;
    }
    .yp-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .yp-day {
      text-align: center;
      padding: 0.3rem 0;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    }
    .yp-day.empty { cursor: default; }
    .yp-day:not(.empty):hover { outline: 1px solid var(--text-dim); }
    .yp-day.home { background: var(--blue-badge); color: white; }
    .yp-day.away { background: var(--amber-badge); color: white; }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 2: Open the app and test the Year Planner**

Navigate to the Year tab. Expected: 12 month calendars in a grid. Click a day: first click = blue (Home), second click = amber (Away), third click = unset. Month summaries show "XH YA" counts. Year navigation arrows work. Data persists on page refresh.

- [ ] **Step 3: Commit**

```bash
git add src/js/yearPlanner.js
git commit -m "feat: year planner with Home/Away day toggle"
```

---

### Task 5: Monthly Rota Screen

**Files:**
- Modify: `src/js/monthlyRota.js`

- [ ] **Step 1: Implement the Monthly Rota screen**

```javascript
// src/js/monthlyRota.js
import { getYearCalendar, getRota, saveRota, getWorkers, getWorkerById } from './data.js';
import { getShiftsForMode, calculateHours } from './shiftTemplates.js';
import { showModal, closeModal } from './app.js';

let currentMonth = new Date().getMonth(); // 0-indexed
let currentYear = new Date().getFullYear();

export function renderMonthlyRota(container) {
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const cal = getYearCalendar(currentYear);
  const rota = getRota(monthStr);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('en-GB', { month: 'long' });

  let homeDays = 0, awayDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const mode = cal.days[dateStr];
    if (mode === 'home') homeDays++;
    else if (mode === 'away') awayDays++;
  }

  container.innerHTML = `
    <div class="header">
      <button class="btn btn-ghost" id="prev-month">←</button>
      <div style="text-align: center;">
        <h1>${monthName} ${currentYear}</h1>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${homeDays} Home · ${awayDays} Away</div>
      </div>
      <button class="btn btn-ghost" id="next-month">→</button>
    </div>
    <div style="padding: 0.5rem 0.5rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <button class="btn btn-success" id="auto-fill-btn">⚡ Auto-Fill</button>
      <button class="btn btn-ghost" id="pre-populate-btn">📝 Availability</button>
      <button class="btn btn-ghost" id="clear-rota-btn" style="color: var(--red);">Clear</button>
    </div>
    <div style="overflow-x: auto; padding: 0.5rem;">
      <table class="rota-table" id="rota-table">
        <thead>
          <tr>
            <th style="min-width: 70px;">Date</th>
            <th>Short / Day</th>
            <th>Long / Day</th>
            <th>Waking / Sleep</th>
            <th>Waking / Sleep</th>
          </tr>
        </thead>
        <tbody>
          ${renderRotaDays(daysInMonth, cal, rota, monthStr)}
        </tbody>
      </table>
    </div>
  `;

  addRotaStyles();

  container.querySelector('#prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderMonthlyRota(container);
  });
  container.querySelector('#next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderMonthlyRota(container);
  });
  container.querySelector('#auto-fill-btn').addEventListener('click', async () => {
    const { runAutoFill } = await import('./autoFill.js');
    runAutoFill(monthStr);
    renderMonthlyRota(container);
  });
  container.querySelector('#pre-populate-btn').addEventListener('click', async () => {
    const { renderPrePopulate } = await import('./prePopulate.js');
    renderPrePopulate(monthStr);
  });
  container.querySelector('#clear-rota-btn').addEventListener('click', () => {
    if (confirm('Clear all shifts for this month?')) {
      saveRota({ month: monthStr, days: [], version: 'V1', status: 'draft' });
      renderMonthlyRota(container);
    }
  });

  // Shift cell click — reassign worker
  container.querySelector('#rota-table').addEventListener('click', (e) => {
    const cell = e.target.closest('.shift-cell[data-date][data-slot]');
    if (!cell) return;
    openAssignModal(cell.dataset.date, Number(cell.dataset.slot), monthStr, container);
  });
}

function renderRotaDays(daysInMonth, cal, rota, monthStr) {
  let html = '';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const mode = cal.days[dateStr] || null;
    const dow = dayNames[new Date(currentYear, currentMonth, d).getDay()];
    const dayPlan = rota?.days?.find(dp => dp.date === dateStr);

    const rowClass = mode === 'home' ? 'row-home' : mode === 'away' ? 'row-away' : 'row-unset';
    const badgeClass = mode === 'home' ? 'badge-home' : mode === 'away' ? 'badge-away' : '';

    html += `<tr class="${rowClass}">`;
    html += `<td class="date-cell"><strong>${d}</strong> ${dow}`;
    if (mode) html += `<br><span class="badge ${badgeClass}">${mode.toUpperCase()}</span>`;
    html += `</td>`;

    if (!mode) {
      html += `<td colspan="4" style="text-align: center; color: var(--text-dim); font-size: 0.8rem;">Not set — mark Home or Away in Year Planner</td>`;
    } else {
      const templates = getShiftsForMode(mode);
      for (let s = 0; s < 4; s++) {
        const shift = dayPlan?.shifts?.[s];
        const tmpl = templates[s];
        const startTime = shift?.startTime || tmpl.startTime;
        const endTime = shift?.endTime || tmpl.endTime;
        const worker = shift?.assignedWorker ? getWorkerById(shift.assignedWorker) : null;
        const workerName = worker ? worker.name : (shift?.assignedWorker === null || !shift ? 'TO COVER' : 'TO COVER');
        const isCover = !worker;

        html += `<td class="shift-cell" data-date="${dateStr}" data-slot="${s}">
          <div class="shift-card ${isCover ? 'shift-cover' : ''}">
            <div class="shift-time">${startTime}–${endTime}</div>
            <div class="shift-worker ${isCover ? 'cover' : ''}">${workerName}</div>
          </div>
        </td>`;
      }
    }
    html += `</tr>`;
  }
  return html;
}

function openAssignModal(dateStr, slotIndex, monthStr, container) {
  const rota = getRota(monthStr) || { month: monthStr, days: [], version: 'V1', status: 'draft' };
  const cal = getYearCalendar(currentYear);
  const mode = cal.days[dateStr];
  if (!mode) return;

  const templates = getShiftsForMode(mode);
  const tmpl = templates[slotIndex];
  const dayPlan = rota.days.find(dp => dp.date === dateStr);
  const shift = dayPlan?.shifts?.[slotIndex];

  const workers = getWorkers().filter(w =>
    w.allowedShiftTypes.includes(tmpl.type) || w.team === 'bank' || w.team === 'adhoc'
  );

  const currentStart = shift?.startTime || tmpl.startTime;
  const currentEnd = shift?.endTime || tmpl.endTime;
  const currentWorker = shift?.assignedWorker || '';

  showModal(`
    <h2>Assign ${tmpl.label}</h2>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">${dateStr}</p>
    <form id="assign-form">
      <div class="form-group">
        <label>Worker</label>
        <select name="worker">
          <option value="">TO COVER</option>
          ${workers.map(w => `<option value="${w.id}" ${w.id === currentWorker ? 'selected' : ''}>${w.name} (${w.team})</option>`).join('')}
        </select>
      </div>
      <div style="display: flex; gap: 1rem;">
        <div class="form-group" style="flex:1;">
          <label>Start Time</label>
          <input type="time" name="startTime" value="${currentStart}">
        </div>
        <div class="form-group" style="flex:1;">
          <label>End Time</label>
          <input type="time" name="endTime" value="${currentEnd}">
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
        <button type="button" class="btn btn-ghost" id="cancel-assign">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-assign').addEventListener('click', closeModal);
  document.getElementById('assign-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const workerId = form.worker.value || null;
    const startTime = form.startTime.value;
    const endTime = form.endTime.value;
    const hours = calculateHours(startTime, endTime);

    // Ensure day plan exists
    let dp = rota.days.find(d => d.date === dateStr);
    if (!dp) {
      dp = { date: dateStr, mode, shifts: templates.map((t, i) => ({
        slotIndex: i, shiftType: t.type, startTime: t.startTime, endTime: t.endTime,
        hours: t.hours, assignedWorker: null,
      }))};
      rota.days.push(dp);
    }

    dp.shifts[slotIndex] = {
      slotIndex,
      shiftType: tmpl.type,
      startTime,
      endTime,
      hours,
      assignedWorker: workerId,
    };

    saveRota(rota);
    closeModal();
    renderMonthlyRota(container);
  });
}

function addRotaStyles() {
  if (document.getElementById('rota-styles')) return;
  const style = document.createElement('style');
  style.id = 'rota-styles';
  style.textContent = `
    .rota-table { width: 100%; border-collapse: collapse; min-width: 600px; }
    .rota-table th {
      padding: 0.5rem;
      text-align: center;
      background: var(--bg-card);
      border-bottom: 2px solid var(--border);
      font-size: 0.8rem;
      position: sticky;
      top: 0;
    }
    .rota-table td { padding: 0.3rem; }
    .date-cell { font-size: 0.8rem; white-space: nowrap; padding: 0.5rem !important; }
    .row-home { background: var(--bg-home); }
    .row-away { background: var(--bg-away); }
    .row-unset { background: var(--bg); }
    .rota-table tr { border-bottom: 1px solid #1a1a2e; }
    .shift-cell { cursor: pointer; }
    .shift-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.4rem;
      text-align: center;
      min-width: 100px;
    }
    .shift-card:hover { border-color: var(--blue); }
    .shift-time { color: var(--text-muted); font-size: 0.7rem; }
    .shift-worker { font-size: 0.8rem; }
    .shift-worker.cover { color: var(--red); font-weight: bold; }
    .shift-cover { border-color: #5c1a1a; }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 2: Test the Monthly Rota screen**

Set some Home/Away days in the Year Planner first. Then navigate to the Rota tab. Expected: days show with correct shift columns, "Not set" for unmarked days, "TO COVER" for all slots. Click a shift card to open the assign modal, pick a worker, save. Verify the name appears and persists.

- [ ] **Step 3: Commit**

```bash
git add src/js/monthlyRota.js
git commit -m "feat: monthly rota screen with shift table and worker assignment"
```

---

### Task 6: Auto-Fill Algorithm

**Files:**
- Modify: `src/js/autoFill.js`
- Create: `tests/autoFill.test.js`
- Modify: `tests/test-runner.html`

- [ ] **Step 1: Write tests for auto-fill**

```javascript
// tests/autoFill.test.js
import { initData, setDayMode, getYearCalendar, getWorkers, saveAvailability, getRota } from '../src/js/data.js';
import { runAutoFill } from '../src/js/autoFill.js';

describe('Auto-Fill — Away Days', () => {
  it('assigns Andrew and Kapil to all away day slots', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-08', 'away');
    setDayMode(2026, '2026-04-09', 'away');
    runAutoFill('2026-04');
    const rota = getRota('2026-04');
    const day8 = rota.days.find(d => d.date === '2026-04-08');
    assert.ok(day8);
    assert.equal(day8.shifts.length, 4);
    // Away workers should be assigned
    const workers = getWorkers();
    const andrew = workers.find(w => w.name === 'Andrew Cockbill');
    const kapil = workers.find(w => w.name === 'Kapil Kumar Kumar');
    assert.equal(day8.shifts[0].assignedWorker, andrew.id);
    assert.equal(day8.shifts[1].assignedWorker, kapil.id);
    assert.equal(day8.shifts[2].assignedWorker, andrew.id);
    assert.equal(day8.shifts[3].assignedWorker, kapil.id);
  });
});

describe('Auto-Fill — Home Days', () => {
  it('assigns home team workers and leaves TO COVER for gaps', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-01', 'home');
    setDayMode(2026, '2026-04-02', 'home');
    runAutoFill('2026-04');
    const rota = getRota('2026-04');
    const day1 = rota.days.find(d => d.date === '2026-04-01');
    assert.ok(day1);
    assert.equal(day1.shifts.length, 4);
    // At least some shifts should have workers assigned
    const assigned = day1.shifts.filter(s => s.assignedWorker !== null);
    assert.ok(assigned.length > 0);
  });
});

describe('Auto-Fill — Annual Leave', () => {
  it('does not assign worker on A/L days', () => {
    localStorage.clear();
    initData();
    setDayMode(2026, '2026-04-01', 'home');
    const workers = getWorkers();
    const karen = workers.find(w => w.name === 'Karen Hughes');
    saveAvailability({ workerId: karen.id, month: '2026-04', annualLeaveDays: [1], preferredShifts: [], blockedShifts: [] });
    runAutoFill('2026-04');
    const rota = getRota('2026-04');
    const day1 = rota.days.find(d => d.date === '2026-04-01');
    const karenShifts = day1.shifts.filter(s => s.assignedWorker === karen.id);
    assert.equal(karenShifts.length, 0);
  });
});

describe('Auto-Fill — 3-Day Consecutive Limit', () => {
  it('does not assign same home worker more than 3 consecutive days', () => {
    localStorage.clear();
    initData();
    // Set 5 consecutive home days
    for (let d = 1; d <= 5; d++) {
      setDayMode(2026, `2026-04-${String(d).padStart(2, '0')}`, 'home');
    }
    runAutoFill('2026-04');
    const rota = getRota('2026-04');
    const workers = getWorkers();

    // Check each worker doesn't have >3 consecutive days
    for (const worker of workers.filter(w => w.team !== 'away')) {
      let consecutive = 0;
      let maxConsecutive = 0;
      for (let d = 1; d <= 5; d++) {
        const dateStr = `2026-04-${String(d).padStart(2, '0')}`;
        const dayPlan = rota.days.find(dp => dp.date === dateStr);
        const hasShift = dayPlan?.shifts?.some(s => s.assignedWorker === worker.id);
        if (hasShift) {
          consecutive++;
          maxConsecutive = Math.max(maxConsecutive, consecutive);
        } else {
          consecutive = 0;
        }
      }
      assert.ok(maxConsecutive <= 3, `${worker.name} has ${maxConsecutive} consecutive days`);
    }
  });
});
```

- [ ] **Step 2: Add auto-fill test import to test-runner.html**

```html
<script type="module">
  import '../tests/shiftTemplates.test.js';
  import '../tests/data.test.js';
  import '../tests/autoFill.test.js';
  renderResults();
</script>
```

- [ ] **Step 3: Run tests — verify they fail**

Refresh `test-runner.html`. Expected: auto-fill tests fail because `autoFill.js` has no `runAutoFill` export.

- [ ] **Step 4: Implement auto-fill algorithm**

```javascript
// src/js/autoFill.js
import { getYearCalendar, getWorkers, getRota, saveRota, getAvailability } from './data.js';
import { getShiftsForMode } from './shiftTemplates.js';

export function runAutoFill(monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cal = getYearCalendar(year);
  const workers = getWorkers();

  // Load availability for all workers
  const availMap = {};
  for (const w of workers) {
    availMap[w.id] = getAvailability(w.id, monthStr);
  }

  // Track hours per worker this month
  const hoursUsed = {};
  for (const w of workers) hoursUsed[w.id] = 0;

  // Track consecutive days per worker
  const consecutiveDays = {};
  for (const w of workers) consecutiveDays[w.id] = 0;

  // Identify away team
  const awayTeam = workers.filter(w => w.team === 'away');

  // Build day plans
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const mode = cal.days[dateStr];
    if (!mode) continue;

    const templates = getShiftsForMode(mode);
    const shifts = templates.map((tmpl, i) => ({
      slotIndex: i,
      shiftType: tmpl.type,
      startTime: tmpl.startTime,
      endTime: tmpl.endTime,
      hours: tmpl.hours,
      assignedWorker: null,
    }));

    if (mode === 'away') {
      // Away days: assign away team workers
      // Slot 0 and 2 = first away worker, Slot 1 and 3 = second away worker
      const awayWorker1 = awayTeam[0];
      const awayWorker2 = awayTeam[1];

      if (awayWorker1 && !isBlocked(awayWorker1.id, d, availMap)) {
        shifts[0].assignedWorker = awayWorker1.id;
        shifts[2].assignedWorker = awayWorker1.id;
        hoursUsed[awayWorker1.id] += shifts[0].hours + shifts[2].hours;
      }
      if (awayWorker2 && !isBlocked(awayWorker2.id, d, availMap)) {
        shifts[1].assignedWorker = awayWorker2.id;
        shifts[3].assignedWorker = awayWorker2.id;
        hoursUsed[awayWorker2.id] += shifts[1].hours + shifts[3].hours;
      }

      // Reset consecutive for all non-away workers
      for (const w of workers.filter(w => w.team !== 'away')) {
        consecutiveDays[w.id] = 0;
      }
    } else {
      // Home days: assign from eligible workers
      // Apply preferred shifts first
      for (const w of workers) {
        const avail = availMap[w.id];
        for (const pref of avail.preferredShifts) {
          if (pref.day === d && shifts[pref.shiftSlot].assignedWorker === null) {
            if (canAssign(w, d, pref.shiftSlot, shifts, availMap, hoursUsed, consecutiveDays)) {
              shifts[pref.shiftSlot].assignedWorker = w.id;
              hoursUsed[w.id] += shifts[pref.shiftSlot].hours;
            }
          }
        }
      }

      // Fill remaining slots
      for (let s = 0; s < 4; s++) {
        if (shifts[s].assignedWorker !== null) continue;

        const eligible = getEligibleWorkers(workers, s, shifts[s].shiftType, d, availMap, hoursUsed, consecutiveDays);
        if (eligible.length > 0) {
          // Pick worker furthest from their hours target
          const best = pickBestWorker(eligible, hoursUsed);
          shifts[s].assignedWorker = best.id;
          hoursUsed[best.id] += shifts[s].hours;
        }
      }

      // Update consecutive tracking
      for (const w of workers.filter(w => w.team !== 'away')) {
        const workedToday = shifts.some(s => s.assignedWorker === w.id);
        if (workedToday) {
          consecutiveDays[w.id]++;
        } else {
          consecutiveDays[w.id] = 0;
        }
      }
    }

    days.push({ date: dateStr, mode, shifts });
  }

  const rota = { month: monthStr, days, version: 'V1', status: 'draft' };
  saveRota(rota);
  return rota;
}

function isBlocked(workerId, day, availMap) {
  const avail = availMap[workerId];
  return avail.annualLeaveDays.includes(day);
}

function isShiftBlocked(workerId, day, slotIndex, availMap) {
  const avail = availMap[workerId];
  return avail.blockedShifts.some(b => b.day === day && b.shiftSlot === slotIndex);
}

function canAssign(worker, day, slotIndex, shifts, availMap, hoursUsed, consecutiveDays) {
  // On A/L
  if (isBlocked(worker.id, day, availMap)) return false;
  // Shift blocked
  if (isShiftBlocked(worker.id, day, slotIndex, availMap)) return false;
  // Away team can't do home shifts
  if (worker.team === 'away') return false;
  // Shift type allowed
  if (!worker.allowedShiftTypes.includes(shifts[slotIndex].shiftType)) return false;
  // 3-day consecutive limit
  if (consecutiveDays[worker.id] >= 3) return false;
  // Already assigned to another shift this day
  if (shifts.some(s => s.assignedWorker === worker.id)) return false;
  // Maximum contract: check hours
  if (worker.contractType === 'maximum' && worker.monthlyHours) {
    if (hoursUsed[worker.id] + shifts[slotIndex].hours > worker.monthlyHours) return false;
  }
  return true;
}

function getEligibleWorkers(workers, slotIndex, shiftType, day, availMap, hoursUsed, consecutiveDays) {
  return workers.filter(w => {
    if (w.team === 'away') return false;
    if (!w.allowedShiftTypes.includes(shiftType)) return false;
    if (isBlocked(w.id, day, availMap)) return false;
    if (isShiftBlocked(w.id, day, slotIndex, availMap)) return false;
    if (consecutiveDays[w.id] >= 3) return false;
    if (w.contractType === 'maximum' && w.monthlyHours) {
      if (hoursUsed[w.id] + getShiftsForMode('home')[slotIndex].hours > w.monthlyHours) return false;
    }
    return true;
  });
}

function pickBestWorker(eligible, hoursUsed) {
  // Prefer workers with the most remaining capacity
  return eligible.sort((a, b) => {
    const aTarget = a.monthlyHours || Infinity;
    const bTarget = b.monthlyHours || Infinity;
    const aRemaining = aTarget - (hoursUsed[a.id] || 0);
    const bRemaining = bTarget - (hoursUsed[b.id] || 0);
    // Higher remaining = pick first
    return bRemaining - aRemaining;
  })[0];
}
```

- [ ] **Step 5: Run tests — verify they pass**

Refresh `test-runner.html`. Expected: all auto-fill tests pass (green).

- [ ] **Step 6: Test auto-fill in the app**

Set some Home and Away days in Year Planner, then go to Rota tab and click "Auto-Fill". Expected: Away days get Andrew + Kapil, Home days get various workers assigned, "TO COVER" for gaps.

- [ ] **Step 7: Commit**

```bash
git add src/js/autoFill.js tests/autoFill.test.js tests/test-runner.html
git commit -m "feat: auto-fill algorithm with team rules, consecutive limits, A/L"
```

---

### Task 7: Pre-Populate Form

**Files:**
- Modify: `src/js/prePopulate.js`

- [ ] **Step 1: Implement the Pre-Populate form**

```javascript
// src/js/prePopulate.js
import { getWorkers, getAvailability, saveAvailability, getYearCalendar } from './data.js';
import { showModal, closeModal } from './app.js';

export function renderPrePopulate(monthStr) {
  const workers = getWorkers();
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = new Date(year, monthIndex, 1).toLocaleString('en-GB', { month: 'long' });

  let selectedWorker = workers[0]?.id || null;

  function render() {
    const avail = selectedWorker ? getAvailability(selectedWorker, monthStr) : null;
    const worker = workers.find(w => w.id === selectedWorker);

    showModal(`
      <h2>Availability — ${monthName} ${yearStr}</h2>
      <div class="form-group">
        <label>Worker</label>
        <select id="pp-worker-select">
          ${workers.map(w => `<option value="${w.id}" ${w.id === selectedWorker ? 'selected' : ''}>${w.name} (${w.team})</option>`).join('')}
        </select>
      </div>

      <h3 style="margin: 1rem 0 0.5rem; font-size: 0.9rem;">Annual Leave Days</h3>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Click days to toggle A/L</p>
      <div class="pp-days" id="pp-al-days">
        ${renderDayPicker(daysInMonth, year, monthIndex, avail?.annualLeaveDays || [], 'al')}
      </div>

      <h3 style="margin: 1rem 0 0.5rem; font-size: 0.9rem;">Blocked Days</h3>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Click days worker cannot work</p>
      <div class="pp-days" id="pp-blocked-days">
        ${renderDayPicker(daysInMonth, year, monthIndex, avail?.blockedShifts?.map(b => b.day) || [], 'blocked')}
      </div>

      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn btn-ghost" id="pp-close">Close</button>
      </div>
    `);

    addPrePopStyles();

    document.getElementById('pp-worker-select').addEventListener('change', (e) => {
      selectedWorker = e.target.value;
      render();
    });

    document.getElementById('pp-close').addEventListener('click', closeModal);

    // A/L day toggles
    document.querySelectorAll('.pp-day[data-type="al"]').forEach(el => {
      el.addEventListener('click', () => {
        const day = Number(el.dataset.day);
        const current = getAvailability(selectedWorker, monthStr);
        if (current.annualLeaveDays.includes(day)) {
          current.annualLeaveDays = current.annualLeaveDays.filter(d => d !== day);
        } else {
          current.annualLeaveDays.push(day);
        }
        saveAvailability(current);
        render();
      });
    });

    // Blocked day toggles
    document.querySelectorAll('.pp-day[data-type="blocked"]').forEach(el => {
      el.addEventListener('click', () => {
        const day = Number(el.dataset.day);
        const current = getAvailability(selectedWorker, monthStr);
        const idx = current.blockedShifts.findIndex(b => b.day === day);
        if (idx >= 0) {
          current.blockedShifts.splice(idx, 1);
        } else {
          // Block all slots for that day
          current.blockedShifts.push({ day, shiftSlot: 0 }, { day, shiftSlot: 1 }, { day, shiftSlot: 2 }, { day, shiftSlot: 3 });
        }
        saveAvailability(current);
        render();
      });
    });
  }

  render();
}

function renderDayPicker(daysInMonth, year, monthIndex, selectedDays, type) {
  let html = '';
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthIndex, d).toLocaleString('en-GB', { weekday: 'narrow' });
    const isSelected = selectedDays.includes(d);
    html += `<div class="pp-day ${isSelected ? 'selected' : ''}" data-day="${d}" data-type="${type}">
      <div class="pp-day-num">${d}</div>
      <div class="pp-day-dow">${dow}</div>
    </div>`;
  }
  return html;
}

function addPrePopStyles() {
  if (document.getElementById('pp-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-styles';
  style.textContent = `
    .pp-days {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .pp-day {
      width: 36px;
      height: 44px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      background: var(--bg);
      border: 1px solid var(--border);
      user-select: none;
    }
    .pp-day:hover { border-color: var(--blue); }
    .pp-day.selected { background: var(--red); color: white; border-color: var(--red); }
    .pp-day-num { font-size: 0.8rem; font-weight: bold; }
    .pp-day-dow { font-size: 0.6rem; color: var(--text-muted); }
    .pp-day.selected .pp-day-dow { color: rgba(255,255,255,0.7); }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 2: Test the Pre-Populate form**

From the Rota screen, click "Availability". Expected: modal with worker dropdown, A/L day picker, and blocked day picker. Toggle days on/off — they should turn red when selected. Change workers — each has independent availability. Close and re-open to verify persistence.

- [ ] **Step 3: Commit**

```bash
git add src/js/prePopulate.js
git commit -m "feat: pre-populate form for A/L and blocked days"
```

---

### Task 8: Hours Dashboard

**Files:**
- Modify: `src/js/hoursDashboard.js`
- Create: `tests/hoursDashboard.test.js`
- Modify: `tests/test-runner.html`

- [ ] **Step 1: Write tests for hours calculations**

```javascript
// tests/hoursDashboard.test.js
import { initData, setDayMode, saveRota, getWorkers } from '../src/js/data.js';
import { calculateWorkerHours } from '../src/js/hoursDashboard.js';

describe('Hours Dashboard — Calculations', () => {
  it('sums hours from rota for a worker', () => {
    localStorage.clear();
    initData();
    const workers = getWorkers();
    const karen = workers.find(w => w.name === 'Karen Hughes');
    saveRota({
      month: '2026-04',
      days: [
        { date: '2026-04-01', mode: 'home', shifts: [
          { slotIndex: 0, shiftType: 'shortDay', startTime: '09:00', endTime: '18:00', hours: 9, assignedWorker: karen.id },
          { slotIndex: 1, shiftType: 'longDay', startTime: '09:00', endTime: '21:00', hours: 12, assignedWorker: null },
          { slotIndex: 2, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
          { slotIndex: 3, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
        ]},
        { date: '2026-04-02', mode: 'home', shifts: [
          { slotIndex: 0, shiftType: 'shortDay', startTime: '09:00', endTime: '18:00', hours: 9, assignedWorker: null },
          { slotIndex: 1, shiftType: 'longDay', startTime: '09:00', endTime: '21:00', hours: 12, assignedWorker: karen.id },
          { slotIndex: 2, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
          { slotIndex: 3, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
        ]},
      ],
      version: 'V1',
      status: 'draft',
    });
    const result = calculateWorkerHours('2026-04');
    const karenHours = result.find(r => r.workerId === karen.id);
    assert.equal(karenHours.totalHours, 21);
  });

  it('returns status based on contract type', () => {
    localStorage.clear();
    initData();
    const workers = getWorkers();
    const karen = workers.find(w => w.name === 'Karen Hughes');
    // Karen is maximum/150hrs — 21hrs should be "under"
    saveRota({
      month: '2026-04',
      days: [
        { date: '2026-04-01', mode: 'home', shifts: [
          { slotIndex: 0, shiftType: 'shortDay', startTime: '09:00', endTime: '18:00', hours: 9, assignedWorker: karen.id },
          { slotIndex: 1, shiftType: 'longDay', startTime: '09:00', endTime: '21:00', hours: 12, assignedWorker: karen.id },
          { slotIndex: 2, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
          { slotIndex: 3, shiftType: 'wakingNight', startTime: '21:00', endTime: '09:00', hours: 12, assignedWorker: null },
        ]},
      ],
      version: 'V1',
      status: 'draft',
    });
    const result = calculateWorkerHours('2026-04');
    const karenHours = result.find(r => r.workerId === karen.id);
    assert.equal(karenHours.status, 'under');
  });
});
```

- [ ] **Step 2: Add hours test import to test-runner.html**

```html
<script type="module">
  import '../tests/shiftTemplates.test.js';
  import '../tests/data.test.js';
  import '../tests/autoFill.test.js';
  import '../tests/hoursDashboard.test.js';
  renderResults();
</script>
```

- [ ] **Step 3: Run tests — verify they fail**

Refresh `test-runner.html`. Expected: hours dashboard tests fail.

- [ ] **Step 4: Implement hours dashboard**

```javascript
// src/js/hoursDashboard.js
import { getWorkers, getRota, getWorkerById } from './data.js';

let dashboardMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

export function calculateWorkerHours(monthStr) {
  const rota = getRota(monthStr);
  const workers = getWorkers(true);
  const results = [];

  for (const worker of workers) {
    let totalHours = 0;
    let shiftCount = 0;

    if (rota?.days) {
      for (const day of rota.days) {
        for (const shift of day.shifts) {
          if (shift.assignedWorker === worker.id) {
            totalHours += shift.hours;
            shiftCount++;
          }
        }
      }
    }

    const [, monthNumStr] = monthStr.split('-');
    const monthIndex = Number(monthNumStr) - 1;
    const year = Number(monthStr.split('-')[0]);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const weeksInMonth = daysInMonth / 7;
    const weeklyAvg = weeksInMonth > 0 ? Math.round((totalHours / weeksInMonth) * 100) / 100 : 0;

    let status = 'none';
    if (worker.contractType === 'maximum' && worker.monthlyHours) {
      if (totalHours > worker.monthlyHours) status = 'over';
      else if (totalHours >= worker.monthlyHours * 0.9) status = 'approaching';
      else if (totalHours >= worker.monthlyHours * 0.5) status = 'on-track';
      else status = 'under';
    } else if (worker.contractType === 'minimum' && worker.monthlyHours) {
      if (totalHours >= worker.monthlyHours) status = 'on-track';
      else if (totalHours >= worker.monthlyHours * 0.7) status = 'approaching';
      else status = 'under';
    }

    results.push({
      workerId: worker.id,
      name: worker.name,
      team: worker.team,
      contractType: worker.contractType,
      monthlyHours: worker.monthlyHours,
      totalHours,
      weeklyAvg,
      shiftCount,
      status,
    });
  }

  return results;
}

export function renderHoursDashboard(container) {
  const [yearStr, monthNumStr] = dashboardMonth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  const monthName = new Date(year, monthIndex, 1).toLocaleString('en-GB', { month: 'long' });

  const results = calculateWorkerHours(dashboardMonth);
  const activeResults = results.filter(r => {
    const w = getWorkerById(r.workerId);
    return w?.active;
  });

  const statusColors = {
    'on-track': 'var(--green)',
    'approaching': 'var(--amber)',
    'over': 'var(--red)',
    'under': 'var(--amber)',
    'none': 'var(--text-dim)',
  };

  const statusLabels = {
    'on-track': 'On Track',
    'approaching': 'Approaching',
    'over': 'Over',
    'under': 'Under',
    'none': '—',
  };

  container.innerHTML = `
    <div class="header">
      <button class="btn btn-ghost" id="hd-prev">←</button>
      <h1>${monthName} ${yearStr}</h1>
      <button class="btn btn-ghost" id="hd-next">→</button>
    </div>
    <div style="overflow-x: auto; padding: 0.5rem;">
      <table class="hours-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Team</th>
            <th>Contract</th>
            <th>Target</th>
            <th>Actual</th>
            <th>Wk Avg</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${activeResults.map(r => `
            <tr>
              <td><strong>${r.name}</strong></td>
              <td><span class="badge" style="background: ${{home:'var(--blue)',away:'var(--amber)',bank:'var(--purple)',adhoc:'var(--text-dim)'}[r.team]}">${r.team}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted);">${r.contractType}</td>
              <td>${r.monthlyHours || '—'}</td>
              <td><strong>${r.totalHours}</strong></td>
              <td>${r.weeklyAvg}</td>
              <td style="color: ${statusColors[r.status]}; font-weight: 600;">${statusLabels[r.status]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  addHoursStyles();

  container.querySelector('#hd-prev').addEventListener('click', () => {
    let [y, m] = dashboardMonth.split('-').map(Number);
    m--;
    if (m < 1) { m = 12; y--; }
    dashboardMonth = `${y}-${String(m).padStart(2, '0')}`;
    renderHoursDashboard(container);
  });
  container.querySelector('#hd-next').addEventListener('click', () => {
    let [y, m] = dashboardMonth.split('-').map(Number);
    m++;
    if (m > 12) { m = 1; y++; }
    dashboardMonth = `${y}-${String(m).padStart(2, '0')}`;
    renderHoursDashboard(container);
  });
}

function addHoursStyles() {
  if (document.getElementById('hours-styles')) return;
  const style = document.createElement('style');
  style.id = 'hours-styles';
  style.textContent = `
    .hours-table { width: 100%; border-collapse: collapse; min-width: 500px; }
    .hours-table th {
      padding: 0.5rem;
      text-align: left;
      background: var(--bg-card);
      border-bottom: 2px solid var(--border);
      font-size: 0.8rem;
    }
    .hours-table td {
      padding: 0.5rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
    }
  `;
  document.head.appendChild(style);
}
```

- [ ] **Step 5: Run tests — verify they pass**

Refresh `test-runner.html`. Expected: all hours dashboard tests pass (green).

- [ ] **Step 6: Test hours dashboard in the app**

Run auto-fill on a month, then check the Hours tab. Expected: table showing each worker's actual hours, weekly average, and colour-coded status.

- [ ] **Step 7: Commit**

```bash
git add src/js/hoursDashboard.js tests/hoursDashboard.test.js tests/test-runner.html
git commit -m "feat: hours dashboard with contract tracking"
```

---

### Task 9: Excel and PDF Export

**Files:**
- Modify: `src/js/export.js`
- Download: `src/js/lib/xlsx.full.min.js`
- Download: `src/js/lib/jspdf.umd.min.js`
- Download: `src/js/lib/jspdf.plugin.autotable.min.js`

- [ ] **Step 1: Download third-party libraries**

```bash
mkdir -p src/js/lib
curl -L -o src/js/lib/xlsx.full.min.js "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
curl -L -o src/js/lib/jspdf.umd.min.js "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"
curl -L -o src/js/lib/jspdf.plugin.autotable.min.js "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js"
```

- [ ] **Step 2: Add library script tags to index.html**

Add before the `<script type="module" src="src/js/app.js">` line:

```html
<script src="src/js/lib/xlsx.full.min.js"></script>
<script src="src/js/lib/jspdf.umd.min.js"></script>
<script src="src/js/lib/jspdf.plugin.autotable.min.js"></script>
```

- [ ] **Step 3: Implement export and settings screen**

```javascript
// src/js/export.js
import { getRota, getWorkers, getWorkerById, exportAllData, importAllData } from './data.js';
import { calculateWorkerHours } from './hoursDashboard.js';

let exportMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

export function renderSettings(container) {
  const [yearStr, monthNumStr] = exportMonth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  const monthName = new Date(year, monthIndex, 1).toLocaleString('en-GB', { month: 'long' });

  container.innerHTML = `
    <div class="header">
      <h1>Export & Backup</h1>
    </div>
    <div style="padding: 1rem;">

      <div class="card">
        <h3 style="margin-bottom: 0.75rem;">Export Rota</h3>
        <div class="form-group">
          <label>Month</label>
          <input type="month" id="export-month" value="${exportMonth}">
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary" id="export-excel">📊 Export Excel</button>
          <button class="btn btn-primary" id="export-pdf">📄 Export PDF</button>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 0.75rem;">Backup Data</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Export all app data (workers, calendars, rotas) as a JSON file. Use import to restore from a backup.
        </p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-success" id="backup-export">💾 Export Backup</button>
          <button class="btn btn-ghost" id="backup-import">📂 Import Backup</button>
        </div>
        <input type="file" id="backup-file" accept=".json" style="display: none;">
      </div>

    </div>
  `;

  container.querySelector('#export-month').addEventListener('change', (e) => {
    exportMonth = e.target.value;
  });

  container.querySelector('#export-excel').addEventListener('click', () => generateExcel(exportMonth));
  container.querySelector('#export-pdf').addEventListener('click', () => generatePdf(exportMonth));

  container.querySelector('#backup-export').addEventListener('click', () => {
    const json = exportAllData();
    downloadFile(`ryans-rotas-backup-${new Date().toISOString().slice(0,10)}.json`, json, 'application/json');
  });

  container.querySelector('#backup-import').addEventListener('click', () => {
    container.querySelector('#backup-file').click();
  });

  container.querySelector('#backup-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAllData(reader.result);
        alert('Backup restored successfully!');
      } catch (err) {
        alert('Error restoring backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
}

function generateExcel(monthStr) {
  const rota = getRota(monthStr);
  if (!rota || !rota.days.length) { alert('No rota data for this month.'); return; }

  const [yearStr, monthNumStr] = monthStr.split('-');
  const monthName = new Date(Number(yearStr), Number(monthNumStr) - 1, 1).toLocaleString('en-GB', { month: 'long' });

  // Build rota rows
  const rows = [['Date', 'Shift', 'Hours', 'Service Type', 'Name']];
  const shiftLabels = {
    shortDay: 'Short Day', longDay: 'Long Day', wakingNight: 'Waking Night',
    dayShift: 'Day Shift', sleepNight: 'Sleep Night',
  };

  for (const day of rota.days) {
    const dayNum = Number(day.date.split('-')[2]);
    const suffix = getOrdinalSuffix(dayNum);
    let isFirstShift = true;
    for (const shift of day.shifts) {
      const worker = shift.assignedWorker ? getWorkerById(shift.assignedWorker) : null;
      rows.push([
        isFirstShift ? `${dayNum}${suffix}` : '',
        `${shift.startTime}-${shift.endTime}`,
        shift.hours,
        shiftLabels[shift.shiftType] || shift.shiftType,
        worker ? worker.name : 'TO COVER',
      ]);
      isFirstShift = false;
    }
  }

  // Add summary
  rows.push([]);
  rows.push(['Worker', 'Total Hours', 'Shifts', 'Weekly Avg']);
  const hoursSummary = calculateWorkerHours(monthStr);
  for (const h of hoursSummary.filter(h => h.totalHours > 0)) {
    rows.push([h.name, h.totalHours, h.shiftCount, h.weeklyAvg]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Rota');
  XLSX.writeFile(wb, `Rota ${monthName} ${yearStr}.xlsx`);
}

function generatePdf(monthStr) {
  const rota = getRota(monthStr);
  if (!rota || !rota.days.length) { alert('No rota data for this month.'); return; }

  const [yearStr, monthNumStr] = monthStr.split('-');
  const monthName = new Date(Number(yearStr), Number(monthNumStr) - 1, 1).toLocaleString('en-GB', { month: 'long' });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Ryan's Rota — ${monthName} ${yearStr}`, 14, 20);

  const shiftLabels = {
    shortDay: 'Short Day', longDay: 'Long Day', wakingNight: 'Waking Night',
    dayShift: 'Day Shift', sleepNight: 'Sleep Night',
  };

  const tableRows = [];
  for (const day of rota.days) {
    const dayNum = Number(day.date.split('-')[2]);
    const suffix = getOrdinalSuffix(dayNum);
    let isFirst = true;
    for (const shift of day.shifts) {
      const worker = shift.assignedWorker ? getWorkerById(shift.assignedWorker) : null;
      tableRows.push([
        isFirst ? `${dayNum}${suffix}` : '',
        `${shift.startTime}-${shift.endTime}`,
        shift.hours,
        shiftLabels[shift.shiftType] || shift.shiftType,
        worker ? worker.name : 'TO COVER',
      ]);
      isFirst = false;
    }
  }

  doc.autoTable({
    startY: 30,
    head: [['Date', 'Shift', 'Hours', 'Type', 'Name']],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    theme: 'grid',
  });

  // Summary table
  const summaryY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Summary', 14, summaryY);

  const hoursSummary = calculateWorkerHours(monthStr);
  const summaryRows = hoursSummary
    .filter(h => h.totalHours > 0)
    .map(h => [h.name, h.totalHours, h.shiftCount, h.weeklyAvg]);

  doc.autoTable({
    startY: summaryY + 5,
    head: [['Worker', 'Total Hours', 'Shifts', 'Weekly Avg']],
    body: summaryRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    theme: 'grid',
  });

  doc.save(`Rota ${monthName} ${yearStr}.pdf`);
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Test exports in the app**

Generate a rota with auto-fill, then go to Settings tab:
- Click "Export Excel" — an .xlsx file should download matching Ryan's existing format.
- Click "Export PDF" — a .pdf should download with the rota table and summary.
- Click "Export Backup" — a .json file downloads.
- Click "Import Backup" — select the JSON file, data restores.

- [ ] **Step 5: Commit**

```bash
git add src/js/export.js src/js/lib/ index.html
git commit -m "feat: Excel, PDF export and JSON backup"
```

---

### Task 10: Final Polish and Initial Data

**Files:**
- Modify: `src/css/styles.css` (any visual fixes)
- Modify: `src/js/app.js` (any fixes)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with final project details**

```markdown
# Ryan's Rotas

## Project Overview
A mobile-friendly static web app for managing 24-hour care rotas. No backend — localStorage for data, JSON backup, client-side Excel/PDF export.

## Tech Stack
- Vanilla HTML/CSS/JavaScript (ES modules)
- SheetJS (xlsx) for Excel export
- jsPDF + AutoTable for PDF export
- No build step — just serve the files

## Running Locally
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Running Tests
Open `tests/test-runner.html` in a browser (via the local server).

## Project Structure
```
index.html              # Entry point
src/css/styles.css      # All styles
src/js/app.js           # Routing and navigation
src/js/data.js          # Data layer (localStorage)
src/js/shiftTemplates.js # Shift definitions
src/js/workers.js       # Workers CRUD screen
src/js/yearPlanner.js   # Year calendar screen
src/js/monthlyRota.js   # Monthly rota screen
src/js/prePopulate.js   # Availability form
src/js/autoFill.js      # Auto-fill algorithm
src/js/hoursDashboard.js # Hours tracking
src/js/export.js        # Excel, PDF, backup
```

## Key Design Decisions
- No framework — keeps it simple, no build step
- localStorage — single user, no server needed
- Fixed teams: Away team (Andrew + Kapil) auto-assigned, Home team cycled with constraints
- 3-day consecutive limit for home workers (soft — can override manually)
- Contract types: maximum, minimum, away-linked, bank, adhoc
```

- [ ] **Step 2: Do a full manual test walkthrough**

1. Open app — Year Planner loads
2. Mark some days Home and Away for April 2026
3. Go to Workers — verify all 9 default workers
4. Go to Rota — see April with shift columns
5. Click "Availability" — set some A/L for Karen
6. Click "Auto-Fill" — shifts populate
7. Click a shift card — reassign worker
8. Go to Hours — verify totals
9. Go to Settings — export Excel, PDF, JSON backup
10. Clear localStorage, import backup — verify data restores

- [ ] **Step 3: Fix any visual issues found during testing**

Apply any CSS or layout fixes discovered during the walkthrough.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: final polish, updated CLAUDE.md, initial data"
```
