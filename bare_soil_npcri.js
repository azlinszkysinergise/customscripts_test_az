// ///////////////////////////////////////////////////////////////////
// CDSE Sentinel-2 Multi-Temporal NPCRI Mean Script
// Optimized for: Hungary 2025 Drought / Soil Monitoring
// Features: SCL Cloud Masking & User-Adjustable Thresholds
// By András Zlinszky, Sinergise (@azlinszky.bsky.social) and Gemini
// ///////////////////////////////////////////////////////////////////

// --- USER ADJUSTABLE PARAMETERS ---
var THRESH_FOREST = 0.02;  // Below this is healthy Green
var THRESH_DRY    = 0.12;  // Between Forest and this is Blue (Stubble/Dry)
var THRESH_SOIL   = 0.35;  // Up to this is Red (Bare Soil) - tune this using NIR false color
var NIR_WATER_CUTOFF = 0.05; // Masking dark water/shadows
// ----------------------------------

function setup() {
  return {
    input: [{
      bands: ["B02", "B04", "B08", "SCL", "dataMask"],
      units: "DN"
    }],
    output: { bands: 4 },
    mosaicking: "ORBIT" // Necessary for multi-temporal processing
  };
}

function colorBlend(value, min, max, colorMin, colorMax) {
  var factor = (value - min) / (max - min);
  factor = Math.max(0, Math.min(1, factor));
  return colorMin.map((c, i) => c + factor * (colorMax[i] - c));
}

function evaluatePixel(samples) {
  var sumNPCRI = 0;
  var count = 0;
  var validDataMask = 0;

  for (var i = 0; i < samples.length; i++) {
    var s = samples[i];
    
    // SCL Filtering: 
    // Keep: 4 (Vegetation), 5 (Bare Soil), 6 (Water)
    // Discard: 1 (Saturated), 3 (Shadows), 8, 9, 10 (Clouds/Haze)
    if (s.dataMask === 1 && (s.SCL === 4 || s.SCL === 5 || s.SCL === 6)) {
      var red = s.B04 / 10000;
      var blue = s.B02 / 10000;
      var nir = s.B08 / 10000;

      // Basic noise filter (NIR check for deep shadows/water)
      if (nir > NIR_WATER_CUTOFF) {
        var val = (red - blue) / (red + blue);
        sumNPCRI += val;
        count++;
        validDataMask = 1;
      }
    }
  }

  // If no valid cloud-free pixels were found, return transparent/black
  if (count === 0) return [0, 0, 0, 0];

  var meanNPCRI = sumNPCRI / count;
  var rgb = [0, 0, 0];

  // Visual Palette Logic using User Variables
  if (meanNPCRI <= THRESH_FOREST) {
    rgb = colorBlend(meanNPCRI, -0.1, THRESH_FOREST, [0, 0.4, 0], [0.1, 0.8, 0.1]);
  } else if (meanNPCRI <= THRESH_DRY) {
    rgb = colorBlend(meanNPCRI, THRESH_FOREST, THRESH_DRY, [0.1, 0.8, 0.1], [0.2, 0.4, 1]);
  } else {
    rgb = colorBlend(meanNPCRI, THRESH_DRY, THRESH_SOIL, [0.2, 0.4, 1], [0.9, 0.1, 0.1]);
  }

  return [...rgb, validDataMask];
}
