import { getYearCalendar, getWorkers, getRota, saveRota, getAvailability } from './data.js';
import { getShiftsForMode } from './shiftTemplates.js';

export function runAutoFill(monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cal = getYearCalendar(year);
  const workers = getWorkers();

  const availMap = {};
  for (const w of workers) {
    availMap[w.id] = getAvailability(w.id, monthStr);
  }

  const hoursUsed = {};
  for (const w of workers) hoursUsed[w.id] = 0;

  const consecutiveDays = {};
  for (const w of workers) consecutiveDays[w.id] = 0;

  const awayTeam = workers.filter(w => w.team === 'away');

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

      for (const w of workers.filter(w => w.team !== 'away')) {
        consecutiveDays[w.id] = 0;
      }
    } else {
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

      for (let s = 0; s < 4; s++) {
        if (shifts[s].assignedWorker !== null) continue;

        const eligible = getEligibleWorkers(workers, s, shifts[s].shiftType, d, availMap, hoursUsed, consecutiveDays, shifts);
        if (eligible.length > 0) {
          const best = pickBestWorker(eligible, hoursUsed);
          shifts[s].assignedWorker = best.id;
          hoursUsed[best.id] += shifts[s].hours;
        }
      }

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
  if (isBlocked(worker.id, day, availMap)) return false;
  if (isShiftBlocked(worker.id, day, slotIndex, availMap)) return false;
  if (worker.team === 'away') return false;
  if (!worker.allowedShiftTypes.includes(shifts[slotIndex].shiftType)) return false;
  if (consecutiveDays[worker.id] >= 3) return false;
  if (shifts.some(s => s.assignedWorker === worker.id)) return false;
  if (worker.contractType === 'maximum' && worker.monthlyHours) {
    if (hoursUsed[worker.id] + shifts[slotIndex].hours > worker.monthlyHours) return false;
  }
  return true;
}

function getEligibleWorkers(workers, slotIndex, shiftType, day, availMap, hoursUsed, consecutiveDays, shifts) {
  return workers.filter(w => {
    if (w.team === 'away') return false;
    if (!w.allowedShiftTypes.includes(shiftType)) return false;
    if (isBlocked(w.id, day, availMap)) return false;
    if (isShiftBlocked(w.id, day, slotIndex, availMap)) return false;
    if (consecutiveDays[w.id] >= 3) return false;
    if (shifts.some(s => s.assignedWorker === w.id)) return false;
    if (w.contractType === 'maximum' && w.monthlyHours) {
      if (hoursUsed[w.id] + getShiftsForMode('home')[slotIndex].hours > w.monthlyHours) return false;
    }
    return true;
  });
}

function pickBestWorker(eligible, hoursUsed) {
  return eligible.sort((a, b) => {
    const aTarget = a.monthlyHours || Infinity;
    const bTarget = b.monthlyHours || Infinity;
    const aRemaining = aTarget - (hoursUsed[a.id] || 0);
    const bRemaining = bTarget - (hoursUsed[b.id] || 0);
    return bRemaining - aRemaining;
  })[0];
}
