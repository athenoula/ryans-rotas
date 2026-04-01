// src/js/app.js
import { initData } from './data.js';
import { renderYearPlanner } from './yearPlanner.js';
import { renderMonthlyRota } from './monthlyRota.js';
import { renderHoursDashboard } from './hoursDashboard.js';
import { renderWorkers } from './workers.js';
import { renderSettings } from './export.js';

const screens = {
  yearPlanner: renderYearPlanner,
  monthlyRota: renderMonthlyRota,
  hours: renderHoursDashboard,
  workers: renderWorkers,
  settings: renderSettings,
};

let currentScreen = 'yearPlanner';

export function navigate(screenName) {
  currentScreen = screenName;

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.screen === screenName);
  });

  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.id === `screen-${screenName}`);
  });

  const renderFn = screens[screenName];
  if (renderFn) {
    const container = document.getElementById(`screen-${screenName}`);
    renderFn(container);
  }
}

export function showModal(contentHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay">
    <div class="modal">${contentHtml}</div>
  </div>`;
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function init() {
  initData();

  document.getElementById('nav').addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab');
    if (tab) navigate(tab.dataset.screen);
  });

  navigate('yearPlanner');
}

init();
