// src/js/yearPlanner.js
import { getYearCalendar, setDayMode, getEffectiveMode } from './data.js';

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
        <span><span style="display:inline-block;width:12px;height:12px;background:#7c3aed;border-radius:3px;"></span> Transition</span>
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
      const effectiveMode = mode ? getEffectiveMode(dateStr) : null;
      let cls = 'yp-day';
      if (effectiveMode === 'transition-away' || effectiveMode === 'transition-home') { cls += ' transition'; awayDays++; }
      else if (mode === 'home') { cls += ' home'; homeDays++; }
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
    .yp-day.transition { background: #7c3aed; color: white; }
  `;
  document.head.appendChild(style);
}
