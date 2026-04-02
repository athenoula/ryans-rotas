import { getYearCalendar, getWorkers, getRota, saveRota, getAvailability, getEffectiveMode } from './data.js';
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
    const rawMode = cal.days[dateStr];
    if (!rawMode) continue;

    const effectiveMode = getEffectiveMode(dateStr);
    const templates = getShiftsForMode(effectiveMode);
    const shifts = templates.map((tmpl, i) => ({
      slotIndex: i,
      shiftType: tmpl.type,
      startTime: tmpl.startTime,
      endTime: tmpl.endTime,
      hours: tmpl.hours,
      assignedWorker: null,
    }));

    if (effectiveMode === 'away') {
      // Pure away day: assign away team to all slots
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
    } else if (effectiveMode === 'transition-away') {
      // Leaving home: home staff morning (slots 0-1), away staff afternoon+night (slots 2-5)
      // Slots 0-1 are shortDay (home staff), slots 2-3 are dayShift (away staff), slots 4-5 are sleepNight (away staff)
      for (let s = 0; s < shifts.length; s++) {
        const shift = shifts[s];
        if (shift.shiftType === 'shortDay') {
          // Home/bank staff
          const eligible = getEligibleWorkers(workers, s, shift.shiftType, d, availMap, hoursUsed, consecutiveDays, shifts);
          if (eligible.length > 0) {
            const best = pickBestWorker(eligible, hoursUsed);
            shift.assignedWorker = best.id;
            hoursUsed[best.id] += shift.hours;
          }
        } else {
          // Away staff
          const awayIdx = (shift.shiftType === 'dayShift') ? (s - 2) : (s - 4);
          const awayWorker = awayTeam[awayIdx % 2];
          if (awayWorker && !isBlocked(awayWorker.id, d, availMap)) {
            shift.assignedWorker = awayWorker.id;
            hoursUsed[awayWorker.id] += shift.hours;
          }
        }
      }
    } else if (effectiveMode === 'transition-home') {
      // Coming home: away staff day (slots 0-1), home night staff (slots 2-3)
      for (let s = 0; s < shifts.length; s++) {
        const shift = shifts[s];
        if (shift.shiftType === 'dayShift') {
          const awayWorker = awayTeam[s % 2];
          if (awayWorker && !isBlocked(awayWorker.id, d, availMap)) {
            shift.assignedWorker = awayWorker.id;
            hoursUsed[awayWorker.id] += shift.hours;
          }
        } else {
          // Waking night - home/bank/adhoc staff
          const eligible = getEligibleWorkers(workers, s, shift.shiftType, d, availMap, hoursUsed, consecutiveDays, shifts);
          if (eligible.length > 0) {
            const best = pickBestWorker(eligible, hoursUsed);
            shift.assignedWorker = best.id;
            hoursUsed[best.id] += shift.hours;
          }
        }
      }
    } else {
      // Home day: standard assignment logic
      for (const w of workers) {
        const avail = availMap[w.id];
        for (const pref of avail.preferredShifts) {
          if (pref.day === d && pref.shiftSlot < shifts.length && shifts[pref.shiftSlot].assignedWorker === null) {
            if (canAssign(w, d, pref.shiftSlot, shifts, availMap, hoursUsed, consecutiveDays)) {
              shifts[pref.shiftSlot].assignedWorker = w.id;
              hoursUsed[w.id] += shifts[pref.shiftSlot].hours;
            }
          }
        }
      }

      for (let s = 0; s < shifts.length; s++) {
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

    days.push({ date: dateStr, mode: effectiveMode, shifts });
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
    // Priority 1: Contracted workers (maximum/minimum) before bank/adhoc
    const aContracted = (a.contractType === 'maximum' || a.contractType === 'minimum') ? 1 : 0;
    const bContracted = (b.contractType === 'maximum' || b.contractType === 'minimum') ? 1 : 0;
    if (aContracted !== bContracted) return bContracted - aContracted;

    // Priority 2: Among contracted, prefer whoever has the most hours still to fill
    const aTarget = a.monthlyHours || 0;
    const bTarget = b.monthlyHours || 0;
    const aRemaining = aTarget - (hoursUsed[a.id] || 0);
    const bRemaining = bTarget - (hoursUsed[b.id] || 0);
    return bRemaining - aRemaining;
  })[0];
}
