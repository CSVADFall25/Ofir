// ———————————————————————————————————————————
// Sketch config
// ———————————————————————————————————————————
const W = 980,
  H = 780;

const pond = { cx: 500, cy: 440, rx: 320, ry: 165 };
const hook = { x: 510, y: 400 };
const bucket = { x: pond.cx - 6, y: pond.cy - 120 };

const PALETTE = [
  "#111827",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#f5e0c8",
];
const UI = { swatchR: 18, swatchPad: 42, panelX: W - 60, panelY: 120 };

const ERASER_SIZE = 18;
const STROKE_W = 3;

const EMOJI_TARGETS = [
  { ch: "🐟", name: "fish" },
  { ch: "⭐", name: "star" },
  { ch: "❤️", name: "heart" },
  { ch: "☂️", name: "umbrella" },
  { ch: "🌙", name: "moon" },
  { ch: "🍎", name: "apple" },
  { ch: "🐱", name: "cat face" },
  { ch: "😀", name: "smiley" },
];

// ———————————————————————————————————————————
// State
// ———————————————————————————————————————————
let ink; // offscreen ink layer
let subs = []; // raster submission anims
let currentStroke = [];
let erasing = false;
let colorNow = PALETTE[2];
let doneButton;
let rimGlow = 0; // 0..1 animation state
let rimGlowSpeed = 0; // how fast it fades out
let gameEnabled = true;
let toggleGameBtn, saveBtn;
let savingFrame = false; // true while saving, to skip UI

let faceState = "neutral"; // neutral | happy | sad
let faceTimer = 0;

let target = null; // {ch, name}
let targetMask; // p5.Graphics binary alpha
const TARGET_SIZE = 160;

// ———————————————————————————————————————————
// Small helpers
// ———————————————————————————————————————————
const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function insidePond(x, y) {
  const dx = (x - pond.cx) / pond.rx;
  const dy = (y - pond.cy) / pond.ry;
  return dx * dx + dy * dy <= 1;
}
function lipYAtX(x) {
  const dx = (x - pond.cx) / pond.rx;
  const k = constrain(1 - dx * dx, 0, 1);
  return pond.cy - pond.ry * Math.sqrt(k);
}
function topAngleForX(x) {
  const c = clamp((x - pond.cx) / pond.rx, -1, 1);
  return TWO_PI - Math.acos(c);
}

// ———————————————————————————————————————————
// Lifecycle
// ———————————————————————————————————————————
function setup() {
  createCanvas(W, H);
  pixelDensity(1);
  ink = createGraphics(W, H);
  ink.pixelDensity(1);
  ink.strokeJoin(ROUND);
  ink.strokeCap(ROUND);
  ink.noFill();
  ink.clear();

  makeDoneButton();
  makeGameAndSaveButtons();
  updateUIForGameMode();
  pickNewTarget();
}

function draw() {
  background("#fafafa");

  drawBowlAndWater();
  // Draw pond glow feedback if active
  if (rimGlow > 0) {
    const alpha = map(rimGlow, 0, 1, 0, 150);
    noFill();
    stroke(0, 180, 255, alpha);
    strokeWeight(10);
    ellipse(pond.cx, pond.cy, pond.rx * 2 + 10, pond.ry * 2 + 10);
    rimGlow = max(0, rimGlow - rimGlowSpeed);
  }

  image(ink, 0, 0); // persistent strokes
  drawSubmissions(); // animated crops
  drawShelfAndObjects();
  if (!savingFrame) drawUI();
}

// ———————————————————————————————————————————
function makeDoneButton() {
  if (doneButton) return;
  doneButton = createButton("Done");
  doneButton.position(W - 100, H - 60);
  Object.assign(doneButton.elt.style, {
    padding: "8px 18px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  });
  doneButton.hide();
  doneButton.mousePressed(submitDrawing);
}

// ———————————————————————————————————————————
// Game toggle & save
// ———————————————————————————————————————————
function toggleGame() {
  gameEnabled = !gameEnabled;
  toggleGameBtn.html(gameEnabled ? "Game: On" : "Game: Off");

  if (gameEnabled) {
    // re-enable the “Done” flow and targets
    doneButton.show();
    pickNewTarget();
    faceState = "neutral";
  } else {
    // turn off game-y bits
    doneButton.hide();
    subs = []; // clear any running animations
    faceState = "neutral";
  }
  updateUIForGameMode();
}
function saveImage() {
  // Temporarily hide UI elements
  toggleGameBtn.hide();
  saveBtn.hide();
  doneButton.hide();
  if (toggleGameBtn) toggleGameBtn.hide();
  if (saveBtn) saveBtn.hide();
  if (doneButton) doneButton.hide();

  // Flag to skip drawing the palette + eraser icons
  savingFrame = true;

  redraw(); // draw one clean frame without UI
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  saveCanvas(`pond-drawing-${ts}`, "png");

  // Restore
  savingFrame = false;
  toggleGameBtn.show();
  saveBtn.show();
  if (gameEnabled) doneButton.show();
}

function makeGameAndSaveButtons() {
  // Game toggle
  toggleGameBtn = createButton(gameEnabled ? "Game: On" : "Game: Off");
  toggleGameBtn.position(W - 210, H - 60);
  Object.assign(toggleGameBtn.elt.style, {
    padding: "8px 12px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "8px",
  });
  toggleGameBtn.mousePressed(toggleGame);

  // Save image
  saveBtn = createButton("Save Image");
  saveBtn.position(W - 320, H - 60);
  Object.assign(saveBtn.elt.style, {
    padding: "8px 12px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    backgroundColor: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  });
  saveBtn.mousePressed(saveImage);
}
function updateUIForGameMode() {
  if (gameEnabled) {
    // Game ON: show Done, hide Save
    if (doneButton) doneButton.show();
    if (saveBtn) saveBtn.hide();
    if (toggleGameBtn) toggleGameBtn.html("Game: On");
  } else {
    // Game OFF: hide Done, show Save
    if (doneButton) doneButton.hide();
    if (saveBtn) saveBtn.show();
    if (toggleGameBtn) toggleGameBtn.html("Game: Off");
  }
}

// ———————————————————————————————————————————
// Target mask (binary alpha of emoji)
// ———————————————————————————————————————————
function pickNewTarget() {
  target = random(EMOJI_TARGETS);

  targetMask = createGraphics(TARGET_SIZE, TARGET_SIZE);
  targetMask.pixelDensity(1);
  targetMask.clear();
  targetMask.textAlign(CENTER, CENTER);
  targetMask.textSize(TARGET_SIZE * 0.8);
  targetMask.text(target.ch, TARGET_SIZE / 2, TARGET_SIZE / 2);

  // binarize alpha
  targetMask.loadPixels();
  for (let i = 0; i < TARGET_SIZE * TARGET_SIZE; i++) {
    const a = targetMask.pixels[i * 4 + 3];
    const v = a > 0 ? 255 : 0;
    targetMask.pixels[i * 4 + 0] = v;
    targetMask.pixels[i * 4 + 1] = v;
    targetMask.pixels[i * 4 + 2] = v;
    targetMask.pixels[i * 4 + 3] = v;
  }
  targetMask.updatePixels();
}

// ———————————————————————————————————————————
// Scene
// ———————————————————————————————————————————
function drawBowlAndWater() {
  const dark = "#3a3a3a";
  noStroke();
  fill(0, 0, 0, 20);
  ellipse(pond.cx + 20, pond.cy + pond.ry + 36, pond.rx * 1.6, 30);

  const outerRx = pond.rx + 60,
    outerRy = pond.ry + 70;
  fill("#cfeec8");
  ellipse(pond.cx, pond.cy + 10, outerRx * 2, outerRy * 2);

  stroke(dark);
  strokeWeight(3);
  noFill();
  ellipse(pond.cx, pond.cy, pond.rx * 2 + 14, pond.ry * 2 + 14);

  fill("#eaf5ff");
  stroke(dark);
  strokeWeight(3);
  ellipse(pond.cx, pond.cy, pond.rx * 2, pond.ry * 2);

  // small lily
  const L = { x: pond.cx + 190, y: pond.cy + 40 };
  noStroke();
  fill("#b6f2b2");
  ellipse(L.x, L.y, 46, 24);
  triangle(L.x + 2, L.y, L.x + 20, L.y + 2, L.x + 6, L.y + 12);
  fill("#7ed957");
  ellipse(L.x - 18, L.y - 10, 24, 16);
  ellipse(L.x - 10, L.y - 16, 10, 8);
  fill("#3a3a3a");
  circle(L.x - 13, L.y - 18, 3);
  circle(L.x - 7, L.y - 18, 3);
  noFill();
  stroke("#3a3a3a");
  strokeWeight(1.5);
  arc(L.x - 11, L.y - 12, 10, 6, 0, PI);
}

function coverTopEllipsesBand(leftX, rightX) {
  const green = "#c8f3c8",
    padX = 28,
    band = 10,
    steps = 72;
  const aL = topAngleForX(leftX - padX),
    aR = topAngleForX(rightX + padX);
  const rxO = pond.rx + band,
    ryO = pond.ry + band;
  const rxI = pond.rx - band,
    ryI = pond.ry - band;

  push();
  noStroke();
  fill(green);
  beginShape();
  for (let i = 0; i <= steps; i++) {
    const a = lerp(aL, aR, i / steps);
    vertex(pond.cx + rxO * cos(a), pond.cy + ryO * sin(a));
  }
  for (let i = steps; i >= 0; i--) {
    const a = lerp(aL, aR, i / steps);
    vertex(pond.cx + rxI * cos(a), pond.cy + ryI * sin(a));
  }
  endShape(CLOSE);
  pop();
}

function drawShelfAndObjects() {
  const dark = "#3a3a3a",
    green = "#c8f3c8";
  const leftX = pond.cx - 170,
    rightX = pond.cx + 170;
  const shelfY = Math.min(lipYAtX(leftX) - 10, lipYAtX(rightX) - 10);

  coverTopEllipsesBand(leftX, rightX);

  // mask water behind shelf
  (function () {
    const pad = 24,
      aL = topAngleForX(leftX - pad),
      aR = topAngleForX(rightX + pad),
      steps = 64;
    push();
    noStroke();
    fill(green);
    beginShape();
    for (let i = 0; i <= steps; i++) {
      const a = lerp(aL, aR, i / steps);
      vertex(pond.cx + pond.rx * cos(a), pond.cy + pond.ry * sin(a));
    }
    vertex(pond.cx + 240, shelfY + 16);
    vertex(pond.cx + 150, shelfY + 42);
    vertex(pond.cx - 150, shelfY + 40);
    vertex(pond.cx - 240, shelfY + 14);
    endShape(CLOSE);
    pop();
  })();

  const p = {
    LTip: { x: pond.cx - 240, y: shelfY + 14 },
    LTop: { x: pond.cx - 140, y: shelfY + 2 },
    RTop: { x: pond.cx + 140, y: shelfY + 4 },
    RTip: { x: pond.cx + 240, y: shelfY + 16 },
    RLow: { x: pond.cx + 150, y: shelfY + 42 },
    LLow: { x: pond.cx - 150, y: shelfY + 40 },
  };

  // shelf
  push();
  noStroke();
  fill(green);
  beginShape();
  vertex(p.LTip.x, p.LTip.y);
  vertex(p.LTop.x, p.LTop.y);
  vertex(p.RTop.x, p.RTop.y);
  vertex(p.RTip.x, p.RTip.y);
  vertex(p.RLow.x, p.RLow.y);
  vertex(p.LLow.x, p.LLow.y);
  endShape(CLOSE);
  pop();

  // front edge
  push();
  stroke(dark);
  strokeWeight(2);
  line(p.LTip.x, p.LTip.y, p.LLow.x, p.LLow.y);
  line(p.LLow.x, p.LLow.y, p.RLow.x, p.RLow.y);
  line(p.RLow.x, p.RLow.y, p.RTip.x, p.RTip.y);
  pop();

  // blanket
  (function () {
    const bw = 170,
      bh = 60;
    push();
    translate(pond.cx - bw / 2, shelfY - 25);
    noStroke();
    fill("#ef4444");
    rect(0, 0, bw, bh, 4);
    fill("#ffffff");
    for (let x = 8; x < bw; x += 24) rect(x, 0, 12, bh);
    for (let y = 8; y < bh; y += 24) rect(0, y, bw, 12);
    pop();
  })();

  // bucket
  bucket.x = pond.cx - 6;
  bucket.y = shelfY - 18;
  push();
  translate(bucket.x, bucket.y);
  fill("#b48a58");
  stroke(dark);
  strokeWeight(2);
  ellipse(0, 0, 52, 20);
  rectMode(CENTER);
  rect(0, 18, 50, 26, 4);
  ellipse(0, 30, 50, 18);
  noFill();
  arc(0, -16, 48, 24, PI, TWO_PI);
  pop();

  // mushrooms
  drawMushroom(pond.cx - 170, lipYAtX(leftX) + 2 - 50, "smile");
  drawMushroom(pond.cx + 170, lipYAtX(rightX) + 2 - 50, faceState);

  // rod + hook
  const base = { x: pond.cx - 140, y: lipYAtX(leftX) + 2 - 14 };
  stroke(dark);
  strokeWeight(3);
  line(base.x, base.y, base.x + 98, base.y - 62);
  stroke("#4b5563");
  strokeWeight(2);
  line(base.x + 98, base.y - 62, hook.x, hook.y - 24);
  line(hook.x, hook.y - 24, hook.x, hook.y);
  noFill();
  stroke("#4b5563");
  strokeWeight(3);
  arc(hook.x, hook.y + 6, 12, 12, QUARTER_PI, PI);

  if (faceTimer > 0 && --faceTimer === 0) faceState = "neutral";
}

function drawMushroom(x, y, mood = "neutral") {
  const dark = "#3a3a3a";
  push();
  translate(x, y);
  fill("#f5e0c8");
  stroke(dark);
  strokeWeight(2.5);
  ellipse(0, 22, 50, 60);
  ellipse(-20, 22, 12, 12);
  ellipse(20, 22, 12, 12);
  ellipse(-14, 50, 16, 10);
  ellipse(14, 50, 16, 10);
  fill("#ef4444");
  stroke(dark);
  strokeWeight(2.8);
  arc(0, -3, 92, 54, PI, TWO_PI);
  noStroke();
  fill("#ffffff");
  circle(-18, -18, 12);
  circle(16, -16, 12);
  circle(0, -10, 10);
  stroke(dark);
  strokeWeight(2.4);
  noFill();
  if (mood === "happy" || mood === "smile") {
    line(-10, 18, -6, 18);
    line(6, 18, 10, 18);
    arc(0, 26, 18, 10, 0, PI);
  } else if (mood === "sad") {
    line(-10, 18, -6, 18);
    line(6, 18, 10, 18);
    arc(0, 32, 18, 10, PI, 0);
  } else {
    point(-8, 20);
    point(8, 20);
    line(-2, 26, 2, 26);
  }
  pop();
}

// ———————————————————————————————————————————
// Submissions
// ———————————————————————————————————————————
function drawSubmissions() {
  subs = subs.filter((s) => s.t < 1);
  for (const s of subs) {
    s.t = Math.min(1, s.t + 0.02);
    const t = easeOutCubic(s.t);
    push();
    if (s.state === "kept") {
      image(
        s.img,
        lerp(s.startX, s.endX, t),
        lerp(s.startY, s.endY, t),
        s.w,
        s.h
      );
    } else {
      const ctx = drawingContext;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      image(s.img, s.startX, s.startY + t * 40, s.w, s.h);
      ctx.restore();
    }
    pop();
  }
}

function submitDrawing() {
  if (!gameEnabled) return;
  doneButton.hide();

  // snapshot ink
  const src = ink.get(0, 0, W, H);
  src.loadPixels();

  // keep only pond pixels with alpha > 0
  const pondInk = createImage(W, H);
  pondInk.loadPixels();

  let minx = W,
    miny = H,
    maxx = -1,
    maxy = -1,
    count = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = 4 * (y * W + x);
      if (insidePond(x, y) && src.pixels[i + 3] > 0) {
        pondInk.pixels[i + 0] = src.pixels[i + 0];
        pondInk.pixels[i + 1] = src.pixels[i + 1];
        pondInk.pixels[i + 2] = src.pixels[i + 2];
        pondInk.pixels[i + 3] = src.pixels[i + 3];
        minx = Math.min(minx, x);
        miny = Math.min(miny, y);
        maxx = Math.max(maxx, x);
        maxy = Math.max(maxy, y);
        count++;
      } else {
        pondInk.pixels[i + 0] =
          pondInk.pixels[i + 1] =
          pondInk.pixels[i + 2] =
          pondInk.pixels[i + 3] =
            0;
      }
    }
  }
  pondInk.updatePixels();

  if (!count) {
    console.log("No ink to submit");
    return;
  }

  const bbox = {
    x: minx,
    y: miny,
    w: clamp(maxx - minx + 1, 1, W),
    h: clamp(maxy - miny + 1, 1, H),
  };

  // crop for animation
  const crop = pondInk.get(bbox.x, bbox.y, bbox.w, bbox.h);

  // erase those pixels from live ink
  ink.loadPixels();
  pondInk.loadPixels();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = 4 * (y * W + x);
      if (pondInk.pixels[i + 3] > 0) {
        ink.pixels[i + 0] =
          ink.pixels[i + 1] =
          ink.pixels[i + 2] =
          ink.pixels[i + 3] =
            0;
      }
    }
  }
  ink.updatePixels();

  // emoji grading
  const userMask = binarizeToSquareMask(crop, 96);
  const targetMaskScaled = binarizeToSquareMask(targetMask.get(), 96);
  const score = diceScore(userMask, targetMaskScaled);

  const PASS = 0.32,
    GOOD = 0.45;
  const ok = score >= PASS;
  faceState = ok ? "happy" : "sad";
  faceTimer = 90;
  console.log(`Emoji "${target.name}" score: ${score.toFixed(3)}`);

  // animate
  const startX = bbox.x,
    startY = bbox.y;
  const endX = bucket.x - bbox.w / 2,
    endY = bucket.y - bbox.h / 2;

  subs.push({
    img: crop,
    w: bbox.w,
    h: bbox.h,
    startX,
    startY,
    endX,
    endY,
    state: ok ? "kept" : "sunk",
    t: 0,
  });
  pickNewTarget();
}

// ———————————————————————————————————————————
// Interaction
// ———————————————————————————————————————————
function mousePressed() {
  const sw = pickSwatch(mouseX, mouseY);
  if (sw >= 0) {
    colorNow = PALETTE[sw];
    erasing = false;
    doneButton.show();
    return;
  }
  if (hitEraser(mouseX, mouseY)) {
    erasing = !erasing;
    if (gameEnabled) {
      if (erasing) doneButton.hide();
      else doneButton.show();
    }
    return;
  }

  if (!insidePond(mouseX, mouseY)) {
    // trigger glow pulse
    rimGlow = 1;
    rimGlowSpeed = 0.04;
    currentStroke = [];
    return;
  }

  currentStroke = [{ x: mouseX, y: mouseY }];
  if (!erasing && gameEnabled) doneButton.show();

  if (erasing) {
    ink.erase();
    ink.strokeWeight(ERASER_SIZE);
    ink.point(mouseX, mouseY);
    ink.noErase();
  } else {
    ink.noErase();
    ink.stroke(colorNow);
    ink.strokeWeight(STROKE_W);
    ink.point(mouseX, mouseY);
  }
}

function mouseDragged() {
  if (!currentStroke.length || !insidePond(mouseX, mouseY)) return;

  currentStroke.push({ x: mouseX, y: mouseY });
  if (erasing) {
    ink.erase();
    ink.strokeWeight(ERASER_SIZE);
    ink.line(pmouseX, pmouseY, mouseX, mouseY);
    ink.noErase();
  } else {
    ink.noErase();
    ink.stroke(colorNow);
    ink.strokeWeight(STROKE_W);
    ink.line(pmouseX, pmouseY, mouseX, mouseY);
  }
}
function mouseReleased() {
  currentStroke = [];
}

// ———————————————————————————————————————————
// Masking & scoring
// ———————————————————————————————————————————
function binarizeToSquareMask(img, N = 96) {
  const g = createGraphics(N, N);
  g.pixelDensity(1);
  g.clear();

  const s = Math.min(N / img.width, N / img.height);
  const w = img.width * s,
    h = img.height * s;
  const x = (N - w) / 2,
    y = (N - h) / 2;
  g.image(img, x, y, w, h);

  g.loadPixels();
  for (let i = 0; i < N * N; i++) {
    const a = g.pixels[i * 4 + 3];
    const v = a > 0 ? 255 : 0;
    g.pixels[i * 4 + 0] =
      g.pixels[i * 4 + 1] =
      g.pixels[i * 4 + 2] =
      g.pixels[i * 4 + 3] =
        v;
  }
  g.updatePixels();
  return g.get();
}

function diceScore(Aimg, Bimg) {
  Aimg.loadPixels();
  Bimg.loadPixels();
  const N = Aimg.width * Aimg.height;
  let A = 0,
    B = 0,
    I = 0;
  for (let i = 0; i < N; i++) {
    const a = Aimg.pixels[i * 4 + 3] > 0 ? 1 : 0;
    const b = Bimg.pixels[i * 4 + 3] > 0 ? 1 : 0;
    A += a;
    B += b;
    I += a & b;
  }
  return A + B ? (2 * I) / (A + B) : 0;
}

// ———————————————————————————————————————————
// UI
// ———————————————————————————————————————————
function drawUI() {
  const { swatchR: r, swatchPad: pad, panelX: px, panelY: py } = UI;

  for (let i = 0; i < PALETTE.length; i++) {
    const x = px,
      y = py + i * pad;
    noFill();
    stroke("#374151");
    strokeWeight(2);
    circle(x, y, r * 2);
    noStroke();
    fill(PALETTE[i]);
    circle(x, y, r * 1.6);
    if (colorNow === PALETTE[i] && !erasing) {
      noFill();
      stroke(0);
      strokeWeight(2.5);
      circle(x, y, r * 2.2);
    }
  }

  // eraser button
  const ex = px,
    ey = py + PALETTE.length * pad + 20;
  noFill();
  stroke("#374151");
  strokeWeight(2);
  circle(ex, ey, r * 2.2);
  line(ex - r * 0.9, ey - r * 0.9, ex + r * 0.9, ey + r * 0.9);
  if (erasing) {
    strokeWeight(3);
    circle(ex, ey, r * 2.6);
  }

  if (gameEnabled) {
    // mushroom bubble showing target emoji
    const fx = pond.cx + 170,
      fy = pond.cy - pond.ry - 10 - 52;
    const bw = 56,
      bh = 42;
    fill(255, 255, 255, 230);
    stroke("#4b5563");
    strokeWeight(2);
    ellipse(fx, fy, bw, bh);

    noStroke();
    fill("#1f2937");
    textAlign(CENTER, CENTER);
    textSize(28);
    text(target?.ch || "🎣", fx, fy + 1);

    if (faceState === "happy" || faceState === "sad") {
      textSize(16);
      text(faceState === "happy" ? "✔️" : "❌", fx + bw * 0.32, fy - bh * 0.32);
    }
  }
}

function pickSwatch(mx, my) {
  const { swatchR: r, swatchPad: pad, panelX: px, panelY: py } = UI;
  for (let i = 0; i < PALETTE.length; i++) {
    const x = px,
      y = py + i * pad;
    if (dist(mx, my, x, y) < r) return i;
  }
  return -1;
}
function hitEraser(mx, my) {
  const { swatchR: r, swatchPad: pad, panelX: px, panelY: py } = UI;
  const ex = px,
    ey = py + PALETTE.length * pad + 20;
  return dist(mx, my, ex, ey) < r * 1.1;
}
