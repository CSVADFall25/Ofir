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
