// src/js/monthlyRota.js
import { getYearCalendar, getRota, saveRota, getWorkers, getWorkerById, getEffectiveMode } from './data.js';
import { getShiftsForMode, calculateHours } from './shiftTemplates.js';
import { showModal, closeModal } from './app.js';

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let zoomLevel = 100;

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
    <div style="padding: 0.5rem 0.5rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
      <button class="btn btn-success" id="auto-fill-btn">⚡ Auto-Fill</button>
      <button class="btn btn-ghost" id="pre-populate-btn">📝 Availability</button>
      <button class="btn btn-ghost" id="clear-rota-btn" style="color: var(--red);">Clear</button>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 0.3rem;">
        <button class="btn btn-ghost" id="zoom-out-btn" style="padding: 0.3rem 0.6rem; font-size: 1rem;">−</button>
        <span id="zoom-label" style="font-size: 0.75rem; color: var(--text-muted); min-width: 40px; text-align: center;">${zoomLevel}%</span>
        <button class="btn btn-ghost" id="zoom-in-btn" style="padding: 0.3rem 0.6rem; font-size: 1rem;">+</button>
      </div>
    </div>
    <div style="overflow-x: auto; padding: 0.5rem;" id="rota-scroll-container">
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

  // Apply current zoom
  const rotaTable = container.querySelector('#rota-table');
  rotaTable.style.transform = `scale(${zoomLevel / 100})`;
  rotaTable.style.transformOrigin = 'top left';
  const scrollContainer = container.querySelector('#rota-scroll-container');
  if (scrollContainer) scrollContainer.style.minHeight = rotaTable.offsetHeight * (zoomLevel / 100) + 'px';

  container.querySelector('#zoom-in-btn').addEventListener('click', () => {
    zoomLevel = Math.min(150, zoomLevel + 10);
    rotaTable.style.transform = `scale(${zoomLevel / 100})`;
    container.querySelector('#zoom-label').textContent = zoomLevel + '%';
  });
  container.querySelector('#zoom-out-btn').addEventListener('click', () => {
    zoomLevel = Math.max(50, zoomLevel - 10);
    rotaTable.style.transform = `scale(${zoomLevel / 100})`;
    container.querySelector('#zoom-label').textContent = zoomLevel + '%';
  });

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
    const rawMode = cal.days[dateStr] || null;
    const effectiveMode = rawMode ? getEffectiveMode(dateStr) : null;
    const dow = dayNames[new Date(currentYear, currentMonth, d).getDay()];
    const dayPlan = rota?.days?.find(dp => dp.date === dateStr);

    const isTransition = effectiveMode === 'transition-away' || effectiveMode === 'transition-home';
    const rowClass = isTransition ? 'row-transition' : rawMode === 'home' ? 'row-home' : rawMode === 'away' ? 'row-away' : 'row-unset';
    const badgeClass = isTransition ? 'badge-transition' : rawMode === 'home' ? 'badge-home' : rawMode === 'away' ? 'badge-away' : '';
    const badgeLabel = effectiveMode === 'transition-away' ? 'TRANS →' : effectiveMode === 'transition-home' ? '← TRANS' : rawMode ? rawMode.toUpperCase() : '';

    html += `<tr class="${rowClass}">`;
    html += `<td class="date-cell"><strong>${d}</strong> ${dow}`;
    if (rawMode) html += `<br><span class="badge ${badgeClass}">${badgeLabel}</span>`;
    html += `</td>`;

    if (!rawMode) {
      html += `<td colspan="4" style="text-align: center; color: var(--text-dim); font-size: 0.8rem;">Not set — mark Home or Away in Year Planner</td>`;
    } else {
      // Use the day plan's shifts if they exist, otherwise fall back to template
      const displayMode = dayPlan ? null : effectiveMode || rawMode;
      const templates = displayMode ? getShiftsForMode(displayMode) : null;
      const shifts = dayPlan?.shifts || (templates || []).map((t, i) => ({
        slotIndex: i, shiftType: t.type, startTime: t.startTime, endTime: t.endTime, hours: t.hours, assignedWorker: null,
      }));

      // Render first 4 shifts in the main row; overflow goes to a second row below
      const mainCount = Math.min(shifts.length, 4);
      for (let s = 0; s < mainCount; s++) {
        const shift = shifts[s];
        const worker = shift.assignedWorker ? getWorkerById(shift.assignedWorker) : null;
        const workerName = worker ? worker.name : 'TO COVER';
        const isCover = !worker;

        html += `<td class="shift-cell" data-date="${dateStr}" data-slot="${s}">
          <div class="shift-card ${isCover ? 'shift-cover' : ''}">
            <div class="shift-time">${shift.startTime}–${shift.endTime}</div>
            <div class="shift-worker ${isCover ? 'cover' : ''}">${workerName}</div>
          </div>
        </td>`;
      }
      for (let s = mainCount; s < 4; s++) {
        html += `<td></td>`;
      }
    }
    html += `</tr>`;

    // If more than 4 shifts (e.g. transition day with 6), render overflow row
    if (rawMode) {
      const shifts = rota?.days?.find(dp => dp.date === dateStr)?.shifts;
      if (shifts && shifts.length > 4) {
        html += `<tr class="${rowClass}">`;
        html += `<td class="date-cell" style="border-top: none;"></td>`;
        for (let s = 4; s < shifts.length; s++) {
          const shift = shifts[s];
          const worker = shift.assignedWorker ? getWorkerById(shift.assignedWorker) : null;
          const workerName = worker ? worker.name : 'TO COVER';
          const isCover = !worker;
          html += `<td class="shift-cell" data-date="${dateStr}" data-slot="${s}">
            <div class="shift-card ${isCover ? 'shift-cover' : ''}">
              <div class="shift-time">${shift.startTime}–${shift.endTime}</div>
              <div class="shift-worker ${isCover ? 'cover' : ''}">${workerName}</div>
            </div>
          </td>`;
        }
        for (let s = shifts.length; s < 8; s++) {
          html += `<td></td>`;
        }
        html += `</tr>`;
      }
    }
  }
  return html;
}

function ensureDayPlan(rota, dateStr, effectiveMode) {
  let dp = rota.days.find(d => d.date === dateStr);
  if (!dp) {
    const templates = getShiftsForMode(effectiveMode);
    dp = { date: dateStr, mode: effectiveMode, shifts: templates.map((t, i) => ({
      slotIndex: i, shiftType: t.type, startTime: t.startTime, endTime: t.endTime,
      hours: t.hours, assignedWorker: null,
    }))};
    rota.days.push(dp);
  }
  return dp;
}

function openAssignModal(dateStr, slotIndex, monthStr, container) {
  const rota = getRota(monthStr) || { month: monthStr, days: [], version: 'V1', status: 'draft' };
  const rawMode = getYearCalendar(currentYear).days[dateStr];
  if (!rawMode) return;
  const effectiveMode = getEffectiveMode(dateStr);

  const dp = ensureDayPlan(rota, dateStr, effectiveMode);
  const shift = dp.shifts[slotIndex];
  if (!shift) return;

  const allWorkers = getWorkers();

  const currentStart = shift.startTime;
  const currentEnd = shift.endTime;
  const currentWorker = shift.assignedWorker || '';

  showModal(`
    <h2>Assign Shift</h2>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">${dateStr} · ${shift.startTime}–${shift.endTime}</p>
    <form id="assign-form">
      <div class="form-group">
        <label>Worker</label>
        <select name="worker">
          <option value="">TO COVER</option>
          ${allWorkers.map(w => `<option value="${w.id}" ${w.id === currentWorker ? 'selected' : ''}>${w.name} (${w.team})</option>`).join('')}
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
        <button type="button" class="btn btn-danger" id="delete-shift" style="font-size: 0.75rem;">Delete</button>
        <button type="button" class="btn btn-ghost" id="split-shift" style="color: var(--purple);">✂ Split</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-assign').addEventListener('click', closeModal);

  document.getElementById('delete-shift').addEventListener('click', () => {
    dp.shifts.splice(slotIndex, 1);
    dp.shifts.forEach((s, i) => s.slotIndex = i);
    saveRota(rota);
    closeModal();
    renderMonthlyRota(container);
  });

  document.getElementById('split-shift').addEventListener('click', () => {
    closeModal();
    openSplitModal(dateStr, slotIndex, monthStr, container, rota, dp);
  });

  document.getElementById('assign-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const workerId = form.worker.value || null;
    const startTime = form.startTime.value;
    const endTime = form.endTime.value;
    const hours = calculateHours(startTime, endTime);

    dp.shifts[slotIndex] = {
      slotIndex,
      shiftType: shift.shiftType,
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

function openSplitModal(dateStr, slotIndex, monthStr, container, rota, dp) {
  const shift = dp.shifts[slotIndex];
  const midpoint = calculateMidpoint(shift.startTime, shift.endTime);

  showModal(`
    <h2>✂ Split Shift</h2>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">
      Splitting: ${shift.startTime}–${shift.endTime}
    </p>
    <p style="color: var(--text-dim); font-size: 0.8rem; margin-bottom: 1rem;">
      This creates two shifts from one. Set the split time below.
    </p>
    <form id="split-form">
      <div class="form-group">
        <label>Split at</label>
        <input type="time" name="splitTime" value="${midpoint}">
      </div>
      <div style="background: var(--bg); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.8rem;">
        <div style="margin-bottom: 0.5rem;">
          <strong>Shift A:</strong> ${shift.startTime} – <span id="split-preview-mid">${midpoint}</span>
        </div>
        <div>
          <strong>Shift B:</strong> <span id="split-preview-mid2">${midpoint}</span> – ${shift.endTime}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button type="button" class="btn btn-ghost" id="cancel-split">Cancel</button>
        <button type="submit" class="btn btn-primary">Split</button>
      </div>
    </form>
  `);

  const splitInput = document.querySelector('#split-form input[name="splitTime"]');
  splitInput.addEventListener('input', () => {
    document.getElementById('split-preview-mid').textContent = splitInput.value;
    document.getElementById('split-preview-mid2').textContent = splitInput.value;
  });

  document.getElementById('cancel-split').addEventListener('click', closeModal);

  document.getElementById('split-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const splitTime = splitInput.value;

    const shiftA = {
      slotIndex: slotIndex,
      shiftType: shift.shiftType,
      startTime: shift.startTime,
      endTime: splitTime,
      hours: calculateHours(shift.startTime, splitTime),
      assignedWorker: shift.assignedWorker,
    };
    const shiftB = {
      slotIndex: slotIndex + 1,
      shiftType: shift.shiftType,
      startTime: splitTime,
      endTime: shift.endTime,
      hours: calculateHours(splitTime, shift.endTime),
      assignedWorker: null,
    };

    dp.shifts.splice(slotIndex, 1, shiftA, shiftB);
    dp.shifts.forEach((s, i) => s.slotIndex = i);

    saveRota(rota);
    closeModal();
    renderMonthlyRota(container);
  });
}

function calculateMidpoint(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  const midMins = Math.round((startMins + endMins) / 2) % (24 * 60);
  const midH = Math.floor(midMins / 60);
  const midM = midMins % 60;
  return `${String(midH).padStart(2, '0')}:${String(midM).padStart(2, '0')}`;
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
    .row-transition { background: #1a0a2e; }
    .row-unset { background: var(--bg); }
    .badge-transition { background: #7c3aed; color: white; }
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
