// src/js/export.js
import { getRota, getWorkers, getWorkerById, exportAllData, importAllData } from './data.js';

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

// Build worker hours directly from rota shift data
function buildWorkerHoursFromRota(rota, monthStr) {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const daysInMonth = new Date(Number(yearStr), Number(monthNumStr), 0).getDate();
  const weeksInMonth = daysInMonth / 7;

  const shiftLabels = {
    shortDay: 'Short Day', longDay: 'Long Day', wakingNight: 'Waking Night',
    dayShift: 'Day Shift', sleepNight: 'Sleep Night',
  };

  // Collect hours from every assigned shift in the rota
  const workerMap = {};
  for (const day of rota.days) {
    const dayNum = Number(day.date.split('-')[2]);
    const suffix = getOrdinalSuffix(dayNum);
    const dow = new Date(Number(yearStr), Number(monthNumStr) - 1, dayNum).toLocaleString('en-GB', { weekday: 'short' });
    for (const shift of day.shifts) {
      if (!shift.assignedWorker) continue;
      if (!workerMap[shift.assignedWorker]) {
        const w = getWorkerById(shift.assignedWorker);
        workerMap[shift.assignedWorker] = {
          id: shift.assignedWorker,
          name: w ? w.name : shift.assignedWorker,
          monthlyHours: w?.monthlyHours || null,
          team: w?.team || '?',
          totalHours: 0,
          shiftCount: 0,
          shifts: [],
        };
      }
      const entry = workerMap[shift.assignedWorker];
      entry.totalHours += shift.hours;
      entry.shiftCount++;
      entry.shifts.push({
        dateLabel: `${dow} ${dayNum}${suffix}`,
        timeLabel: `${shift.startTime}-${shift.endTime}`,
        hours: shift.hours,
        typeLabel: shiftLabels[shift.shiftType] || shift.shiftType,
      });
    }
  }

  // Also include active workers with 0 shifts
  for (const w of getWorkers()) {
    if (!workerMap[w.id]) {
      workerMap[w.id] = {
        id: w.id,
        name: w.name,
        monthlyHours: w.monthlyHours,
        team: w.team,
        totalHours: 0,
        shiftCount: 0,
        shifts: [],
      };
    }
  }

  // Add weekly averages
  for (const entry of Object.values(workerMap)) {
    entry.weeklyAvg = weeksInMonth > 0 ? Math.round((entry.totalHours / weeksInMonth) * 100) / 100 : 0;
  }

  return Object.values(workerMap);
}

function generateExcel(monthStr) {
  const rota = getRota(monthStr);
  if (!rota || !rota.days.length) { alert('No rota data for this month.'); return; }

  const [yearStr, monthNumStr] = monthStr.split('-');
  const monthName = new Date(Number(yearStr), Number(monthNumStr) - 1, 1).toLocaleString('en-GB', { month: 'long' });

  const shiftLabels = {
    shortDay: 'Short Day', longDay: 'Long Day', wakingNight: 'Waking Night',
    dayShift: 'Day Shift', sleepNight: 'Sleep Night',
  };

  const rows = [['Date', 'Shift', 'Hours', 'Service Type', 'Name']];

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

  // Summary built from actual rota data
  const workerHours = buildWorkerHoursFromRota(rota, monthStr);

  rows.push([]);
  rows.push(['Worker', 'Total Hours', 'Shifts', 'Weekly Avg']);
  for (const h of workerHours) {
    rows.push([h.name, h.totalHours, h.shiftCount, h.weeklyAvg]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 14 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Rota');

  // Per-worker sheets
  for (const wh of workerHours) {
    const workerRows = [
      [`${wh.name} — ${monthName} ${yearStr}`],
      [],
      ['Date', 'Shift', 'Hours', 'Service Type'],
    ];

    if (wh.shifts.length === 0) {
      workerRows.push(['No shifts assigned this month']);
    } else {
      for (const s of wh.shifts) {
        workerRows.push([s.dateLabel, s.timeLabel, s.hours, s.typeLabel]);
      }
    }

    workerRows.push([]);
    workerRows.push(['Total Hours', wh.totalHours]);
    workerRows.push(['Total Shifts', wh.shiftCount]);
    if (wh.monthlyHours) {
      workerRows.push(['Contracted Hours', wh.monthlyHours]);
      workerRows.push(['Remaining', wh.monthlyHours - wh.totalHours]);
    }

    const workerWs = XLSX.utils.aoa_to_sheet(workerRows);
    workerWs['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
    const sheetName = wh.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, workerWs, sheetName);
  }

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

  // Summary built from actual rota data
  const workerHours = buildWorkerHoursFromRota(rota, monthStr);

  const summaryY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Summary', 14, summaryY);

  const summaryRows = workerHours.map(h => [h.name, h.totalHours, h.shiftCount, h.weeklyAvg]);

  doc.autoTable({
    startY: summaryY + 5,
    head: [['Worker', 'Total Hours', 'Shifts', 'Weekly Avg']],
    body: summaryRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    theme: 'grid',
  });

  // Per-worker pages
  for (const wh of workerHours) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`${wh.name} — ${monthName} ${yearStr}`, 14, 20);

    if (wh.shifts.length === 0) {
      doc.setFontSize(10);
      doc.text('No shifts assigned this month', 14, 35);
    } else {
      doc.autoTable({
        startY: 30,
        head: [['Date', 'Shift', 'Hours', 'Type']],
        body: wh.shifts.map(s => [s.dateLabel, s.timeLabel, s.hours, s.typeLabel]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59] },
        theme: 'grid',
      });
    }

    const y = wh.shifts.length > 0 ? doc.lastAutoTable.finalY + 10 : 45;
    doc.setFontSize(11);
    doc.text(`Total Hours: ${wh.totalHours}`, 14, y);
    doc.text(`Total Shifts: ${wh.shiftCount}`, 14, y + 7);
    if (wh.monthlyHours) {
      doc.text(`Contracted: ${wh.monthlyHours} hrs  |  Remaining: ${wh.monthlyHours - wh.totalHours}`, 14, y + 14);
    }
  }

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
