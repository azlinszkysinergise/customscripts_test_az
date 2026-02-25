// ///////////////////////////////////////////////////////////////////
// CDSE Multi-Temporal Hybrid Script: Hungary Drought Monitoring
// Logic: NDVI identifies health, BSI identifies open bare soil
// works over a time series of Sentinel-2 images
// Palette: Green (Vegetation) -> Blue (Stubble) -> Red (Bare Soil)
// ///////////////////////////////////////////////////////////////////

// --- USER ADJUSTABLE PARAMETERS ---
var THRESH_VEG = 0.40;   // Above this = Healthy Green Forest/Crops
var THRESH_SOIL = 0.10;  // BSI above this = Pure Bare Soil (Red) - tune this by comparing to NIR false color
var WATER_CUTOFF = 0.04; // NIR below this = Water (Black/Dark Blue)
// ----------------------------------

function setup() {
  return {
    input: [{
      bands: ["B02", "B04", "B08", "B11", "SCL", "dataMask"],
      units: "DN"
    }],
    output: { bands: 4 },
    mosaicking: "ORBIT"
  };
}

function colorBlend(value, min, max, colorMin, colorMax) {
  var factor = (value - min) / (max - min);
  factor = Math.max(0, Math.min(1, factor));
  return colorMin.map((c, i) => c + factor * (colorMax[i] - c));
}

function evaluatePixel(samples) {
  var sumBSI = 0, sumNDVI = 0, sumNIR = 0;
  var count = 0;

  for (var i = 0; i < samples.length; i++) {
    var s = samples[i];
    // SCL Filter: Vegetation, Soil, Water, Unclassified
    if (s.dataMask === 1 && (s.SCL === 4 || s.SCL === 5 || s.SCL === 6 || s.SCL === 7)) {
      var blue = s.B02 / 10000;
      var red = s.B04 / 10000;
      var nir = s.B08 / 10000;
      var swir = s.B11 / 10000;

      var bsi = ((swir + red) - (nir + blue)) / ((swir + red) + (nir + blue));
      var ndvi = (nir - red) / (nir + red);

      sumBSI += bsi;
      sumNDVI += ndvi;
      sumNIR += nir;
      count++;
    }
  }

  if (count === 0) return [0, 0, 0, 0];

  var mBSI = sumBSI / count;
  var mNDVI = sumNDVI / count;
  var mNIR = sumNIR / count;

  // 1. Water Mask
  if (mNIR < WATER_CUTOFF) return [0, 0.05, 0.2, 1];

  var rgb = [0, 0, 0];

  // 2. Visualization Logic
  if (mNDVI > THRESH_VEG) {
    // Healthy Green: Maps NDVI range to Green
    rgb = colorBlend(mNDVI, THRESH_VEG, 0.8, [0.2, 0.5, 0.2], [0, 1, 0]);
  } else if (mBSI < THRESH_SOIL) {
    // Stubble/Dry Crops: High NDVI but low BSI. Maps to Blue.
    rgb = colorBlend(mBSI, -0.1, THRESH_SOIL, [0, 0.8, 0.8], [0, 0, 1]);
  } else {
    // Bare Soil: High BSI. Maps to Red.
    rgb = colorBlend(mBSI, THRESH_SOIL, 0.3, [0, 0, 1], [1, 0, 0]);
  }

  return [...rgb, 1];
}
