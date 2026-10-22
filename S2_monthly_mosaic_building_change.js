//VERSION=3
// By András Zlinszky @azlinszky.bsky.social and Mistral AI
// Built-up area change detection between two cloud-free monthly composites
// of Sentinel-2 L2A (data fusion, multi-temporal).
//
// Each data source is a Sentinel-2 L2A layer with a ONE-MONTH time interval.
// Within each source the script builds a per-pixel mean composite of the
// cloud-free, non-water observations, selected with the SCL band, keeping
// only the bands needed for NDVI and the Built-up Index:
//
//   BUI = NDBI - NDVI
//   NDBI = (B11 - B08) / (B11 + B08)
//   NDVI = (B08 - B04) / (B08 + B04)
//
// The change logic is identical to the S1_mosaic_building_change.js gate:
// a pixel is flagged when the BUI score increased between the two composites,
// the 'after' composite is built-up-like, and not dense vegetation.
//
// Configure two Sentinel-2 L2A layers in the Copernicus Browser data-fusion
// setup and give each a one-month time range. The aliases are the Copernicus
// Browser defaults: S2L2A (earlier month) and S2L2A-1 (later month).

// --- SCENE PRE-FILTERING ---
// Cloud-cover filtering happens in two places:
// 1. Set the maximum cloud coverage (e.g. 80%) in each layer's search
//    settings in the Copernicus Browser - this drops cloudy days before
//    they are downloaded, saving processing units.
// 2. Per pixel, evaluatePixel averages only the SCL-classified cloud-free
//    observations (see badScl below), so residual cloud in kept days
//    cannot contaminate the composites.

// --- CHANGE THRESHOLD (BUI gain between composite 1 and composite 2) ---
const changeThreshold = 0.15;  // raise to keep only strong new built-up, lower for subtle change

// --- BUILT-UP FILTERS (applied to the 'after' composite: S2L2A-1) ---
const minAbsoluteBUI_2 = 0.05; // 'after' composite must itself look built-up
const maxNDVI_2 = 0.4;         // 'after' composite must not be dense vegetation

// --- SCL CLASSES EXCLUDED FROM THE COMPOSITES ---
// 0 no data, 1 saturated/defective, 3 cloud shadow, 8 cloud medium,
// 9 cloud high, 10 thin cirrus, 11 snow/ice (snow would poison the mean).
const badScl = [0, 1, 3, 8, 9, 10, 11];

// --- WATER MASK ---
// SCL 6 (water) is excluded from the composites as well. Over water the
// reflectances in B08 and B11 are tiny, so the NDBI/NDVI denominators are
// near zero and the indices swing wildly between months (turbidity, glint,
// sediment) - which produces false built-up change detections. Pixels whose
// cloud-free observations are ALL water end up with no valid data and render
// transparent; mixed coastal pixels keep their non-water observations.
const waterScl = 6;

// --- OUTPUT DISPLAY SETTINGS ---
// Opacity for pixels with NO built-up change (0.0 = fully transparent)
const zeroMapOpacity = 0.0;
// Opacity for pixels WITH built-up change
const mapOpacity = 0.5;

// --- USER-TUNABLE PALETTE ---
const colorRamp = [
  [0.0, 0x000000],  // Black for background / no change
  [0.4, 0x555555],  // Dark grey for minor/noisy changes
  [0.7, 0xFFA500],  // Orange for potential new built-up
  [1.0, 0xFF0000]   // Red for major new built-up areas
];

const visualizer = new ColorRampVisualizer(colorRamp);

function setup() {
  return {
    input: [
      { datasource: "S2L2A", bands: ["B04", "B08", "B11", "SCL", "dataMask"] },
      { datasource: "S2L2A-1", bands: ["B04", "B08", "B11", "SCL", "dataMask"] }
    ],
    output: [
      { id: "default", bands: 4 },                              // R, G, B, alpha
      { id: "index", bands: 1, sampleType: "FLOAT32" },        // change score (histogram)
      { id: "browserStats", bands: 1, sampleType: "FLOAT32" }, // change score (time series)
      { id: "dataMask", bands: 1 }
    ],
    mosaicking: "ORBIT"  // all acquisitions within each source's time range
  };
}

// Mean of the cloud-free, non-water observations of one composite,
// or null if none.
function cloudFreeMean(samples) {
  let n = 0;
  let sumB04 = 0;
  let sumB08 = 0;
  let sumB11 = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!s.dataMask) continue;

    const scl = Math.round(s.SCL);
    let bad = false;
    for (let k = 0; k < badScl.length; k++) {
      if (scl === badScl[k]) { bad = true; break; }
    }
    if (bad) continue;

    // Water mask: skip water-classified observations (SCL 6)
    if (scl === waterScl) continue;

    sumB04 += s.B04;
    sumB08 += s.B08;
    sumB11 += s.B11;
    n++;
  }

  if (n === 0) return null;
  return { B04: sumB04 / n, B08: sumB08 / n, B11: sumB11 / n };
}

function ndvi(red, nir) {
  return (nir - red) / (nir + red);
}

function bui(red, nir, swir1) {
  const ndbi = (swir1 - nir) / (swir1 + nir);
  return ndbi - ndvi(red, nir);
}

function evaluatePixel(samples) {
  // Build the two monthly cloud-free composites
  // NOTE: "S2L2A-1" contains a hyphen, so it must be accessed with
  // bracket notation - samples.S2L2A-1 would parse as subtraction.
  const c1 = cloudFreeMean(samples.S2L2A);
  const c2 = cloudFreeMean(samples["S2L2A-1"]);

  // No cloud-free observation in either month for this pixel -> transparent
  if (c1 === null || c2 === null) {
    return {
      default: [0, 0, 0, 0],
      index: [NaN],
      browserStats: [NaN],
      dataMask: [0]
    };
  }

  // Built-up index for each composite
  const bui1 = bui(c1.B04, c1.B08, c1.B11);
  const bui2 = bui(c2.B04, c2.B08, c2.B11);
  const ndvi2 = ndvi(c2.B04, c2.B08);

  // Change in built-up score between the two months
  const diff = bui2 - bui1;

  let index = 0;

  // THE LOGIC GATE (same logic as the S1 script):
  // 1. built-up score increased,
  // 2. 'after' composite is itself built-up-like,
  // 3. 'after' composite is not dense vegetation (excludes green-up).
  if (diff > 0 && bui2 >= minAbsoluteBUI_2 && ndvi2 <= maxNDVI_2) {
    index = Math.min(diff / changeThreshold, 1.0);
  }

  const rgb = visualizer.process(index);

  // Choose opacity based on whether change was detected
  const currentOpacity = (index === 0) ? zeroMapOpacity : mapOpacity;

  return {
    default: [rgb[0], rgb[1], rgb[2], currentOpacity],
    index: [index],
    browserStats: [index],
    dataMask: [1]
  };
}
