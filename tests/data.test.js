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
