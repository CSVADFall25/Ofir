let innerRadius = 100;
let outerRadius = 200;
let steps = 360 / 15;

let satVal = 80;   // controlled by LEFT/RIGHT
let briVal = 100;  // controlled by UP/DOWN

// Range modes for hue
const RANGE_MODES = ["FULL", "WARM", "COOL"];
let rangeIdx = 0; // start FULL

// Schemes
const SCHEMES = {
  complementary: [0, 180],
  triadic: [0, 120, 240],
  analogous: [-30, 0, 30]
};
let scheme = "complementary";

// Utility: wrap hue to [0,360)
function wrapHue(h) {
  let x = h % 360;
  return x < 0 ? x + 360 : x;
}

// Map mouseX to hue within current range mode
function hueFromMouse(mx) {
  const t = constrain(mx / width, 0, 1);

  if (RANGE_MODES[rangeIdx] === "FULL") {
    return t * 360;
  }

  if (RANGE_MODES[rangeIdx] === "WARM") {
    const h = -60 + 120 * t;
    return wrapHue(h);
  }

  return 120 + 120 * t; // 120..240
}

function setup() {
  createCanvas(1400, 800);
  colorMode(HSB, 360, 100, 100);
  noStroke();
  textFont("sans-serif");
}

function draw() {
  background(96); // neutral gray

  push();
  drawHSBRing(width / 4, height / 2 + 50);
  pop();

  let baseHue = hueFromMouse(mouseX);

  drawSchemeSwatches(baseHue);

  drawColorPosition(baseHue);

  drawHUD(baseHue);
}

function drawHUD(baseHue) {
  push();
  fill(0);
  rect(0, height - 110, width, 110);
  fill(255);
  textSize(16);
  textAlign(CENTER, TOP);

  const rangeLabel = RANGE_MODES[rangeIdx];
  const schemeLabel =
    scheme === "complementary" ? "Complementary (1)" :
    scheme === "triadic" ? "Triadic (2)" : "Analogous (3)";

  text(
    `Mouse X: Hue within ${rangeLabel} | Arrow Keys: ←/→ Saturation (${satVal})  ↑/↓ Brightness (${briVal})  |  Scheme: ${schemeLabel}  |  R: Cycle Range`,
    width / 2, height - 90
  );
  text(
    `Base HSB → H: ${round(baseHue)}  S: ${round(satVal)}  B: ${round(briVal)}`,
    width / 2, height - 65
  );
  text(
    `Tip: Try RANGE (R) = WARM or COOL, then press 2 (Triadic) or 3 (Analogous) and slide mouse X.`,
    width / 2, height - 40
  );
  pop();
}

function drawSchemeSwatches(baseHue) {
  const offsets = SCHEMES[scheme];
  const cols = offsets.length;
  const pad = 20;
  const swW = (width - pad * (cols + 1)) / cols;
  const swH = height / 4 - pad * 2;

  push();
  // Title
  fill(0);
  textSize(22);
  textAlign(LEFT, TOP);
  text("MiniAssignment2 — Interactive HSB Picker (Range + Scheme + Grouping)", pad, pad);

  // Swatches row
  for (let i = 0; i < cols; i++) {
    const x = pad + i * (swW + pad);
    const y = 60;

    const h = wrapHue(baseHue + offsets[i]);
    fill(h, satVal, briVal);
    rect(x, y, swW, swH, 8);

    // Label
    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    const label =
      i === 0 && offsets[i] === 0 ? "Base" :
      scheme === "complementary" ? (i === 0 ? "Base" : "Comp +180") :
      scheme === "triadic" ? (i === 0 ? "Base" : (i === 1 ? "+120" : "+240")) :
      scheme === "analogous" ? (i === 0 ? "-30" : (i === 1 ? "Base" : "+30")) : "";

    text(`${label}\nH:${round(h)} S:${round(satVal)} B:${round(briVal)}`, x + 10, y + 10);
  }
  pop();
}

function drawColorPosition(hue) {
  push();
  translate(width / 4, height / 2 + 50);
  const rMid = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cos(radians(hue)) * rMid;
  const y = sin(radians(hue)) * rMid;

  stroke(0);
  strokeWeight(3);
  fill(0, 0, 100);
  ellipse(x, y, 22, 22);
  pop();
}

function drawHSBRing(cx, cy) {
  push();
  colorMode(HSB, 360, 100, 100);
  translate(cx, cy);

  // Title
  push();
  fill(0);
  textSize(20);
  textAlign(CENTER, BOTTOM);
  text("HSB Color Wheel", 0, -outerRadius - 20);
  pop();

  for (let angle = 0; angle < 360; angle += steps) {
    let nextAngle = angle + steps;

    // Outer edge points
    let x1 = cos(radians(angle)) * outerRadius;
    let y1 = sin(radians(angle)) * outerRadius;
    let x2 = cos(radians(nextAngle)) * outerRadius;
    let y2 = sin(radians(nextAngle)) * outerRadius;

    // Inner edge points
    let x3 = cos(radians(nextAngle)) * innerRadius;
    let y3 = sin(radians(nextAngle)) * innerRadius;
    let x4 = cos(radians(angle)) * innerRadius;
    let y4 = sin(radians(angle)) * innerRadius;

    fill(angle, 100, 100);
    quad(x1, y1, x2, y2, x3, y3, x4, y4);
  }
  pop();
}

// Keyboard controls
function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    satVal = max(0, satVal - 2);
  } else if (keyCode === RIGHT_ARROW) {
    satVal = min(100, satVal + 2);
  } else if (keyCode === UP_ARROW) {
    briVal = min(100, briVal + 2);
  } else if (keyCode === DOWN_ARROW) {
    briVal = max(0, briVal - 2);
  } else if (key === '1') {
    scheme = "complementary";
  } else if (key === '2') {
    scheme = "triadic";
  } else if (key === '3') {
    scheme = "analogous";
  } else if (key === 'r' || key === 'R') {
    rangeIdx = (rangeIdx + 1) % RANGE_MODES.length;
  }
}
