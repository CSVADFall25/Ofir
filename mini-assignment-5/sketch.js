let port, reader;
let latestVal = 0;
let latestLabel = "—";
let buffer = "";
let serial;

function setup() {
  createCanvas(2000, 400);
  background(255);
  serial = new p5.SerialPort();
  tooltipGraphics = createGraphics(2000, 400);
  // Serial event listeners
  serial.on("connected", () => console.log("✓ Connected to p5.serialcontrol"));

  //   // Use the correct port (from the list you saw in the serialcontrol app)
  serial.openPort("/dev/cu.usbmodem144401"); // adjust for your OS

  //   serial.on("connected", () => console.log("Connected to server"));
  serial.on("open", () => console.log("Port open"));
  serial.on("data", gotData);
  serial.on("error", (err) => console.error(err));
}

function draw() {
  const saturation = map(latestVal, 100, 1023, 10, 90);
  if (latestVal == 0) {
    background(255);
  } else {
    colorMode(HSL, 360, 100, 100); // set ranges for H, S, L
    background(198, saturation, 56); // (H, S, L)
  }
}

function gotData() {
  let line = serial.readLine().trim();
  if (!line) return;

  const m = line.match(/Analog\s*reading\s*=\s*(\d+)(?:\s*-\s*(.*))?/i);
  if (m) {
    latestVal = parseInt(m[1], 10);

    if (m[2]) latestLabel = m[2].trim();
  }
}

// Handle the list of available ports
function gotList(portList) {
  console.log("Available ports:", portList);
  if (!PORT) {
    // Try to auto-open the first USB/serial port
    const guess = portList.find((p) => /usb|tty|COM/i.test(p));
    if (guess) {
      console.log("Auto-opening", guess);
      serial.openPort(guess);
    } else {
      console.warn(
        "No valid serial ports found. Open one in p5.serialcontrol."
      );
    }
  }
}
