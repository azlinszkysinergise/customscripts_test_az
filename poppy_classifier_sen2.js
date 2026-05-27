//VERSION=3
// Poppy Field Classifier with Panchromatic (RGB + NIR) Grayscale Background
// Based on the Sentinel-2 Simple Panchromatic script by András Zlinszky

// --- TUNING VARIABLE ---
// Increase this value to make the script MORE strict (fewer fields highlighted in red).
// Decrease it if known poppy fields are failing to appear red.
// Try increments of 0.05 (e.g., 1.30, 1.35, 1.40).
const redThreshold = 1.47; 

function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "dataMask"],
    output: { bands: 4 } // 4 bands to handle the alpha transparency layer (dataMask)
  };
}

function evaluatePixel(sample) {
  // 1. Calculate NDVI to check for active, live vegetation
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // 2. Color classification to target the distinct red poppy blooms
  let redOverGreen = sample.B04 > (sample.B03 * redThreshold);
  let redOverBlue  = sample.B04 > (sample.B02 * (redThreshold + 0.1));
  let isRedDominant = redOverGreen && redOverBlue;
  
  // 3. Brightness cutoff to reject dark fields, shadows, or deep water
  let isBrightEnough = sample.B04 > 0.10;
  
  // 4. Determine pixel output
  // True blooming poppy fields have a moderate NDVI because the heavy density 
  // of red petals lowers the typical "pure green" signature.
  if (ndvi > 0.10 && ndvi < 0.60 && isRedDominant && isBrightEnough) {
    // Return bright pure RED for identified poppy fields [R, G, B, Alpha]
    return [1.0, 0.0, 0.0, sample.dataMask]; 
  } else {
    // Create a Panchromatic grayscale value by averaging Visible (R,G,B) and Near-Infrared (B08)
    let pan = (sample.B02 + sample.B03 + sample.B04 + sample.B08) / 4;
    
    // Optional gain factor to prevent the panchromatic image from looking too dark
    let gain = 2.0; 
    let bg = Math.min(pan * gain, 1.0);
    
    // Return the Panchromatic Grayscale background [R, G, B, Alpha]
    return [bg, bg, bg, sample.dataMask];
  }
}
