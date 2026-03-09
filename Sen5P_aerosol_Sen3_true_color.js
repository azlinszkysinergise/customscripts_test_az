//VERSION=3
// Joint visualisation of Sentinel-5P aerosol concentration and Sentinel-3 HIghlight Optimized Natural Color
// Visualisation designed by @aretsch.bsky.social
// Coded with Gemini

// --- USER ADJUSTABLE VARIABLES ---
// Adjust the transparency of the Sentinel-3 overlay (0.0 = completely transparent, 1.0 = completely solid)
var s3Opacity = 0.94; 
// ---------------------------------

var minVal = -1.0;
var maxVal = 5.0;
var viz = ColorRampVisualizer.createBlueRed(minVal, maxVal);

function setup() {
  return {
    input: [
      {
        // Ensure this alias matches your Copernicus Browser data fusion setup
        datasource: "S3OLCI",
        bands: ["B04", "B06", "B08", "dataMask"]
      },
      {
        // Ensure this alias matches your Copernicus Browser data fusion setup
        datasource: "S5PL2",
        bands: ["AER_AI_340_380", "dataMask"]
      }
    ],
    output: [
      {
        id: "default",
        bands: 4,
      },
      {
        id: "index",
        bands: 1,
        sampleType: "FLOAT32" 
      },
      {
        id: "eobrowserStats",
        bands: 1,
      },
      {
        id: "dataMask",
        bands: 1
      }
    ]
  };
}

// Helper function to safely calculate the Highlight Optimized math and prevent NaN errors
function calcColor(bandValue) {
    let val = 0.9 * bandValue - 0.055;
    return val > 0 ? Math.sqrt(val) : 0;
}

function evaluatePixel(samples) {
  var s3 = samples.S3OLCI[0];
  var s5 = samples.S5PL2[0];

  var s3_valid = s3.dataMask === 1;
  var s5_valid = s5.dataMask === 1;

  // Initialize empty defaults
  var out_r = 0, out_g = 0, out_b = 0, out_alpha = 0;
  var out_mask = 0;
  var out_index = NaN;
  var out_stats = NaN;

  // 1. Process S5P Aerosol Index if valid
  if (s5_valid) {
    const [r, g, b] = viz.process(s5.AER_AI_340_380);
    out_r = r;
    out_g = g;
    out_b = b;
    out_alpha = 1;
    out_mask = 1;
    
    // Retain stats for Copernicus Browser tools
    var statsVal = isFinite(s5.AER_AI_340_380) ? s5.AER_AI_340_380 : NaN;
    out_index = s5.AER_AI_340_380;
    out_stats = statsVal;
  }

  // 2. Process S3 OLCI if valid and blend it on top
  if (s3_valid) {
    var s3_r = calcColor(s3.B08);
    var s3_g = calcColor(s3.B06);
    var s3_b = calcColor(s3.B04);
    
    if (s5_valid) {
        // Both are present: Alpha blend S3 on top of S5
        out_r = s3_r * s3Opacity + out_r * (1 - s3Opacity);
        out_g = s3_g * s3Opacity + out_g * (1 - s3Opacity);
        out_b = s3_b * s3Opacity + out_b * (1 - s3Opacity);
    } else {
        // Only S3 is present: Display S3 normally
        out_r = s3_r;
        out_g = s3_g;
        out_b = s3_b;
        out_alpha = 1;
        out_mask = 1;
    }
  }

  return {
    default: [out_r, out_g, out_b, out_alpha],
    index: [out_index],
    eobrowserStats: [out_stats],
    dataMask: [out_mask]
  };
}
