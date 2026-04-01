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
    for (let d = 1; d <= 5; d++) {
      setDayMode(2026, `2026-04-${String(d).padStart(2, '0')}`, 'home');
    }
    runAutoFill('2026-04');
    const rota = getRota('2026-04');
    const workers = getWorkers();

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
