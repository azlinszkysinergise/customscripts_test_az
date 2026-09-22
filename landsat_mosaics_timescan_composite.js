//VERSION=3

// ==========================================
// VISUALIZATION PARAMETERS 
// ==========================================
const NDBI_MIN = -0.3;  
const NDBI_MAX = 0.15;  

const NDVI_MIN = 0.1;   
const NDVI_MAX = 0.8;

const MNDWI_MIN = -0.5; 
const MNDWI_MAX = 0.3;  

// ==========================================
// SNOW DETECTION PARAMETERS
// ==========================================
const NDSI_THRESHOLD = 0.4;         // Identical to MNDWI, high for both snow and water
const GREEN_BRIGHT_THRESH = 0.3;    // Snow is bright (>0.3), water is dark (<0.15)

function setup() {
    return {
        input: ["B02", "B03", "B04", "B05", "dataMask"],
        output: { bands: 3 },
        mosaicking: "ORBIT"
    };
}

function evaluatePixel(samples) {
    let max_NDBI = -1.0;
    let max_NDVI = -1.0;
    let sum_MNDWI = 0.0;
    let valid_count = 0;
    
    // Track snow occurrences
    let snow_score = 0;

    for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        if (sample.dataMask === 1) {
            let ndvi = (sample.B04 - sample.B03) / (sample.B04 + sample.B03);
            let ndbi = (sample.B05 - sample.B04) / (sample.B05 + sample.B04);
            let mndwi = (sample.B02 - sample.B05) / (sample.B02 + sample.B05); // Serves as both MNDWI and NDSI

            if (ndvi > max_NDVI) max_NDVI = ndvi;
            if (ndbi > max_NDBI) max_NDBI = ndbi;
            
            sum_MNDWI += mndwi;
            
            // SNOW CHECK: High NDSI index AND high visible brightness
            if (mndwi > NDSI_THRESHOLD && sample.B02 > GREEN_BRIGHT_THRESH) {
                snow_score++;
            }
            
            valid_count++;
        }
    }

    if (valid_count === 0) {
        return [0, 0, 0];
    }

    let mean_MNDWI = sum_MNDWI / valid_count;

    let r = Math.max(0, Math.min(1, (max_NDBI - NDBI_MIN) / (NDBI_MAX - NDBI_MIN)));
    let g = Math.max(0, Math.min(1, (max_NDVI - NDVI_MIN) / (NDVI_MAX - NDVI_MIN)));
    let b = Math.max(0, Math.min(1, (mean_MNDWI - MNDWI_MIN) / (MNDWI_MAX - MNDWI_MIN)));

    // SNOW BOOST: Push pixel toward white based on how often it was snowy
    if (snow_score > 0) {
        let snow_ratio = snow_score / valid_count; 
        
        // Blend current colors toward 1.0 (pure white) proportionally to snow presence
        r = r + (1.0 - r) * snow_ratio;
        g = g + (1.0 - g) * snow_ratio;
        b = b + (1.0 - b) * snow_ratio;
    }

    return [r, g, b];
}
