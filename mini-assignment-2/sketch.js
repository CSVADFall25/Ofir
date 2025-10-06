// Complimentary/Color Picker — simplified & extended for assignment
// - MouseX -> Hue, MouseY -> Saturation
// - R cycles hue range: FULL, WARM, COOL
// - 1/2/3 switch grouping: Complementary / Triadic / Analogous
// Based on Rune Madsen's complementary example.

let innerRadius = 100;
let outerRadius = 200;
let steps = 360 / 15;

const RANGE_MODES = ["FULL", "WARM", "COOL"];
let rangeIdx = 0; // start FULL

let scheme = "complementary"; // 1=complementary, 2=triadic, 3=analogous

function setup() {
  createCanvas(800, 800);
  colorMode(HSB, 360, 100, 100);
  noStroke();
}

function draw() {
  background(100);
  drawRing();

  // Map mouse to hue (with range mode) and saturation
  const hueBase = hueFromMouse(mouseX);
  const satBase = constrain(map(mouseY, 0, height, 0, 100), 0, 100);

  // Determine scheme offsets
  let offsets;
  if (scheme === "complementary") offsets = [0, 180];
  else if (scheme === "triadic") offsets = [0, 120, 240];
  else offsets = [-30, 0, 30]; // analogous

  // Draw swatches row (top)
  const n = offsets.length;
  const swW = width / n;
  const swH = height / 4;
  for (let i = 0; i < n; i++) {
    const h = wrapHue(hueBase + offsets[i]);
    fill(h, satBase, 100);
    rect(i * swW, 0, swW, swH);
  }

  // Mark positions on the wheel for each offset
  for (let i = 0; i < n; i++) {
    drawColorPosition(wrapHue(hueBase + offsets[i]));
  }

  // Tiny help text
  fill(0);
  textSize(14);
  textAlign(CENTER);
  text(
    `X→Hue (Range: ${RANGE_MODES[rangeIdx]} with 'R'),  Y→Saturation  |  Scheme: [1]Complementary [2]Triadic [3]Analogous`,
    width / 2, height - 24
  );
}

/* ---------------- helpers ---------------- */

function hueFromMouse(mx) {
  const t = constrain(mx / width, 0, 1);
  if (RANGE_MODES[rangeIdx] === "FULL") return t * 360;

  if (RANGE_MODES[rangeIdx] === "WARM") {
    // warm: reds/oranges/yellows — map to -60..60 then wrap
    const h = -60 + 120 * t;
    return wrapHue(h);
  }
  // COOL: greens/cyans/blues — 120..240
  return 120 + 120 * t;
}

function wrapHue(h) {
  let x = h % 360;
  return x < 0 ? x + 360 : x;
}

function drawColorPosition(hue) {
  push();
  translate(width / 2, height / 2);
  const rMid = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cos(radians(hue)) * rMid;
  const y = sin(radians(hue)) * rMid;
  stroke(0);
  strokeWeight(3);
  fill(0, 0, 100);
  ellipse(x, y, 18, 18);
  pop();
}

function drawRing() {
  push();
  translate(width / 2, height / 2);
  for (let angle = 0; angle < 360; angle += steps) {
    let nextAngle = angle + steps;

    let x1 = cos(radians(angle)) * outerRadius;
    let y1 = sin(radians(angle)) * outerRadius;
    let x2 = cos(radians(nextAngle)) * outerRadius;
    let y2 = sin(radians(nextAngle)) * outerRadius;

    let x3 = cos(radians(nextAngle)) * innerRadius;
    let y3 = sin(radians(nextAngle)) * innerRadius;
    let x4 = cos(radians(angle)) * innerRadius;
    let y4 = sin(radians(angle)) * innerRadius;

    fill(angle, 100, 100);
    quad(x1, y1, x2, y2, x3, y3, x4, y4);
  }
  pop();
}

// keyboard: cycle range / switch scheme
function keyPressed() {
  if (key === 'r' || key === 'R') {
    rangeIdx = (rangeIdx + 1) % RANGE_MODES.length;
  } else if (key === '1') {
    scheme = "complementary";
  } else if (key === '2') {
    scheme = "triadic";
  } else if (key === '3') {
    scheme = "analogous";
  }
}
