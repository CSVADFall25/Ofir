/* Daily "city skyline" bars + goal line
   Toggle overlay: weekday (Mon–Sun) trend lines, each with a color.
   NEW: Click legend items to toggle individual weekday lines on/off.

   CSV schema: date,steps  (date format YYYY-MM-DD)
*/

let table;

// ----- CONFIG -----
const GOAL = 8000;
const START_CUTOFF = new Date("2023-05-01"); // <- change/remove as you like
const CANVAS_W = 1500,
  CANVAS_H = 900;
const padL = 70,
  padR = 20,
  padT = 70,
  padB = 60;
// -------------------

let days = []; // [{date: Date, steps: number}]
let startDate, endDate;
let showWeekdayTrends = false;

let toggleBtn;

// Weekday colors (Mon..Sun)
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]; // draw/legend Mon..Sun
const weekdayColors = {
  1: "#1f77b4", // Mon
  2: "#ff7f0e", // Tue
  3: "#2ca02c", // Wed
  4: "#d62728", // Thu
  5: "#9467bd", // Fri
  6: "#8c564b", // Sat
  0: "#17becf", // Sun
};

// Per-week-day samples [{week, steps}]
let trendByDOW = Array.from({ length: 7 }, () => []);

// NEW: per-weekday visibility
let showWeekday = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
};
// NEW: legend hit areas for click toggles
let legendHitboxes = []; // [{dow, x,y,w,h}]

function preload() {
  table = loadTable("steps_daily.csv", "csv", "header");
}

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont("ui-monospace, Menlo, Consolas, monospace");
  noStroke();

  // Load & filter rows
  for (let r = 0; r < table.getRowCount(); r++) {
    const d = new Date(table.getString(r, "date"));
    const s = int(table.getString(r, "steps"));
    if (isNaN(d.getTime()) || isNaN(s)) continue;
    if (d >= START_CUTOFF) days.push({ date: d, steps: s });
  }
  if (days.length === 0) {
    background(250);
    fill(0);
    text("No rows on/after cutoff.", 20, 30);
    noLoop();
    return;
  }

  // Sort
  days.sort((a, b) => a.date - b.date);
  startDate = days[0].date;
  endDate = days[days.length - 1].date;

  // Build weekday trend points by week index
  for (const rec of days) {
    const dow = rec.date.getDay(); // 0..6
    const week = Math.floor((rec.date - startDate) / (1000 * 60 * 60 * 24 * 7));
    trendByDOW[dow].push({ week, steps: rec.steps });
  }
  for (let d = 0; d < 7; d++) {
    trendByDOW[d].sort((a, b) => a.week - b.week);
  }

  // UI
  toggleBtn = createButton("Toggle Weekday Trends");
  toggleBtn.position(10, 10);
  toggleBtn.mousePressed(() => (showWeekdayTrends = !showWeekdayTrends));
}

function draw() {
  background(250);

  // scales
  const maxSteps = max(days.map((d) => d.steps));
  const yMax = Math.max(GOAL, maxSteps) * 1.05; // headroom

  drawAxesGrid(yMax);
  if (!showWeekdayTrends) drawBars(yMax);
  drawGoalLine(yMax);

  if (showWeekdayTrends) drawWeekdayTrends(yMax);

  // 3) LABELS on top
  drawAxesLabels(yMax);

  // 4) Title & legend
  drawTitleAndLegend();
}

/* ---------- Drawing helpers ---------- */

function xPosByIndex(i) {
  return map(i, 0, days.length - 1, padL, width - padR);
}

function yPosBySteps(steps, yMax) {
  // invert so bigger steps are higher
  return map(steps, 0, yMax, height - padB, padT);
}

function drawBars(yMax) {
  noStroke();
  fill(80);

  const barW = Math.max(2, ((width - padL - padR) / days.length) * 0.7);

  for (let i = 0; i < days.length; i++) {
    const s = days[i].steps;
    const x = xPosByIndex(i) - barW / 2;
    const y = yPosBySteps(s, yMax);
    rect(x, y, barW, height - padB - y, 1);
  }
}

function drawGoalLine(yMax) {
  const y = yPosBySteps(GOAL, yMax);
  stroke(200, 0, 0, 200);
  line(padL, y, width - padR, y);
  noStroke();
  fill(200, 0, 0, 220);
  textSize(11);
  textAlign(RIGHT, BOTTOM);
  text(`Goal ${GOAL.toLocaleString()}`, width - padR, y - 4);
}
function drawAxesGrid(yMax) {
  // axes lines
  stroke(0, 70);
  line(padL, padT, padL, height - padB); // Y axis line
  line(padL, height - padB, width - padR, height - padB); // X axis line

  // horizontal grid lines only (no numbers)
  const tickStep = chooseNiceYTick(yMax);
  stroke(0, 18);
  for (let val = 0; val <= yMax; val += tickStep) {
    const y = yPosBySteps(val, yMax);
    line(padL, y, width - padR, y);
  }

  // light monthly vertical guides only (no month labels yet)
  const axisY = height - padB;
  const first = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  let cur = new Date(first);
  stroke(0, 12);
  while (cur <= last) {
    const idx = dateToNearestIndex(cur);
    const x = xPosByIndex(idx);
    line(x, axisY, x, padT);
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
}

function drawAxesLabels(yMax) {
  // Y tick numbers + label
  noStroke();
  fill(0, 120);
  textSize(11);
  textAlign(RIGHT, CENTER);
  const tickStep = chooseNiceYTick(yMax);
  for (let val = 0; val <= yMax; val += tickStep) {
    const y = yPosBySteps(val, yMax);
    text(numberK(val), padL - 8, y);
  }
  // Y axis label
  push();
  translate(padL - 45, (padT + (height - padB)) / 2);
  rotate(-HALF_PI);
  fill(0, 140);
  textAlign(CENTER, CENTER);
  text("Steps (per day)", 0, 0);
  pop();

  // X monthly ticks + labels (drawn LAST so they sit on top)
  drawMonthlyTicksLabeled();

  // X axis label
  fill(0, 140);
  textAlign(CENTER, TOP);
  text("Date (monthly ticks)", (padL + (width - padR)) / 2, height - padB + 28);
}

function drawMonthlyTicksLabeled() {
  const axisY = height - padB;
  const first = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  let cur = new Date(first);

  textSize(10);
  fill(0, 120);
  stroke(0, 22);
  const MIN_LABEL_SPACING = 28; // px

  let prevX = -Infinity;
  while (cur <= last) {
    const idx = dateToNearestIndex(cur);
    const x = xPosByIndex(idx);

    // Draw small tick
    line(x, axisY, x, axisY + 6);

    // Skip label if too close to Y-axis or previous label
    const tooCloseLeft = x - padL < 12;
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

function dateToNearestIndex(d) {
  const t0 = startDate.getTime(),
    t1 = endDate.getTime();
  const tt = constrain((d.getTime() - t0) / (t1 - t0), 0, 1);
  return Math.round(tt * (days.length - 1));
}

function drawWeekdayTrends(yMax) {
  // Draw Mon..Sun in consistent order, but only if showWeekday[dow] is true
  strokeWeight(2);
  const maxWeek = trendByDOWMaxWeek();

  for (const dow of weekdayOrder) {
    const pts = trendByDOW[dow];
    if (pts.length === 0) continue;

    const visible = !!showWeekday[dow];
    const col = color(weekdayColors[dow]);
    if (!visible) col.setAlpha(60); // faint if hidden (for smooth legend preview)
    stroke(col);
    noFill();

    beginShape();
    for (const p of pts) {
      const x = map(p.week, 0, Math.max(1, maxWeek), padL, width - padR);
      const y = yPosBySteps(p.steps, yMax);
      if (visible) vertex(x, y);
      else vertex(x, y); // still draw faintly to maintain legend preview (optional)
    }
    endShape();
  }
}

function trendByDOWMaxWeek() {
  let m = 0;
  for (let d = 0; d < 7; d++) {
    if (trendByDOW[d].length)
      m = Math.max(m, trendByDOW[d][trendByDOW[d].length - 1].week);
  }
  return m;
}

function drawTitleAndLegend() {
  noStroke();
  fill(0);
  textSize(13);
  textAlign(LEFT, BASELINE);
  text(
    "Daily Steps — City Bars  |  Goal line  |  Weekday Trends (toggle + per-day legend toggles)",
    10,
    48
  );
  textSize(11);
  fill(0, 120);
  text(
    'Click "Toggle Weekday Trends" to show lines. Click legend chips to hide/show individual weekdays.',
    10,
    64
  );
  if (!showWeekdayTrends) return; // no legend if trends not shown
  // Legend (Mon..Sun) — store hitboxes for clicks
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

    // chip background and strike if hidden
    const visible = !!showWeekday[dow];
    const col = color(weekdayColors[dow]);
    fill(visible ? col : color(red(col), green(col), blue(col), 60));
    rect(x0, yy, chipW, h, 3);

    // border
    noFill();
    stroke(0, 80);
    rect(x0, yy, chipW, h, 3);
    noStroke();

    // label
    fill(visible ? 0 : color(0, 120)); // dim text when hidden
    text(weekdayNames[dow], x0 + chipW + 8, yy + h / 2);

    // optional strike-through when hidden
    if (!visible) {
      stroke(0, 120);
      line(x0, yy + h / 2, x0 + chipW, yy + h / 2);
      noStroke();
    }

    // save hitbox (chip + label) for clicks
    const w = 120; // clickable width covering chip + text
    legendHitboxes.push({ dow, x: x0, y: yy, w: w, h: h });
  }
}

/* ---------- Interaction: click legend to toggle ---------- */
function mousePressed() {
  if (!showWeekdayTrends) return; // legend toggles only matter when overlay is visible
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

/* ---------- utils ---------- */
function numberK(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
  return String(v);
}
function chooseNiceYTick(maxVal) {
  // Choose a reasonable tick step around 2k or 5k
  const candidates = [1000, 2000, 2500, 5000];
  let best = candidates[0];
  for (const c of candidates) {
    if (maxVal / c <= 10) {
      best = c;
      break;
    }
  }
  return best;
}
