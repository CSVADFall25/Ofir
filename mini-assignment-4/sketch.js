let circles = [];
let table;
let distance = [];
let labels = [];
let energy = [];
let duration = [];
let tooltipGraphics;

//date range (for x=time)
let earliestDate, latestDate, totalDays;
let maxDist = 1,
  maxDur = 1,
  maxKcal = 1;

function preload() {
  table = loadTable("cycling_workouts.csv", "csv", "header");
}

function setup() {
  createCanvas(2000, 400);
  tooltipGraphics = createGraphics(2000, 400);

  //Extract all values from CSV
  for (let r = 0; r < table.getRowCount(); r++) {
    const lbl = formatDate(table.getString(r, "startDate"));
    const miles = float(table.getString(r, "totalDistance_miles"));
    const kcal = float(table.getString(r, "totalEnergyBurned_cal"));
    const mins = float(table.getString(r, "duration_minutes"));
    if (!isFinite(miles) || !isFinite(kcal) || !isFinite(mins)) continue;

    labels.push(lbl);
    distance.push(miles);
    energy.push(kcal);
    duration.push(mins);

    //track date range
    if (earliestDate === undefined || compareDates(lbl, earliestDate) === -1)
      earliestDate = lbl;
    if (latestDate === undefined || compareDates(lbl, latestDate) === 1)
      latestDate = lbl;
  }

  //precompute ranges
  totalDays = computeDateDifference(earliestDate, latestDate);
  maxDist = max(distance);
  maxDur = max(duration);
  maxKcal = max(energy);

  // Build circles using timeline mapping
  // small x-jitter if same-day
  const dayBuckets = {};
  for (let i = 0; i < labels.length; i++) {
    const key = normalizeDate(labels[i], earliestDate, latestDate).toFixed(5);
    if (!dayBuckets[key]) dayBuckets[key] = [];
    dayBuckets[key].push(i);
  }
  for (const key in dayBuckets) {
    const idxs = dayBuckets[key];
    const n = float(key);
    const baseX = n * width;
    for (let j = 0; j < idxs.length; j++) {
      const i = idxs[j];
      const miles = distance[i];
      const mins = duration[i];
      const kcal = energy[i];

      const x = baseX + map(j, 0, max(1, idxs.length - 1), -16, 16); // tiny spread
      const yTarget = map(miles, 0, maxDist || 1, height - 80, 40, true); // y = distance
      const r = map(mins, 0, maxDur || 1, 6, 28, true); // size = duration
      const hue = map(kcal, 0, maxKcal || 1, 210, 20, true); // hue = energy
      circles.push(new Circle(x, random(height), yTarget, r, hue));
    }
  }
}

function draw() {
  background(20);

  //baseline
  stroke(255, 40);
  line(0, height - 20, width, height - 20);

  for (let c of circles) {
    c.update();
    c.show();
  }
  drawTooltip(duration, energy, distance, labels);
}

function drawTooltip(values1, values2, values3, labels) {
  tooltipGraphics.clear();
  for (let i = 0; i < circles.length; i++) {
    if (circles[i].mouseOver(mouseX, mouseY)) {
      const lines = [
        `${labels[i]}`,
        `Distance: ${nf(values3[i], 1, 1)} miles`,
        `Energy: ${round(values2[i])} cal`,
        `Duration: ${nf(values1[i], 1, 2)} min`,
      ];
      tooltipGraphics.push();
      tooltipGraphics.colorMode(RGB);
      tooltipGraphics.textAlign(LEFT, TOP);
      tooltipGraphics.textSize(12);
      const padding = 8;
      let tw = 0;
      for (let t of lines) {
        tw = max(tw, textWidth(t));
      }
      const boxW = tw + padding * 2;
      const lineH = 16;
      const boxH = lines.length * lineH + padding * 2;
      const tipX = constrain(mouseX + 12, 0, width - boxW - 1);
      const tipY = constrain(mouseY - (boxH + 12), 0, height - boxH - 1);
      tooltipGraphics.noStroke();
      tooltipGraphics.fill(0, 0, 0, 200);
      tooltipGraphics.rect(tipX, tipY, boxW, boxH, 6);
      tooltipGraphics.fill(255);
      for (let li = 0; li < lines.length; li++) {
        tooltipGraphics.text(
          lines[li],
          tipX + padding,
          tipY + padding + li * lineH
        );
      }
      tooltipGraphics.pop();
      break;
    }
  }
  image(tooltipGraphics, 0, 0);
}

// Circle class
class Circle {
  // r = radius, hue in degrees, yTarget is where the spring pulls to
  constructor(x, y, yTarget, r, hue) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.yTarget = yTarget;
    this.r = r;
    this.hue = hue;
    this.k = 0.06; // spring stiffness
    this.damp = 0.86;
  }

  update() {
    const force = (this.yTarget - this.pos.y) * this.k;
    this.acc.y += force;

    this.vel.add(this.acc);
    this.vel.y *= this.damp;
    this.pos.add(this.vel);
    this.acc.mult(0);

    // keep inside canvas bounds
    if (this.pos.y > height - this.r) {
      this.pos.y = height - this.r;
      this.vel.y *= -0.6;
    }
    if (this.pos.y < this.r) {
      this.pos.y = this.r;
      this.vel.y *= -0.6;
    }
  }

  show() {
    // use degree-based HSB so hue mapping looks right
    colorMode(HSB, 360, 255, 255, 255);
    fill(this.hue, 255, 255, 200);
    noStroke();
    circle(this.pos.x, this.pos.y, this.r * 2);
  }

  mouseOver(mx, my) {
    return dist(mx, my, this.pos.x, this.pos.y) < this.r;
  }
}

function formatDate(datetimeStr) {
  const datePart = datetimeStr.split(" ")[0];
  const [Y, M, D] = datePart.split("-");
  const yy = Y.slice(2);
  return `${M}/${D}/${yy}`;
}

function parseDate(str) {
  const [mStr, dStr, yStr] = str.split("/");
  let m = int(mStr),
    d = int(dStr),
    y = int(yStr);
  if (y < 100) y = 2000 + y;
  return { year: y, month: m, day: d };
}

function compareDates(aStr, bStr) {
  const a = parseDate(aStr),
    b = parseDate(bStr);
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

function computeDateDifference(aStr, bStr) {
  const a = parseDate(aStr),
    b = parseDate(bStr);
  const A = new Date(a.year, a.month - 1, a.day);
  const B = new Date(b.year, b.month - 1, b.day);
  return Math.ceil(Math.abs(B - A) / (1000 * 60 * 60 * 24));
}

function normalizeDate(dateStr, startDateStr, endDateStr) {
  const t = parseDate(dateStr),
    s = parseDate(startDateStr),
    e = parseDate(endDateStr);
  const T = new Date(t.year, t.month - 1, t.day).getTime();
  const S = new Date(s.year, s.month - 1, s.day).getTime();
  const E = new Date(e.year, e.month - 1, e.day).getTime();
  if (E === S) return 0.5;
  return (T - S) / (E - S);
}
