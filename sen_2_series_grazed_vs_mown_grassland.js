//VERSION=3
/* 
Grassland Management Detection (Mown vs. Grazed) 
Analyzes a 5-month time series to detect grasslands and separate mown from grazed 
based on sudden drops in NDVI. 
Includes a check to exclude arable land (crops) by detecting bare soil events.
*/
//by @azlinszky.bsky.social and Google Gemini
// --- Tuneable Parameters ---
// Grassland identification thresholds
const minMaxNdviGrassland = 0.5;   // Must reach at least this NDVI to be considered grassland
const minMeanNdviGrassland = 0.25; // Must have at least this average NDVI
const maxMeanNdviGrassland = 0.75; // Exclude very stable high-NDVI areas (e.g., dense forests)

// Bare soil detection (to exclude arable crop fields)
const maxNdviBareSoil = 0.20;      // If NDVI drops below this at any point, it's likely a plowed field (bare soil)

// Drop thresholds for classification (difference in NDVI between consecutive clear observations)
const grazeDropThreshold = 0.10; // Drops below this are likely continuous grazing or natural phenology
const mownDropThreshold = 0.30;  // Drops above this are highly likely to be mowing events

// Output Colors
const colorGrazed = [0.5, 1.0, 0.5]; // Light Green
const colorMown = [0.0, 0.5, 0.0];   // Dark Green

function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "SCL", "dataMask"],
    output: [
      { id: "default", bands: 3 },
      { id: "index", bands: 1, sampleType: "FLOAT32" }
    ],
    mosaicking: "ORBIT" // Multi-temporal processing
  };
}

function preProcessScenes(collections) {
  // Filter scenes to include only the last 5 months (approx 150 days)
  collections.scenes.orbits = collections.scenes.orbits.filter(function (orbit) {
    var orbitDateFrom = new Date(orbit.dateFrom);
    return (
      orbitDateFrom.getTime() >= collections.to.getTime() - 5 * 30 * 24 * 3600 * 1000
    );
  });
  return collections;
}

function evaluatePixel(samples, scenes) {
  let clearObs = [];
  let latestRGB = [0, 0, 0];
  let foundLatestRGB = false;

  // Iterate backwards so clearObs is ordered chronologically (oldest to newest)
  for (let i = samples.length - 1; i >= 0; i--) {
    let s = samples[i];
    
    // Grab the most recent valid pixel for true color fallback
    if (s.dataMask === 1 && !foundLatestRGB) {
      latestRGB = [s.B04 * 2.5, s.B03 * 2.5, s.B02 * 2.5];
    }
    
    // Filter out clouds, cloud shadows, snow, and missing data using SCL
    // Valid land classes: 4 (Vegetation), 5 (Bare Soils), 7 (Unclassified)
    if (s.dataMask === 1 && [4, 5, 7].includes(s.SCL)) {
      let denom = s.B08 + s.B04;
      let ndvi = denom !== 0 ? (s.B08 - s.B04) / denom : 0;
      
      clearObs.push({ ndvi: ndvi, scl: s.SCL });
    }
  }

  // If not enough clear observations, fallback to true color (non-grassland)
  if (clearObs.length < 3) {
    return {
      default: latestRGB,
      index: [NaN]
    };
  }

  let maxNDVI = -1;
  let meanNDVI = 0;
  let maxDrop = 0;
  let hasBareSoil = false;

  for (let j = 0; j < clearObs.length; j++) {
    let currentNdvi = clearObs[j].ndvi;
    let currentScl = clearObs[j].scl;
    
    // Track max and mean NDVI for grassland masking
    if (currentNdvi > maxNDVI) maxNDVI = currentNdvi;
    meanNDVI += currentNdvi;

    // Check for bare soil (arable land exclusion)
    // SCL 5 is bare soil, or we can use the NDVI threshold
    if (currentScl === 5 || currentNdvi < maxNdviBareSoil) {
      hasBareSoil = true;
    }

    // Calculate drop from the previous observation (Older NDVI - Newer NDVI)
    if (j > 0) {
      let drop = clearObs[j-1].ndvi - currentNdvi;
      if (drop > maxDrop) {
        maxDrop = drop;
      }
    }
  }
  
  meanNDVI /= clearObs.length;

  // 1. Identify Grassland
  // Must meet NDVI criteria AND not have any bare soil events (which indicate plowing/crops)
  let isGrassland = (maxNDVI > minMaxNdviGrassland) && 
                    (meanNDVI > minMeanNdviGrassland) && 
                    (meanNDVI < maxMeanNdviGrassland) && 
                    (!hasBareSoil);

  if (!isGrassland) {
    return {
      default: latestRGB, // True color for non-grassland (including crops)
      index: [NaN]
    };
  }

  // 2. Separate Mown vs Grazed based on the maximum NDVI drop
  // Certainty index: 0 (Grazed) to 1 (Mown)
  let certainty = (maxDrop - grazeDropThreshold) / (mownDropThreshold - grazeDropThreshold);
  certainty = Math.max(0, Math.min(1, certainty)); // Clamp between 0 and 1

  let outRGB;
  if (certainty > 0.5) {
    // Classified as Mown (closer to 1.0)
    outRGB = colorMown;
  } else {
    // Classified as Grazed (closer to 0.0)
    outRGB = colorGrazed;
  }

  return {
    default: outRGB,
    index: [certainty]
  };
}
