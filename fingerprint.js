function getCanvasFingerprint() {
  const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 200;
const ctx = canvas.getContext('2d');

// Draw something that depends on the user's system
ctx.textBaseline = 'top';
ctx.font = '14px Arial';
ctx.fillStyle = '#f60';
ctx.fillRect(100, 1, 62, 20);
ctx.fillStyle = '#069';
ctx.fillText('fingerprint-test', 2, 15);

// Extract raw RGBA pixel data
return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}
function downsamplePixels(data, step = 100) {
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i] / 255); // normalize 0–1
  }
  return sampled;
}
 async function getFingerprint() {
  const canvasFP = getCanvasFingerprint();
  const downsampledCanvasFP = downsamplePixels(canvasFP, 100);
  return downsampledCanvasFP;
}
async function saveFingerprint() {
  const record = await getFingerprint();
  const json = JSON.stringify(record, null, 2);

  const blob = new Blob([json + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'record.jsonl';
  a.click();

  URL.revokeObjectURL(url);
}
saveFingerprint();
