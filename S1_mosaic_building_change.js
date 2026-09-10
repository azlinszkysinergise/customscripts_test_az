//VERSION=3

// --- CHANGE THRESHOLDS (Relative difference between years) ---
const dbThresholdVV = 3.5; 
const dbThresholdVH = 2.5; 

// --- AGRICULTURAL FILTERS (Applied to the 2026 image) ---
// 1. Absolute Brightness Gate: Crops rarely exceed -5 dB. Buildings easily exceed -3 dB.
const minAbsoluteVV_26 = -4.0; 

// 2. Polarization Ratio Filter: VV must be significantly higher than VH (in dB).
// Crops depolarize the signal, bringing VH closer to VV (gap < 3 dB). 
// Buildings maintain a strong VV dominance (gap > 3 to 5 dB).
const minGapVV_VH_26 = 3.5; 

// --- USER-TUNABLE PALETTE ---
const colorRamp = [
  [0.0, 0x000000],  
  [0.4, 0x555555],  
  [0.7, 0xFFA500],  
  [1.0, 0xFF0000]   
];

const visualizer = new ColorRampVisualizer(colorRamp);

function setup() {
    return {
        input: [
            {datasource: "MOSAIC_2015", bands: ["VV", "VH", "dataMask"]},
            {datasource: "MOSAIC_2026", bands: ["VV", "VH", "dataMask"]}
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
    let s15 = samples.MOSAIC_2015[0];
    let s26 = samples.MOSAIC_2026[0];

    if (s15.dataMask === 0 || s26.dataMask === 0) {
        return { default: [0, 0, 0, 0], index: [0] };
    }

    let vv_15 = toDb(s15.VV);
    let vh_15 = toDb(s15.VH);
    let vv_26 = toDb(s26.VV);
    let vh_26 = toDb(s26.VH);

    let diffVV = vv_26 - vv_15;
    let diffVH = vh_26 - vh_15;
    
    let gapVV_VH_26 = vv_26 - vh_26;

    let index = 0;
    
    // THE LOGIC GATE:
    // 1. Did both VV and VH increase? (Structural change)
    // 2. Is the new structure objectively bright? (Kills crop changes)
    // 3. Is VV strongly dominant over VH? (Kills dense volume scattering)
    if (diffVV > 0 && diffVH > 0 && vv_26 > minAbsoluteVV_26 && gapVV_VH_26 > minGapVV_VH_26) {
        
        let scoreVV = Math.min(diffVV / dbThresholdVV, 1.0);
        let scoreVH = Math.min(diffVH / dbThresholdVH, 1.0);
        
        index = scoreVV * scoreVH; 
    }

    let rgb = visualizer.process(index);

    return {
        default: [rgb[0], rgb[1], rgb[2], 1.0], 
        index: [index]                          
    };
}
