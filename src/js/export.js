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
    rows.push([]); // blank row between days
  }

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
