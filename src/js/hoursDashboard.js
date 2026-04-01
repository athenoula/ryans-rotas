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
