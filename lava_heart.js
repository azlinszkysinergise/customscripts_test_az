//VERSION=3
// Fusion Script: Tonemapped Natural Color (Landscape) + SWIR Heart (Active Fire)
// Based on scripts by Pierre Markuse and Sentinel Hub
// Hot areas get SWIR composite, cold areas get tonemapped natural color
// developed on Saunder's Island, South Sandwich

function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "B8A", "B11", "B12"],
    output: { bands: 3 }
  };
}

// --- PART 1: TONEMAPPED NATURAL COLOR HELPERS ---
var tonemapMethod = 4; // ACES Uncharted
var adjForSunColor = true;
var atmosphere = 0.025;
var gain = 1.5;
var saturation = 1.2;
var White = 2.5;

function Adj(a, b, c, d, e) {
  return (a * e + b * d + c * (1 - e - d));
}

function satEnh(rgb) {
  var avg = rgb.reduce((a, b) => a + b, 0) / rgb.length;
  return rgb.map(a => avg * (1 - saturation) + a * saturation);
}

function atm(col) {
  return col.map(a => a - atmosphere);
}

function sRGBCurve(C) {
  return C < 0.0031308 ? (12.92 * C) : (1.055 * Math.pow(C, 0.41666) - 0.055);
}

function Uncharted2FilmicCurve(x) {
  var A = 0.15;
  var B = 0.50;
  var C = 0.10;
  var D = 0.20;
  var E = 0.02;
  var F = 0.30;
  var W = White;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

function tonemap(col) {
  // ACES Uncharted Tone Mapping
  var whiteScale = 1.0 / Uncharted2FilmicCurve(White);
  return col.map(x => Uncharted2FilmicCurve(x) * whiteScale);
}

// --- PART 2: MAIN EVALUATION ---
function evaluatePixel(sample) {
  // 1. Prepare Inputs
  // Pierre Markuse Fire Logic usually works on raw values, but for display we multiply
  let b02 = sample.B02;
  let b03 = sample.B03;
  let b04 = sample.B04;
  let b8a = sample.B8A;
  let b11 = sample.B11;
  let b12 = sample.B12;

  // 2. DETECT FIRE (Pierre Markuse Logic)
  // Standard PM Fire uses a threshold on the sum of SWIR bands
  // Adjust sensitivity here if needed (1.0 is standard)
  const hsThreshold = 0.3; 
  const hsSensitivity = 1.0; // Slightly more sensitive for small lava lakes
  let isFire = (b12 + b11) > (hsThreshold / hsSensitivity);

  // 3. RENDER FIRE (SWIR Composite)
  // If fire is detected, return the raw SWIR mix (Red/Pink Glow)
  if (isFire) {
    // Multiply by 2.5 to boost the glow intensity, similar to standard SWIR scripts
    return [b12 * 2.5, b8a * 2.5, b04 * 2.5]; 
  }

  // 4. RENDER LANDSCAPE (Tonemapped Natural Color)
  // If no fire, run the full Tonemapping pipeline
  
  // Natural Color Base
  let col = [b04, b03, b02];
  
  // Atmospheric Correction
  col = atm(col);
  
  // Solar Irradiance Adjustment (optional but recommended for authenticity)
  if (adjForSunColor) {
    // Simple adjustment to correct for the sun's color temperature
    col = [col[0], col[1] * 0.939, col[2] * 0.779];
  }
  
  // Apply Gain
  col = col.map(a => a * gain);
  
  // Saturation Enhancement
  col = satEnh(col);
  
  // Tone Mapping (Uncharted 2)
  col = tonemap(col);
  
  // sRGB Conversion (Gamma Correction)
  col = col.map(sRGBCurve);

  return col;
}
