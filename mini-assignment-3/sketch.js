let img;
let cols = 3, rows = 3;
let cellSelectedImg = null;

let x = 0, y = 0, w = 0, h = 0;

let input;

const MARGIN = 16;
const PANEL_MIN_W = 240;
const PANEL_MAX_W = 800;
const ZOOM = 3;

function ensureCanvasWidth(requiredW, requiredH) {
  if (requiredW > width || requiredH > height) {
    resizeCanvas(Math.max(requiredW, width), Math.max(requiredH, height));
  }
}

function setup() {
  createCanvas(1000, 600);
  colorMode(HSB);
  textAlign(CENTER, CENTER);
  textSize(14);

  createP("Upload an image:");
  input = createFileInput(handleFile).style('margin-bottom', '10px');
}

function draw() {
  background(0, 0, 95);

  if (img) {
    image(img, x, y, w, h);
    drawGrid();
  } else {
    fill(0);
    text("Upload an image to begin", width * 0.35, height / 2);
  }

  drawPreviewPanel();
}

function handleFile(file) {
  if (file.type === 'image') {
    img = loadImage(file.data, () => {
      const leftWidth = width - 260;
      const leftHeight = height;
      const s = Math.min((width - PANEL_MIN_W - MARGIN * 3) / img.width, leftHeight / img.height);
      w = img.width * s;
      h = img.height * s;
      x = MARGIN;                       // left margin
      y = (leftHeight - h) / 2;         // vertical center
      cellSelectedImg = null;
    });
  } else {
    img = null;
    cellSelectedImg = null;
  }
}

function drawGrid() {
  const cellW = w / cols;
  const cellH = h / rows;

  stroke(0);
  strokeWeight(2);
  noFill();
  rect(x, y, w, h);
  for (let i = 1; i < cols; i++) line(x + i * cellW, y, x + i * cellW, y + h);
  for (let j = 1; j < rows; j++) line(x, y + j * cellH, x + w, y + j * cellH);

  //hover highlight
  const hover = hoverCell();
  if (hover) {
    const { i, j } = hover;
    noFill();
    stroke(210, 80, 80);
    strokeWeight(3);
    rect(x + i * cellW, y + j * cellH, cellW, cellH);
  }
}

function hoverCell() {
  if (!img) return null;
  if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) return null;
  const cellW = w / cols;
  const cellH = h / rows;
  const i = floor((mouseX - x) / cellW);
  const j = floor((mouseY - y) / cellH);
  return { i, j };
}

function mousePressed() {
  if (!img) return;
  if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) return;

  const cellW = w / cols;
  const cellH = h / rows;
  const i = floor((mouseX - x) / cellW);
  const j = floor((mouseY - y) / cellH);

  //convert to og coords
  const srcX = (i * cellW) / w * img.width;
  const srcY = (j * cellH) / h * img.height;
  const srcW = cellW / w * img.width;
  const srcH = cellH / h * img.height;

  cellSelectedImg = img.get(round(srcX), round(srcY), round(srcW), round(srcH));
}

function drawPreviewPanel() {
  //get zoomed out size
  let zoomDrawW = 0, zoomDrawH = 0;
  if (cellSelectedImg) {
    zoomDrawW = cellSelectedImg.width * ZOOM;
    zoomDrawH = cellSelectedImg.height * ZOOM;
  }

  // panel width fits zoomed image (with padding), clamped
  const pad = 16;
  let panelW = Math.max(PANEL_MIN_W, Math.min(zoomDrawW + pad * 2, PANEL_MAX_W));

  // panel geometry
  const panelX = x + w + MARGIN;
  const panelY = 10;
  const panelH = height - 20;

  // grow canvas if needed
  const requiredCanvasW = panelX + panelW + MARGIN;
  ensureCanvasWidth(requiredCanvasW, height);

  // panel UI
  noStroke();
  fill(240);
  rect(panelX, panelY, panelW, panelH, 10);
  stroke(0);
  noFill();
  rect(panelX, panelY, panelW, panelH, 10);

  noStroke();
  fill(0);
  textSize(16);
  text("Selected Cell", panelX + panelW / 2, panelY + 18);

  //draw the zoomed image
  const availW = panelW - pad * 2;
  const availH = panelH - pad * 2 - 24; // minus title
  const imgY = panelY + 24 + pad;

  if (cellSelectedImg) {
    let scale = 1;
    if (zoomDrawH > availH) {
      scale = availH / zoomDrawH;
    }
    const drawW = zoomDrawW * scale;
    const drawH = zoomDrawH * scale;
    const drawX = panelX + (panelW - drawW) / 2;

    image(cellSelectedImg, drawX, imgY, drawW, drawH);

    fill(0);
    textSize(12);
    text(`${Math.round(drawW)}x${Math.round(drawH)} px  (${ZOOM.toFixed(1)}×)`,
         panelX + panelW / 2, imgY + drawH + 12);
  } else {
    fill(50);
    textSize(13);
    text("Click a grid cell to preview it here", panelX + panelW / 2, imgY + availH / 2);
  }
}
