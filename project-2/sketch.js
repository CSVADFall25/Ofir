/* --------------------------------------------------------------------------
   Daily Steps “City Skyline” + Goal Line
   Optional overlay: weekday trend lines (Mon–Sun), with per-day toggles.
   Sonification: 7 oscillators (one per weekday) with tempo/volume controls.
   Data: CSV with headers: date,steps (date format: YYYY-MM-DD)
-------------------------------------------------------------------------- */

// --------------------------- Config & Layout ------------------------------
const GOAL_STEPS = 8000;
const DATA_START = new Date("2023-05-01");
const CANVAS_W = 1500,
  CANVAS_H = 900;

const MARGIN = {
  left: 70,
  right: 20,
  top: 70,
  bottom: 60,
};

// --------------------------- App State ------------------------------------
let table;
let days = []; // [{ date: Date, steps: number }]
let startDate, endDate;
let showTrends = false;

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun (Sun last for aesthetics)
const weekdayColors = {
  0: "#17becf",
  1: "#1f77b4",
  2: "#ff7f0e",
  3: "#2ca02c",
  4: "#d62728",
  5: "#9467bd",
  6: "#8c564b",
};

let trendByDow = Array.from({ length: 7 }, () => []); // per DOW: [{week, steps}]
let trendMin = 0,
  trendMax = 1;
let maxWeekIndex = 0;

// Legend & toggles
let showWeekday = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
};
let legendHitboxes = [];

// Hover tooltip (bars view)
let hoverIndex = -1;

// --------------------------- Audio (Trends) -------------------------------
let gainNode,
  baseVolume = 0.6;
let voices = []; // 7 oscillators (Sun..Sat)
let isPlaying = false;
let playBtn, toggleBtn, tempoSlider, volSlider;

let beatMs = 300; // ms per step (derived from slider BPM)
let lastBeatAtMs = 0;
let weekCursor = 0;
let playToken = 0; // invalidates stale schedulers
let lastClickAtMs = 0;
const SMOOTH_FRAC = 0.9; // portion of beat used for glide

// --------------------------- p5 Lifecycle ---------------------------------
function preload() {
  table = loadTable("steps_daily.csv", "csv", "header");
}

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont("ui-monospace, Menlo, Consolas, monospace");
  noStroke();

  // Parse and filter rows
  for (let r = 0; r < table.getRowCount(); r++) {
    const date = new Date(table.getString(r, "date"));
    const steps = int(table.getString(r, "steps"));
    if (isNaN(date.getTime()) || isNaN(steps)) continue;
    if (date >= DATA_START) days.push({ date, steps });
  }

  if (days.length === 0) {
    background(250);
    fill(0);
    text("No rows on/after cutoff.", 20, 30);
    noLoop();
    return;
  }

  // Sort by date
  days.sort((a, b) => a.date - b.date);
  startDate = days[0].date;
  endDate = days[days.length - 1].date;

  // Build weekday trend points by week index
  for (const rec of days) {
    const dow = rec.date.getDay();
    const week = Math.floor((rec.date - startDate) / (1000 * 60 * 60 * 24 * 7));
    trendByDow[dow].push({ week, steps: rec.steps });
  }
  for (let d = 0; d < 7; d++) trendByDow[d].sort((a, b) => a.week - b.week);

  // Range & indices for audio mapping
  maxWeekIndex = getMaxWeekAcrossTrends();
  const allVals = [];
  for (let d = 0; d < 7; d++)
    for (const p of trendByDow[d])
      if (Number.isFinite(p.steps)) allVals.push(p.steps);
  trendMin = allVals.length ? Math.min(...allVals) : 0;
  trendMax = allVals.length ? Math.max(...allVals) : 1;
  if (
    !Number.isFinite(trendMin) ||
    !Number.isFinite(trendMax) ||
    trendMax <= trendMin
  ) {
    trendMin = 0;
    trendMax = 1;
  }

  // Audio graph
  userStartAudio();
  gainNode = new p5.Gain();
  gainNode.amp(baseVolume, 0.05);
  gainNode.connect();

  // Controls bar (style with CSS selector #controls)
  const bar = createDiv("").id("controls");

  toggleBtn = createButton("Toggle Weekday Trends").parent(bar);
  toggleBtn.mousePressed(() => (showTrends = !showTrends));

  playBtn = createButton("▶︎ Play Remix (Trends)").parent(bar);
  playBtn.mousePressed(onTogglePlay);

  createSpan("Tempo").addClass("label").parent(bar);
  tempoSlider = createSlider(60, 240, 200, 1)
    .parent(bar)
    .style("width", "220px");

  createSpan("Vol").addClass("label").parent(bar);
  volSlider = createSlider(0, 100, 60, 1).parent(bar).style("width", "220px");
}

function draw() {
  background(250);

  const maxSteps = max(days.map((d) => d.steps));
  const yMax = Math.max(GOAL_STEPS, maxSteps) * 1.05;

  drawGrid(yMax);
  if (!showTrends) {
    drawBars(yMax);
    updateHoverIndex();
    drawHoverTooltip(yMax);
  }
  drawGoal(yMax);
  if (showTrends) drawTrends(yMax);
  drawAxesLabels(yMax);
  drawTitleLegend();

  // Audio tick
  if (isPlaying) {
    const bpm = tempoSlider.value();
    beatMs = 60000 / bpm;
    baseVolume = volSlider.value() / 100;
    if (gainNode) gainNode.amp(baseVolume, 0.05);
    tickAudioScheduler();
  }
}

// --------------------------- Drawing --------------------------------------
function xAtIndex(i) {
  return map(i, 0, days.length - 1, MARGIN.left, width - MARGIN.right);
}
function yAtSteps(steps, yMax) {
  return map(steps, 0, yMax, height - MARGIN.bottom, MARGIN.top);
}

function drawBars(yMax) {
  noStroke();
  fill(80);
  const barW = Math.max(
    2,
    ((width - MARGIN.left - MARGIN.right) / days.length) * 0.7
  );
  for (let i = 0; i < days.length; i++) {
    const s = days[i].steps;
    const x = xAtIndex(i) - barW / 2;
    const y = yAtSteps(s, yMax);
    rect(x, y, barW, height - MARGIN.bottom - y, 1);
  }
}

function drawGoal(yMax) {
  const y = yAtSteps(GOAL_STEPS, yMax);
  stroke(200, 0, 0, 200);
  line(MARGIN.left, y, width - MARGIN.right, y);
  noStroke();
  fill(200, 0, 0, 220);
  textSize(11);
  textAlign(RIGHT, BOTTOM);
  text(`Goal ${GOAL_STEPS.toLocaleString()}`, width - MARGIN.right, y - 4);
}

function drawGrid(yMax) {
  // axes
  stroke(0, 70);
  line(MARGIN.left, MARGIN.top, MARGIN.left, height - MARGIN.bottom);
  line(
    MARGIN.left,
    height - MARGIN.bottom,
    width - MARGIN.right,
    height - MARGIN.bottom
  );

  // horizontal ticks
  const yTick = pickNiceYTick(yMax);
  stroke(0, 18);
  for (let v = 0; v <= yMax; v += yTick) {
    const y = yAtSteps(v, yMax);
    line(MARGIN.left, y, width - MARGIN.right, y);
  }

  // monthly guides
  const axisY = height - MARGIN.bottom;
  const first = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  let cur = new Date(first);
  stroke(0, 12);
  while (cur <= last) {
    const idx = nearestIndexForDate(cur);
    const x = xAtIndex(idx);
    line(x, axisY, x, MARGIN.top);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
}

function drawAxesLabels(yMax) {
  noStroke();
  fill(0, 120);
  textSize(11);
  textAlign(RIGHT, CENTER);

  const yTick = pickNiceYTick(yMax);
  for (let v = 0; v <= yMax; v += yTick) {
    const y = yAtSteps(v, yMax);
    text(formatK(v), MARGIN.left - 8, y);
  }

  // Y label
  push();
  translate(MARGIN.left - 45, (MARGIN.top + (height - MARGIN.bottom)) / 2);
  rotate(-HALF_PI);
  fill(0, 140);
  textAlign(CENTER, CENTER);
  text("Steps (per day)", 0, 0);
  pop();

  // Month ticks + labels
  drawMonthTicks();
  fill(0, 140);
  textAlign(CENTER, TOP);
  text(
    "Date (monthly ticks)",
    (MARGIN.left + (width - MARGIN.right)) / 2,
    height - MARGIN.bottom + 28
  );
}

function drawMonthTicks() {
  const axisY = height - MARGIN.bottom;
  const first = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  let cur = new Date(first);

  textSize(10);
  fill(0, 120);
  stroke(0, 22);

  const MIN_LABEL_SPACING = 28;
  let prevX = -Infinity;

  while (cur <= last) {
    const idx = nearestIndexForDate(cur);
    const x = xAtIndex(idx);
    line(x, axisY, x, axisY + 6);

    const tooCloseLeft = x - MARGIN.left < 12;
    const tooClosePrev = x - prevX < MIN_LABEL_SPACING;

    if (!tooCloseLeft && !tooClosePrev) {
      noStroke();
      textAlign(CENTER, TOP);
      const label = cur.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      text(label, x, axisY + 10);
      prevX = x;
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
}

function drawTrends(yMax) {
  strokeWeight(2);
  const maxWeek = getMaxWeekAcrossTrends();

  for (const dow of weekdayOrder) {
    const pts = trendByDow[dow];
    if (!pts.length) continue;

    const visible = !!showWeekday[dow];
    const col = color(weekdayColors[dow]);
    if (!visible) col.setAlpha(60);

    stroke(col);
    noFill();
    beginShape();
    for (const p of pts) {
      const x = map(
        p.week,
        0,
        Math.max(1, maxWeek),
        MARGIN.left,
        width - MARGIN.right
      );
      const y = yAtSteps(p.steps, yMax);
      vertex(x, y);
    }
    endShape();
  }
}

function drawTitleLegend() {
  // Title & hint
  noStroke();
  fill(0);
  textSize(20);
  textAlign(LEFT, BASELINE);
  text("Daily Step Analysis", 10, 48);

  textSize(11);
  fill(0, 120);
  text(
    "Use the buttons to show trends, play/pause remix, adjust tempo & volume.",
    10,
    64
  );

  if (!showTrends) return;

  // Legend (click to toggle)
  legendHitboxes = [];
  const x0 = width - 280,
    y0 = 16,
    h = 16,
    gap = 20,
    chipW = 18;

  textSize(11);
  textAlign(LEFT, CENTER);

  for (let i = 0; i < weekdayOrder.length; i++) {
    const dow = weekdayOrder[i];
    const yy = y0 + i * gap;

    const visible = !!showWeekday[dow];
    const col = color(weekdayColors[dow]);

    fill(visible ? col : color(red(col), green(col), blue(col), 60));
    rect(x0, yy, chipW, h, 3);

    noFill();
    stroke(0, 80);
    rect(x0, yy, chipW, h, 3);

    noStroke();
    fill(visible ? 0 : color(0, 120));
    text(weekdayNames[dow], x0 + chipW + 8, yy + h / 2);

    const w = 120;
    legendHitboxes.push({ dow, x: x0, y: yy, w, h });
  }
}

// --------------------------- Interaction ----------------------------------
function mousePressed() {
  if (!showTrends) return;
  for (const hb of legendHitboxes) {
    if (
      mouseX >= hb.x &&
      mouseX <= hb.x + hb.w &&
      mouseY >= hb.y &&
      mouseY <= hb.y + hb.h
    ) {
      showWeekday[hb.dow] = !showWeekday[hb.dow];
      return;
    }
  }
}

function updateHoverIndex() {
  if (showTrends) {
    hoverIndex = -1;
    return;
  }

  const barW = Math.max(
    2,
    ((width - MARGIN.left - MARGIN.right) / days.length) * 0.7
  );
  hoverIndex = -1;

  const yMax = Math.max(GOAL_STEPS, max(days.map((d) => d.steps))) * 1.05;

  for (let i = 0; i < days.length; i++) {
    const x = xAtIndex(i) - barW / 2;
    const y = yAtSteps(days[i].steps, yMax);
    if (
      mouseX >= x &&
      mouseX <= x + barW &&
      mouseY >= y &&
      mouseY <= height - MARGIN.bottom
    ) {
      hoverIndex = i;
      return;
    }
  }
}

function drawHoverTooltip(yMax) {
  if (hoverIndex < 0 || hoverIndex >= days.length) return;

  const d = days[hoverIndex];
  const x = xAtIndex(hoverIndex);
  const y = yAtSteps(d.steps, yMax);

  const tooltip = `${d.date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}\n${d.steps.toLocaleString()} steps`;

  const pad = 6;
  const lines = tooltip.split("\n");
  textSize(12);

  const tw = Math.max(...lines.map((line) => textWidth(line))) + pad * 2;
  const th = lines.length * 16 + pad * 2;

  const bx = constrain(x + 10, MARGIN.left, width - MARGIN.right - tw);
  const by = constrain(y - th - 10, MARGIN.top, height - MARGIN.bottom - th);

  fill(255, 245);
  stroke(0, 80);
  rect(bx, by, tw, th, 6);

  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], bx + pad, by + pad + i * 16);
  }

  // guide line
  stroke(0, 120);
  line(x, y, x, height - MARGIN.bottom);
}

// --------------------------- Audio Controls --------------------------------
function onTogglePlay() {
  const now = millis();
  if (now - lastClickAtMs < 150) return; // debounce
  lastClickAtMs = now;

  getAudioContext().resume();

  if (isPlaying) {
    stopRemix(true);
    playBtn.html("▶︎ Play Remix (Trends)");
    return;
  }

  // start
  playToken++;
  isPlaying = true;
  showTrends = true;

  if (gainNode) gainNode.amp(baseVolume, 0.05);
  ensureVoices();

  weekCursor = 0;
  lastBeatAtMs = millis() - beatMs; // trigger immediately
  playBtn.html("⏸ Pause Remix (Trends)");
}

function ensureVoices() {
  if (voices && voices.length) return;
  voices = [];
  for (let dow = 0; dow < 7; dow++) {
    const osc = new p5.Oscillator(waveformForDow(dow));
    osc.disconnect();
    osc.connect(gainNode);
    osc.start();
    osc.amp(0, 0); // silent until scheduled
    voices[dow] = osc;
  }
}

function stopRemix(hard = true) {
  isPlaying = false;
  playToken++; // invalidate any in-flight tick
  fadeAndKillVoices(hard);
  if (gainNode) gainNode.amp(0, hard ? 0 : 0.05);
  weekCursor = 0;
}

function fadeAndKillVoices(hard) {
  if (!voices || !voices.length) return;
  for (const v of voices) {
    if (!v) continue;
    try {
      v.amp(0, hard ? 0 : 0.05);
    } catch {}
    try {
      v.stop();
    } catch {}
    try {
      v.disconnect();
    } catch {}
  }
  voices = [];
}

function tickAudioScheduler() {
  const myToken = playToken;
  const now = millis();
  if (!isPlaying || now - lastBeatAtMs < beatMs) return;

  if (weekCursor > maxWeekIndex) {
    stopRemix(true);
    playBtn.html("▶︎ Play Remix (Trends)");
    return;
  }

  const rampSec = Math.max(0.02, (beatMs / 1000) * SMOOTH_FRAC);

  for (let dow = 0; dow < 7; dow++) {
    if (myToken !== playToken || !isPlaying) return; // session changed
    const osc = voices[dow];
    if (!osc) continue;

    const val = interpolateTrendAtWeek(dow, weekCursor);
    const visible = showWeekday[dow]; // audio follows visibility

    let freq = 0,
      amp = 0;
    if (val != null && Number.isFinite(val) && visible) {
      freq = stepsToFrequency(val);
      amp = baseVolume * constrain(val / GOAL_STEPS, 0.15, 1.0);
    }

    if (freq > 0 && Number.isFinite(freq)) {
      osc.freq(freq, rampSec);
      osc.amp(amp, rampSec);
    } else {
      osc.amp(0, rampSec);
    }
  }

  weekCursor++;
  lastBeatAtMs = now;
}

// --------------------------- Utilities -------------------------------------
function formatK(v) {
  return v >= 1000
    ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k"
    : String(v);
}

function pickNiceYTick(maxVal) {
  const candidates = [1000, 2000, 2500, 5000];
  for (const c of candidates) if (maxVal / c <= 10) return c;
  return candidates[candidates.length - 1];
}

function nearestIndexForDate(d) {
  const t0 = startDate.getTime(),
    t1 = endDate.getTime();
  const tt = constrain((d.getTime() - t0) / (t1 - t0), 0, 1);
  return Math.round(tt * (days.length - 1));
}

function getMaxWeekAcrossTrends() {
  let m = 0;
  for (let d = 0; d < 7; d++) {
    if (trendByDow[d].length)
      m = Math.max(m, trendByDow[d][trendByDow[d].length - 1].week);
  }
  return m;
}

function interpolateTrendAtWeek(dow, w) {
  const arr = trendByDow[dow];
  if (!arr || !arr.length) return null;

  for (let i = 0; i < arr.length; i++)
    if (arr[i].week === w) return arr[i].steps;

  let left = null,
    right = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].week < w) left = arr[i];
    if (arr[i].week > w) {
      right = arr[i];
      break;
    }
  }
  if (left && right) {
    const t = (w - left.week) / (right.week - left.week);
    return left.steps + t * (right.steps - left.steps);
  }
  if (left) return left.steps;
  if (right) return right.steps;
  return null;
}

function stepsToFrequency(val) {
  if (!Number.isFinite(val)) return 0;
  if (trendMax <= trendMin) return midiToFreq(60); // fallback middle C

  // Normalize to 0..1, map to pentatonic scale across 3 octaves
  let n = constrain((val - trendMin) / (trendMax - trendMin), 0, 1);
  const scale = [0, 2, 4, 7, 9]; // C major pentatonic
  const octaves = 3;
  const totalDegrees = scale.length * octaves; // 15
  const degree = Math.round(n * (totalDegrees - 1));
  const baseMidi = 48; // C3
  const midi =
    baseMidi +
    Math.floor(degree / scale.length) * 12 +
    scale[degree % scale.length];
  const f = midiToFreq(midi);
  return Number.isFinite(f) ? f : 0;
}

function waveformForDow(dow) {
  return (
    {
      0: "sine",
      1: "triangle",
      2: "sawtooth",
      3: "square",
      4: "sine",
      5: "triangle",
      6: "sawtooth",
    }[dow] || "sine"
  );
}
