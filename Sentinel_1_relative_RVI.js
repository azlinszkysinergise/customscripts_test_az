//VERSION=3
//calculates relative radar vegetation index, with the last two orbits of the same configuration as a baseline. Removes pixels with very low values (rain artefact). Blue means growth, orange means harvest. 
//made by @azlinszky.bsky.social and Gemini pro. Use with caution
//Set time interval in Copernicus Browser or the API request to 30 days, ending at your target date.
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: [
      { id: "default", bands: 4, sampleType: "AUTO" },          // RGBA visual map (Relative RVI)
      { id: "index", bands: 1, sampleType: "FLOAT32" },         // Histogram (Absolute RVI)
      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },// Line chart (Absolute RVI)
      { id: "dataMask", bands: 1, sampleType: "AUTO" }          // Keeps single scenes valid for stats
    ],
    mosaicking: "ORBIT"
  };
}

// Helper: Extract Relative Orbit Number (1-175) from Sentinel-1 Product ID
function getRelativeOrbit(productId) {
  if (!productId) return null;
  var parts = productId.split("_");
  var sat = parts[0]; 
  var absOrbit = parseInt(parts[6], 10);
  if (isNaN(absOrbit)) return null;
  
  var offset = (sat === "S1A") ? 73 : 27;
  return ((absOrbit - offset) % 175) + 1;
}

// Helper: Calculate Sentinel-1 Dual-Pol RVI (in linear scale)
function calcRVI(vv, vh) {
  if (vv + vh === 0) return 0;
  return (4 * vh) / (vv + vh);
}

function preProcessScenes(collections) {
  var tiles = collections.scenes.tiles;
  if (!tiles || tiles.length < 1) return collections;

  // 1. Sort scenes newest to oldest
  tiles.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  // 2. Lock onto the latest scene's relative orbit and flight direction
  var latestTile = tiles[0];
  var targetOrbit = getRelativeOrbit(latestTile.sentinel1ProductId);
  var targetDirection = latestTile.orbitDirection;
  if (!targetOrbit) return collections;

  var sameOrbitTiles = tiles.filter(function(tile) {
    return getRelativeOrbit(tile.sentinel1ProductId) === targetOrbit &&
           tile.orbitDirection === targetDirection;
  });

  if (sameOrbitTiles.length < 2) {
    collections.scenes.tiles = [latestTile];
    return collections;
  }

  // 3. Find up to TWO baseline scenes between 10 and 40 days old
  var latestTime = new Date(latestTile.date).getTime();
  var baselineTiles = [];

  for (var i = 1; i < sameOrbitTiles.length; i++) {
    var ageMs = latestTime - new Date(sameOrbitTiles[i].date).getTime();
    var ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays >= 10 && ageDays <= 40) {
      baselineTiles.push(sameOrbitTiles[i]);
      if (baselineTiles.length === 2) break; // Stop once we have two baselines
    }
  }

  collections.scenes.tiles = [latestTile].concat(baselineTiles);
  return collections;
}

function evaluatePixel(samples) {
  // 1. Basic safety check: we need at least 1 valid sample for anything to render
  if (samples.length < 1 || samples[0].dataMask === 0) {
    return {
      default: [0, 0, 0, 0],
      index: [NaN],
      eobrowserStats: [NaN, 0],
      dataMask: [0]
    };
  }

  // 2. Calculate Absolute RVI for today's scene
  var latestRVI = calcRVI(samples[0].VV, samples[0].VH);

  // 3. OPTIONAL FLOOR FOR STATS:
  // If you want the time series chart to show bare soil emergence (0.15 -> 0.40),
  // we do NOT mask out latestRVI < 0.35 in dataMask. We pass it through!
  var statsValue = latestRVI;
  var isValidForStats = 1;

  // 4. MAP VISUALIZATION (Requires >= 2 scenes for Relative Change)
  var visualColor;

  if (samples.length < 2 || samples[1].dataMask === 0) {
    // If we only have 1 scene (or baseline is missing), render neutral gray on the map
    visualColor = [0.85, 0.85, 0.85, 1];
  } else if (latestRVI < 0.35) {
    // Bare soil floor for the visual map: paint dark slate gray
    visualColor = [0.25, 0.27, 0.30, 1];
  } else {
    // Calculate baseline average from available historical scenes
    var baselineRVI = calcRVI(samples[1].VV, samples[1].VH);
    if (samples.length >= 3 && samples[2].dataMask === 1) {
      var secondBaselineRVI = calcRVI(samples[2].VV, samples[2].VH);
      baselineRVI = (baselineRVI + secondBaselineRVI) / 2.0;
    }

    if (baselineRVI === 0) {
      visualColor = [0.25, 0.27, 0.30, 1];
    } else {
      var relChange = (latestRVI - baselineRVI) / baselineRVI;

      // Diverging palette with ±18% speckle dead zone
      if (relChange <= -0.28)      visualColor = [0.90, 0.45, 0.15, 1]; // Bright Amber (Harvest/Lodging)
      else if (relChange <= -0.18) visualColor = [0.95, 0.70, 0.40, 1]; // Soft Amber
      else if (relChange <= 0.18)  visualColor = [0.85, 0.85, 0.85, 1]; // Off-White / Gray (Dead Zone)
      else if (relChange <= 0.35)  visualColor = [0.28, 0.75, 0.85, 1]; // Soft Teal (Active Growth)
      else                         visualColor = [0.0, 0.45, 0.70, 1];  // Deep Blue-Teal (Rapid Bolting)
    }
  }

  // 5. Return Dual-Mode Outputs:
  // - default gets the multi-temporal visualColor
  // - eobrowserStats & index get the single-scene Absolute RVI (latestRVI)
  return {
    default: visualColor,
    index: [statsValue],
    eobrowserStats: [statsValue, 0],
    dataMask: [isValidForStats]
  };
}
