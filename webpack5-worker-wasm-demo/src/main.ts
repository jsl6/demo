'use strict';
import './index.less';

function query(className) {
  return (
    document.querySelector(className) ||
    document.createElement(`<div class=${className}></div>`)
  );
}

function showSpinner(msg) {
  query('.spin-wrap').classList.remove('hide');
  query('.spin-message').innerHTML = msg || 'loading...';
}

function hideSpinner() {
  query('.spin-wrap').classList.add('hide');
  document.querySelector('body')?.classList.remove('loading');
}

function showSpinnerBtn() {
  query('.btn').classList.add('loading');
}

function hideSpinnerBtn() {
  query('.btn').classList.remove('loading');
}

function handleDragover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy'; // 复制
}

function handleDropFile(canvasId, e) {
  e.stopPropagation();
  e.preventDefault();
  const files = e.dataTransfer.files; // FileList object.
  const file = files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function () {
    loadImage(reader.result, canvasId);
  };
}

function getInput(canvasId: string) {
  const canvas = query('.' + canvasId);
  const ctx = canvas.getContext('2d');
  const { width, height, data } = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );
  return { width, height, data };
}

function loadImage(path, canvasId: string) {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = query('.' + canvasId);
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.src = path;
  });
}

function showImage({ channels, data, width, height }, canvasId: string) {
  const canvas = query('.' + canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = width;
  canvas.height = height;
  const imgData = ctx.createImageData(width, height);
  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    imgData.data[j] = data[i];
    imgData.data[j + 1] = data[i + (1 % channels)];
    imgData.data[j + 2] = data[i + (2 % channels)];
    imgData.data[j + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

function renderRects(rects, canvasId: string, style, width = 1) {
  const canvas = query('.' + canvasId);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  rects.forEach((r) => {
    //r.type = canvasId;
    query('.info').append(JSON.stringify(r));
    console.log('diff',canvasId, 'x =', r.x, 'y =', r.y, 'width =',r.width, 'height =', r.height);
    ctx.strokeRect(r.x, r.y, r.width, r.height);
  });
  
}

function renderResult(result, canvasId1: string, canvasId2: string) {
  renderRects(
    result.matches.map((m) => m[0].bounding),
    canvasId1,
    'rgb(0, 255, 255)',
    2
  );
  renderRects(
    result.matches.map((m) => m[1].bounding),
    canvasId2,
    'rgb(0, 255, 255)',
    2
  );
  result.matches.forEach((m) => {
    renderRects(m[0].diffMarkers, canvasId1, 'rgb(255, 0, 0)', 3);
    renderRects(m[1].diffMarkers, canvasId2, 'rgb(255, 0, 0)', 3);
  });
  renderRects(result.strayingRects[0], canvasId1, 'rgb(255, 0, 255)', 3);
  renderRects(result.strayingRects[1], canvasId2, 'rgb(255, 0, 255)', 3);
}

function startCalc(worker) {
  query('.info').innerHTML = '';
  const img1 = getInput('img1');
  const img2 = getInput('img2');
  worker.postMessage({ type: 'req_match', img1, img2 }, [
    img1.data.buffer,
    img2.data.buffer,
  ]);
}

async function main() {
  const worker = new Worker('worker.js');
  await Promise.all([
    loadImage('img/img3.png', 'img1'),
    loadImage('img/img4.png', 'img2'),
  ]);
  worker.addEventListener('message', (ev) => {
    const meta = ev.data;
    switch (meta.type) {
      case 'init':
        // hideSpinner();
        break;
      case 'res_match':
        hideSpinnerBtn();
        renderResult(ev.data.result, 'img1', 'img2');
      default:
    }
  });

  query('.btn').addEventListener('click', () => {
    showSpinnerBtn();
    startCalc(worker);
  });

  for (let node of document.querySelectorAll('.input > canvas')) {
    const canvasId = node.className;
    node.addEventListener('dragover', handleDragover);
    node.addEventListener('drop', handleDropFile.bind(null, canvasId));
  }
}
main();