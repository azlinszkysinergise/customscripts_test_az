//VERSION=3
// an RGB composite visualization that emulates DLR Landsat Timescan based on CDSE/OpenGeoHub Landsat bimonthly composites for the vegetation season
//made by Google Gemini and @äzlinszky.bsky.social
//see this paper for the original calculation of LandSat TImescan https://www.dlr.de/en/eoc/latest/news/2017/500-terabyte-tb-compressed-into-one-image-big-data-in-earth-observation
// =========================================
// HOW TO USE
// 1. Select the Complementary Data/Landsat Mosaics layer
// 2. Set March 1 of your target year as the start date and 1 July as your end date - in fact this will cover the vegetation season from March to end of August. You can also use 1 May to 1 September - the 180 day limit of Copernicus Browser is the constraint
// 3. Paste the script into the custom script code window
// ==========================================
// ADJUSTED VISUALIZATION PARAMETERS 
// Tuned for smoothed bimonthly composites
// ==========================================
const NDBI_MIN = -0.3;  // Lowered to catch smoothed bare-soil floors
const NDBI_MAX = 0.15;  // Drastically lowered to amplify the Red channel

const NDVI_MIN = 0.1;   // Raised slightly to filter background noise
const NDVI_MAX = 0.8;

const MNDWI_MIN = -0.5; 
const MNDWI_MAX = 0.3;  // Note: mostly irrelevant here due to the water mask
// ==========================================
function setup() {
    return {
        // Requesting Green (B02), Red (B03), NIR (B04), SWIR1 (B05) and the valid data mask
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

    // Loop through the time series array (e.g., 6 scenes for a year)
    for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        // Only process pixels with valid data
        if (sample.dataMask === 1) {
            // Calculate indices
            let ndvi = (sample.B04 - sample.B03) / (sample.B04 + sample.B03);
            let ndbi = (sample.B05 - sample.B04) / (sample.B05 + sample.B04);
            let mndwi = (sample.B02 - sample.B05) / (sample.B02 + sample.B05);

            // Update maximums
            if (ndvi > max_NDVI) max_NDVI = ndvi;
            if (ndbi > max_NDBI) max_NDBI = ndbi;
            
            // Add to sum for mean calculation
            sum_MNDWI += mndwi;
            valid_count++;
        }
    }

    // If no valid data is found for this pixel over the entire period, render it black
    if (valid_count === 0) {
        return [0, 0, 0];
    }

    // Calculate mean of MNDWI
    let mean_MNDWI = sum_MNDWI / valid_count;

    // Data Stretch (Contrast adjustment) using the parameters defined at the top
    let r = Math.max(0, Math.min(1, (max_NDBI - NDBI_MIN) / (NDBI_MAX - NDBI_MIN)));
    let g = Math.max(0, Math.min(1, (max_NDVI - NDVI_MIN) / (NDVI_MAX - NDVI_MIN)));
    let b = Math.max(0, Math.min(1, (mean_MNDWI - MNDWI_MIN) / (MNDWI_MAX - MNDWI_MIN)));

    return [r, g, b];
}
