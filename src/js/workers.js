// src/js/workers.js
import { getWorkers, addWorker, updateWorker, deactivateWorker } from './data.js';
import { showModal, closeModal } from './app.js';

export function renderWorkers(container) {
  const workers = getWorkers(true);
  const active = workers.filter(w => w.active);
  const inactive = workers.filter(w => !w.active);

  container.innerHTML = `
    <div class="header">
      <h1>Workers</h1>
      <button class="btn btn-primary" id="add-worker-btn">+ Add</button>
    </div>
    <div style="padding: 1rem;">
      ${active.map(w => workerCard(w)).join('')}
      ${inactive.length > 0 ? `
        <h3 style="color: var(--text-dim); margin: 1rem 0 0.5rem;">Inactive</h3>
        ${inactive.map(w => workerCard(w, true)).join('')}
      ` : ''}
    </div>
  `;

  container.querySelector('#add-worker-btn').addEventListener('click', () => openWorkerForm());
  container.querySelectorAll('.edit-worker').forEach(btn => {
    btn.addEventListener('click', () => openWorkerForm(btn.dataset.id));
  });
  container.querySelectorAll('.deactivate-worker').forEach(btn => {
    btn.addEventListener('click', () => {
      deactivateWorker(btn.dataset.id);
      renderWorkers(container);
    });
  });
  container.querySelectorAll('.reactivate-worker').forEach(btn => {
    btn.addEventListener('click', () => {
      updateWorker(btn.dataset.id, { active: true });
      renderWorkers(container);
    });
  });
}

function workerCard(worker, inactive = false) {
  const teamColors = { home: 'var(--blue)', away: 'var(--amber)', bank: 'var(--purple)', adhoc: 'var(--text-dim)' };
  const contractLabels = { maximum: 'Max', minimum: 'Min', 'away-linked': 'Away', bank: 'Bank', adhoc: 'Ad hoc' };

  return `
    <div class="card" style="${inactive ? 'opacity: 0.5;' : ''}">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${worker.name}</strong>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <span class="badge" style="background: ${teamColors[worker.team]}">${worker.team}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${contractLabels[worker.contractType]}${worker.monthlyHours ? ` · ${worker.monthlyHours}hrs/mo` : ''}</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-ghost edit-worker" data-id="${worker.id}">Edit</button>
          ${inactive
            ? `<button class="btn btn-ghost reactivate-worker" data-id="${worker.id}">Reactivate</button>`
            : `<button class="btn btn-ghost deactivate-worker" data-id="${worker.id}" style="color: var(--red);">Deactivate</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function openWorkerForm(editId = null) {
  const workers = getWorkers(true);
  const worker = editId ? workers.find(w => w.id === editId) : null;
  const isEdit = !!worker;

  const shiftTypeOptions = [
    { value: 'shortDay', label: 'Short Day' },
    { value: 'longDay', label: 'Long Day' },
    { value: 'wakingNight', label: 'Waking Night' },
    { value: 'dayShift', label: 'Day Shift (Away)' },
    { value: 'sleepNight', label: 'Sleep Night (Away)' },
  ];

  showModal(`
    <h2>${isEdit ? 'Edit' : 'Add'} Worker</h2>
    <form id="worker-form">
      <div class="form-group">
        <label>Name</label>
        <input type="text" name="name" value="${worker?.name || ''}" required>
      </div>
      <div class="form-group">
        <label>Team</label>
        <select name="team">
          <option value="home" ${worker?.team === 'home' ? 'selected' : ''}>Home</option>
          <option value="away" ${worker?.team === 'away' ? 'selected' : ''}>Away</option>
          <option value="bank" ${worker?.team === 'bank' ? 'selected' : ''}>Bank</option>
          <option value="adhoc" ${worker?.team === 'adhoc' ? 'selected' : ''}>Ad hoc</option>
        </select>
      </div>
      <div class="form-group">
        <label>Contract Type</label>
        <select name="contractType">
          <option value="maximum" ${worker?.contractType === 'maximum' ? 'selected' : ''}>Maximum (warn over)</option>
          <option value="minimum" ${worker?.contractType === 'minimum' ? 'selected' : ''}>Minimum (warn under)</option>
          <option value="away-linked" ${worker?.contractType === 'away-linked' ? 'selected' : ''}>Away-linked</option>
          <option value="bank" ${worker?.contractType === 'bank' ? 'selected' : ''}>Bank</option>
          <option value="adhoc" ${worker?.contractType === 'adhoc' ? 'selected' : ''}>Ad hoc</option>
        </select>
      </div>
      <div class="form-group">
        <label>Monthly Hours Target (leave blank if N/A)</label>
        <input type="number" name="monthlyHours" value="${worker?.monthlyHours || ''}">
      </div>
      <div class="form-group">
        <label>Allowed Shift Types</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem;">
          ${shiftTypeOptions.map(st => `
            <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text);">
              <input type="checkbox" name="shiftType" value="${st.value}"
                ${worker?.allowedShiftTypes?.includes(st.value) ? 'checked' : ''}>
              ${st.label}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Working Days</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem;">
          ${[['0','Sun'],['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat']].map(([val, label]) => `
            <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text);">
              <input type="checkbox" name="workingDay" value="${val}"
                ${(worker?.workingDays || [0,1,2,3,4,5,6]).includes(Number(val)) ? 'checked' : ''}>
              ${label}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
        <button type="button" class="btn btn-ghost" id="cancel-worker">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-worker').addEventListener('click', closeModal);
  document.getElementById('worker-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const shiftTypes = Array.from(form.querySelectorAll('input[name="shiftType"]:checked')).map(cb => cb.value);
    const workingDays = Array.from(form.querySelectorAll('input[name="workingDay"]:checked')).map(cb => Number(cb.value));
    const workerData = {
      name: form.name.value.trim(),
      team: form.team.value,
      contractType: form.contractType.value,
      monthlyHours: form.monthlyHours.value ? Number(form.monthlyHours.value) : null,
      allowedShiftTypes: shiftTypes,
      workingDays: workingDays.length > 0 ? workingDays : [0,1,2,3,4,5,6],
      active: true,
    };

    if (isEdit) {
      updateWorker(editId, workerData);
    } else {
      addWorker(workerData);
    }

    closeModal();
    const container = document.getElementById('screen-workers');
    renderWorkers(container);
  });
}
