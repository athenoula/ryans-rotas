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

    document.querySelectorAll('.pp-day[data-type="blocked"]').forEach(el => {
      el.addEventListener('click', () => {
        const day = Number(el.dataset.day);
        const current = getAvailability(selectedWorker, monthStr);
        const idx = current.blockedShifts.findIndex(b => b.day === day);
        if (idx >= 0) {
          current.blockedShifts.splice(idx, 1);
        } else {
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
