//VERSION=3
// Whitecap / breaking-wave detector for Sentinel-2 L2A imagery.
// Sea pixels with bright foam (whitecaps) are mapped in magenta;
// every other pixel keeps its true colour. Clouds, cloud shadows,
// cirrus and no-data pixels are masked out using the SCL band.

// ---- Tuning parameters ----
// Mean visible reflectance above which a sea pixel is flagged as whitecap.
// Open water is typically 0.02-0.06; foam/whitecaps are much brighter.
// Raise it if sun glint produces false positives, lower it to catch faint foam.
const WHITECAP_THRESHOLD = 0.12;

// Brightness gain for the true-colour background.
const TC_GAIN = 3.5;

function setup() {
  return {
    input: ["B02", "B03", "B04", "SCL", "dataMask"],
    output: [
      { id: "default", bands: 4 },                              // R, G, B, alpha
      { id: "index", bands: 1, sampleType: "FLOAT32" },        // brightness (histogram)
      { id: "browserStats", bands: 1, sampleType: "FLOAT32" }, // brightness (time series)
      { id: "dataMask", bands: 1 },
    ],
  };
}

function evaluatePixel(sample) {
  const scl = Math.round(sample.SCL);

  // Cloud & no-data masking via the scene classification layer:
  // 0 no data, 1 saturated/defective, 3 cloud shadow,
  // 8 cloud medium probability, 9 cloud high probability, 10 thin cirrus.
  const masked =
    !sample.dataMask ||
    scl === 0 || scl === 1 || scl === 3 ||
    scl === 8 || scl === 9 || scl === 10;

  if (masked) {
    return {
      default: [0, 0, 0, 0],
      index: [NaN],
      browserStats: [NaN],
      dataMask: [0],
    };
  }

  const blue = sample.B02;
  const green = sample.B03;
  const red = sample.B04;

  // Sea: SCL 6 (water), plus 7 (unclassified), which often covers
  // rough, bright sea surfaces the classifier cannot assign.
  const isSea = scl === 6 || scl === 7;

  // Per-pixel brightness across the visible bands. Whitecaps are bright
  // and spectrally flat in B02/B03/B04, unlike darker open water.
  const brightness = (red + green + blue) / 3;
  const isWhitecap = isSea && brightness >= WHITECAP_THRESHOLD;

  // Raw brightness for the histogram / time series (sea pixels only).
  const statValue = isSea ? brightness : NaN;

  if (isWhitecap) {
    return {
      default: [1.0, 0.0, 1.0, 1], // magenta
      index: [statValue],
      browserStats: [statValue],
      dataMask: [1],
    };
  }

  // True colour everywhere else (AUTO output clamps to 0-255).
  return {
    default: [red * TC_GAIN, green * TC_GAIN, blue * TC_GAIN, 1],
    index: [statValue],
    browserStats: [statValue],
    dataMask: [1],
  };
}
