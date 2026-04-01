import { PRELOAD_CALENDARS, PRELOAD_ROTAS } from './preloadData.js';

const STORAGE_KEY = 'ryansRotas';

const DEFAULT_WORKERS = [
  { id: 'w1', name: 'Karen Hughes', team: 'home', contractType: 'maximum', monthlyHours: 150, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w2', name: 'Alayo Obafemi', team: 'home', contractType: 'maximum', monthlyHours: 150, allowedShiftTypes: ['shortDay', 'longDay', 'wakingNight'], active: true },
  { id: 'w3', name: 'Andrew Cockbill', team: 'away', contractType: 'away-linked', monthlyHours: null, allowedShiftTypes: ['dayShift', 'sleepNight'], active: true },
  { id: 'w4', name: 'Kapil Kumar Kumar', team: 'away', contractType: 'minimum', monthlyHours: 150, allowedShiftTypes: ['dayShift', 'sleepNight'], active: true },
  { id: 'w5', name: 'Karen Cockbill', team: 'bank', contractType: 'bank', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w6', name: 'Ankita', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay', 'wakingNight'], active: true },
  { id: 'w7', name: 'Adekemi', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['wakingNight'], active: true },
  { id: 'w8', name: 'Paige', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
  { id: 'w9', name: 'Imogen Parkinson', team: 'adhoc', contractType: 'adhoc', monthlyHours: null, allowedShiftTypes: ['shortDay', 'longDay'], active: true },
];

let data = null;

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    data = JSON.parse(raw);
  } else {
    data = {
      workers: structuredClone(DEFAULT_WORKERS),
      calendars: structuredClone(PRELOAD_CALENDARS),
      rotas: structuredClone(PRELOAD_ROTAS),
      availability: {}
    };
    save();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function initData() {
  load();
  if (!data.workers || data.workers.length === 0) {
    data.workers = structuredClone(DEFAULT_WORKERS);
    save();
  }
}

export function getWorkers(includeInactive = false) {
  return includeInactive ? [...data.workers] : data.workers.filter(w => w.active);
}

export function getWorkerById(id) {
  return data.workers.find(w => w.id === id) || null;
}

export function addWorker(worker) {
  const id = 'w' + Date.now() + Math.random().toString(36).slice(2, 6);
  data.workers.push({ ...worker, id });
  save();
  return id;
}

export function updateWorker(id, updates) {
  const idx = data.workers.findIndex(w => w.id === id);
  if (idx === -1) return;
  data.workers[idx] = { ...data.workers[idx], ...updates };
  save();
}

export function deactivateWorker(id) {
  updateWorker(id, { active: false });
}

export function getYearCalendar(year) {
  return data.calendars[year] || { year, days: {} };
}

export function setDayMode(year, dateStr, mode) {
  if (!data.calendars[year]) {
    data.calendars[year] = { year, days: {} };
  }
  if (mode === null) {
    delete data.calendars[year].days[dateStr];
  } else {
    data.calendars[year].days[dateStr] = mode;
  }
  save();
}

export function getRota(month) {
  return data.rotas[month] || null;
}

export function saveRota(rota) {
  data.rotas[rota.month] = rota;
  save();
}

export function getAvailability(workerId, month) {
  const key = `${workerId}_${month}`;
  return data.availability[key] || { workerId, month, annualLeaveDays: [], preferredShifts: [], blockedShifts: [] };
}

export function saveAvailability(avail) {
  const key = `${avail.workerId}_${avail.month}`;
  data.availability[key] = avail;
  save();
}

export function exportAllData() {
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr) {
  data = JSON.parse(jsonStr);
  save();
}
