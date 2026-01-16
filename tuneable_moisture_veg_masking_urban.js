//VERSION = 3
// a version of the vegetation wetness index for urban drought mapping: masking vegetation based on kNDVI and calculating moisture index for it, with tuneable min/max for visualization. Generated with AI
// Filter 1: kNDVI > 0.15 (Vegetation only)
// Filter 2: NDWI < 0.1 (Remove water/fountains)
// Visualization: Tunable Moisture Index (B8A, B11)

// --- USER PARAMETERS ---
// Adjust these to "stretch" the color ramp
const MIN_MSI = -0.1; 
const MAX_MSI = 0.5;
// -----------------------

function setup() {
  return {
    input: ["B03", "B04", "B08", "B8A", "B11", "dataMask"],
    output: { bands: 4 }
  };
}

// Standard Moisture Palette
const msi_ramp = [
  [MIN_MSI, [0.5, 0, 0]],                      // Dry (Red)
  [MIN_MSI + (MAX_MSI - MIN_MSI) * 0.5, [1, 1, 0]], // Mid (Yellow)
  [MAX_MSI, [0, 0, 0.5]]                       // Wet (Blue)
];

const visualizer = new ColorRampVisualizer(msi_ramp);

function evaluatePixel(sample) {
  // 1. Calculate kNDVI (Vegetation Mask)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let kndvi = Math.tanh(Math.pow(ndvi, 2));
  
  // 2. Calculate NDWI (Water Mask: Green - NIR)
  // Water typically has NDWI > 0.2
  let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  
  // 3. Calculate Moisture Index (B8A, B11)
  let msi = (sample.B8A - sample.B11) / (sample.B8A + sample.B11);
  
  // 4. Apply the Visualization
  let imgVals = visualizer.process(msi);
  
  // 5. Combined Mask Logic
  // Keep pixel ONLY if it is green enough AND not standing water
  let isVegetation = kndvi > 0.15;
  let isNotWater = ndwi < 0.1; 
  
  let alpha = (isVegetation && isNotWater) ? sample.dataMask : 0;
  
  return [imgVals[0], imgVals[1], imgVals[2], alpha];
}
