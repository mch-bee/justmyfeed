const MAX_SIDE = 400; // pixels: the image is scaled down so it does not weigh pages down

const $ = (id) => document.getElementById(id);
let savedTimer = null;

function flashSaved() {
  $('saved').textContent = 'Saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { $('saved').textContent = ''; }, 1500);
}

function renderImage(dataUrl) {
  const img = $('preview-img');
  img.hidden = !dataUrl;
  img.src = dataUrl || '';
  $('preview-empty').hidden = !!dataUrl;
  $('remove').hidden = !dataUrl;
}

chrome.storage.local.get({ coverImage: '' }, ({ coverImage }) => renderImage(coverImage));

// Scales the image down and stores it as PNG (keeps transparency).
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not recognised as an image.')); };
    img.src = url;
  });
}

$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  try {
    const dataUrl = await shrink(file);
    chrome.storage.local.set({ coverImage: dataUrl }, () => { renderImage(dataUrl); flashSaved(); });
  } catch (err) {
    $('saved').textContent = err.message;
  }
  $('file').value = '';
});

// Back to the plain black cover.
$('remove').addEventListener('click', () => {
  chrome.storage.local.set({ coverImage: '' }, () => { renderImage(''); flashSaved(); });
});
