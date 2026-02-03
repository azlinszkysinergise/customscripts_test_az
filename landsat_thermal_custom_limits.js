//VERSION=3

// --- USER DEFINED PARAMETERS ---
const minTempK = 273; 
const maxTempK = 313; 
// -------------------------------

const blue_red = [
  [minTempK, 0x003d99],
  [minTempK + 5, 0x2e82ff],
  [minTempK + 10, 0x80b3ff],
  [minTempK + 15, 0xffffff],
  [maxTempK - 15, 0xf69855],
  [maxTempK - 10, 0xec6927],
  [maxTempK - 5, 0xaa2d1d],
  [maxTempK, 0x3d0200],
];

const viz = new ColorRampVisualizer(blue_red, minTempK, maxTempK);

function setup() {
  return {
    input: ["B03", "B04", "B10", "dataMask"],
    output: [
      { id: "default", bands: 4 },
      { id: "eobrowserStats", bands: 2 },
      { id: "dataMask", bands: 1 },
    ],
  };
}

function evaluatePixel(samples) {
  const cloud = isCloud(samples);
  let val = samples.B10;
  let rgb = viz.process(val);

  // If cloud is detected, override RGB with grey [R, G, B]
  // Values are 0.0 - 1.0; 0.5 is a medium grey
  if (cloud) {
    rgb = [0.5, 0.5, 0.5];
  }

  return {
    default: [...rgb, samples.dataMask],
    eobrowserStats: [val - 273.15, cloud ? 1 : 0],
    dataMask: [samples.dataMask],
  };
}

function isCloud(samples) {
  // Logic based on normalized green-red difference and brightness
  const NGDR = index(samples.B03, samples.B04);
  const bRatio = (samples.B03 - 0.175) / (0.39 - 0.175);
  return bRatio > 1 || (bRatio > 0 && NGDR > 0);
}
