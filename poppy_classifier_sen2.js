//VERSION=3
// Poppy Field Classifier: High-Contrast Panchromatic Edition

// --- TUNING VARIABLES ---
// 1. Poppy Strictness (Higher = less red, Lower = more red)
const redThreshold = 1.45; 

// 2. Background Contrast Control (Dynamic Range)
// Any panchromatic value below 'blackPoint' becomes pure black. 
// Any value above 'whitePoint' becomes pure white.
const blackPoint = 0.06;  // Increase this to make shadows darker (e.g., 0.08)
const whitePoint = 0.28;  // Decrease this to make highlights brighter (e.g., 0.38)

function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "dataMask"],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  // 1. Calculate NDVI (Vegetation Index)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // 2. Color classification to target the distinct red poppy blooms
  let redOverGreen = sample.B04 > (sample.B03 * redThreshold);
  let redOverBlue  = sample.B04 > (sample.B02 * (redThreshold + 0.1));
  let isRedDominant = redOverGreen && redOverBlue;
  let isBrightEnough = sample.B04 > 0.10;
  
  // 3. Determine pixel output
  if (ndvi > 0.10 && ndvi < 0.60 && isRedDominant && isBrightEnough) {
    // Official Remembrance Red for poppies
    return [0.80, 0.11, 0.14, sample.dataMask]; 
  } else {
    // 4. Calculate Panchromatic base value (Average of RGB + NIR)
    let pan = (sample.B02 + sample.B03 + sample.B04 + sample.B08) / 4;
    
    // 5. Linear Contrast Stretch (Expanding the Dynamic Range)
    // Formula scales the values between our black and white points to the full 0.0 - 1.0 range
    let contrastBg = (pan - blackPoint) / (whitePoint - blackPoint);
    
    // Clamp the values so they stay strictly within valid color bounds [0.0, 1.0]
    let finalBg = Math.max(0.0, Math.min(contrastBg, 1.0));
    
    return [finalBg, finalBg, finalBg, sample.dataMask];
  }
}
