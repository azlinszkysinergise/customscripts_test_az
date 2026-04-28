//VERSION=3
// Multi-Temporal S2 & DEM Fusion for Hydrothermal Alteration Mapping

// =======================================================================
// --- TUNING CONSTANTS HEADER ---
// =======================================================================

// 1. RGB Histogram Stretches (Calibrated for Hamash District)
const RED_MIN = 1.90;   // Iron Oxides (B04/B02)
const RED_MAX = 2.20;
const GREEN_MIN = 1.13; // Clay Minerals (B11/B12)
const GREEN_MAX = 1.25;
const BLUE_MIN = 1.25;  // Ferrous Iron (B12/B08)
const BLUE_MAX = 1.50;

// 2. Elevation Visualisation Settings
const DEM_MIN = 300;    // Lowest expected elevation (meters)
const DEM_MAX = 800;    // Highest expected elevation (meters)
const DEM_BASE_BRIGHTNESS = 0.4; // Shadow floor for 3D blending

// =======================================================================

function setup() {
    return {
        input: [
            { 
                datasource: "S2L2A", 
                bands: ["B02", "B04", "B08", "B11", "B12", "SCL", "dataMask"], 
                mosaicking: "ORBIT" 
            },
            { 
                datasource: "DEM", 
                bands: ["DEM", "dataMask"], 
                mosaicking: "SIMPLE" 
            }
        ],
        output: [
            { id: "default", bands: 3, sampleType: "AUTO" },         
            { id: "index", bands: 1, sampleType: "FLOAT32" },        
            { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" }
        ]
    };
}

function stretch(val, min, max) {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function evaluatePixel(samples) {
    let s2Samples = samples.S2L2A;
    
    // Safety check for DEM data
    if (!samples.DEM || samples.DEM.length === 0) {
         return { default: [0, 0, 0], index: [0], eobrowserStats: [0, 0] };
    }
    let demSample = samples.DEM[0]; 

    // 1. Cloud Filtering & Temporal Aggregation
    let sumB02 = 0, sumB04 = 0, sumB08 = 0, sumB11 = 0, sumB12 = 0;
    let validCount = 0;

    for (let i = 0; i < s2Samples.length; i++) {
        let sample = s2Samples[i];
        
        // SCL Classes for clear ground: 4 (Vegetation), 5 (Bare soils), 7 (Unclassified/Rocks)
        if (sample.dataMask === 1 && [4, 5, 7].includes(sample.SCL)) {
            sumB02 += sample.B02;
            sumB04 += sample.B04;
            sumB08 += sample.B08;
            sumB11 += sample.B11;
            sumB12 += sample.B12;
            validCount++;
        }
    }

    let isValid = (validCount > 0 && demSample.dataMask === 1) ? 1 : 0;
    if (!isValid) {
        return { default: [0, 0, 0], index: [0], eobrowserStats: [0, 0] };
    }

    let meanB02 = sumB02 / validCount;
    let meanB04 = sumB04 / validCount;
    let meanB08 = sumB08 / validCount;
    let meanB11 = sumB11 / validCount;
    let meanB12 = sumB12 / validCount;

    // 2. Spectral Indices
    let ironOxide = meanB04 / (meanB02 + 0.0001);
    let clay = meanB11 / (meanB12 + 0.0001);
    let ferrousIron = meanB12 / (meanB08 + 0.0001);

    // 3. Apply Threshold Stretches
    let r = stretch(ironOxide, RED_MIN, RED_MAX);
    let g = stretch(clay, GREEN_MIN, GREEN_MAX);
    let b = stretch(ferrousIron, BLUE_MIN, BLUE_MAX);

    // 4. The "Gold Target" Probability Index
    let probability = r * g;

    // 5. DEM Topographic Background Blending
    let demStretch = stretch(demSample.DEM, DEM_MIN, DEM_MAX);
    
    // Create the 3D lighting multiplier
    let topoShade = DEM_BASE_BRIGHTNESS + ((1.0 - DEM_BASE_BRIGHTNESS) * demStretch);

    // Create a faint grayscale background for the "boring" rock
    let bgGray = topoShade * 0.3; 

    // Apply the 3D shading to our colored anomalies
    let anomalyR = r * topoShade;
    let anomalyG = g * topoShade;
    let anomalyB = b * topoShade;

    // BLEND: Overlay the bright anomalies onto the grayscale background
    r = Math.max(bgGray, anomalyR);
    g = Math.max(bgGray, anomalyG);
    b = Math.max(bgGray, anomalyB);

    return {
        default: [r, g, b],
        index: [probability],
        eobrowserStats: [probability, isValid]
    };
}
