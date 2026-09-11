//VERSION=3

// --- CHANGE THRESHOLDS (Relative difference between time 1 and time 2) ---
const dbThresholdVV = 3.5; 
const dbThresholdVH = 2.5; 

// --- AGRICULTURAL FILTERS (Applied to the 'after' image: S1_MOSAIC_2) ---
const minAbsoluteVV_2 = -4.0; 
const minGapVV_VH_2 = 3.5; 

// --- OUTPUT DISPLAY SETTINGS ---
// Opacity for pixels with NO structural change (0.0 = fully transparent)
const zeroMapOpacity = 0.0; 
// Opacity for pixels WITH structural change (0.5 = 50% transparent)
const mapOpacity = 0.5; 

// --- USER-TUNABLE PALETTE ---
const colorRamp = [
  [0.0, 0x000000],  // Black for background / no change
  [0.4, 0x555555],  // Dark grey for minor/noisy changes
  [0.7, 0xFFA500],  // Orange for potential new structures
  [1.0, 0xFF0000]   // Red for major new buildings/harbours
];

const visualizer = new ColorRampVisualizer(colorRamp);

function setup() {
    return {
        input: [
            {datasource: "S1_MOSAIC_1", bands: ["VV", "VH", "dataMask"]},
            {datasource: "S1_MOSAIC_2", bands: ["VV", "VH", "dataMask"]}
        ],
        output: [
            {id: "default", bands: 4}, 
            {id: "index", bands: 1, sampleType: "FLOAT32"} 
        ]
    };
}

function toDb(linear) {
    let safeLinear = Math.max(linear, 1e-10);
    return 10 * Math.log(safeLinear) / Math.LN10;
}

function evaluatePixel(samples) {
    let s1 = samples.S1_MOSAIC_1[0];
    let s2 = samples.S1_MOSAIC_2[0];

    // If there is no data in either mosaic for this pixel, output transparent
    if (s1.dataMask === 0 || s2.dataMask === 0) {
        return { default: [0, 0, 0, 0], index: [0] };
    }

    // Convert linear values to dB
    let vv_1 = toDb(s1.VV);
    let vh_1 = toDb(s1.VH);
    let vv_2 = toDb(s2.VV);
    let vh_2 = toDb(s2.VH);

    // Calculate differences between the two time periods
    let diffVV = vv_2 - vv_1;
    let diffVH = vh_2 - vh_1;
    
    // Calculate the polarization gap in the 'after' image
    let gapVV_VH_2 = vv_2 - vh_2;

    let index = 0;
    
    // THE LOGIC GATE:
    if (diffVV > 0 && diffVH > 0 && vv_2 > minAbsoluteVV_2 && gapVV_VH_2 > minGapVV_VH_2) {
        let scoreVV = Math.min(diffVV / dbThresholdVV, 1.0);
        let scoreVH = Math.min(diffVH / dbThresholdVH, 1.0);
        
        index = scoreVV * scoreVH; 
    }

    let rgb = visualizer.process(index);
    
    // Choose opacity based on whether change was detected
    let currentOpacity = (index === 0) ? zeroMapOpacity : mapOpacity;

    // Apply the mapped RGB color and the calculated opacity
    return {
        default: [rgb[0], rgb[1], rgb[2], currentOpacity], 
        index: [index]                          
    };
}
