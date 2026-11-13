// The password check for switching off will be added here later.
const toggle = document.getElementById('enabled');
const status = document.getElementById('status');

function renderEnabled(on) {
  toggle.checked = on;
  status.textContent = on ? 'On' : 'Off';
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  renderEnabled(enabled !== false);
  document.body.dataset.ready = '1'; // tells the automated tests that settings have loaded
});

document.getElementById('options').addEventListener('click', () => chrome.runtime.openOptionsPage());

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: toggle.checked });
  renderEnabled(toggle.checked);
});
