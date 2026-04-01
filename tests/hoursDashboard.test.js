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
