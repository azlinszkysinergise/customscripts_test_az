// VERSION=3
// Data Fusion: Sentinel-1 Flood Detection over LCM-10 Land Cover (Dark/Alarming Palette)
//by András Zlinszky, Sinergise and Google Gemini @azlinszky.bsky.social
//how to use: 
// 1 - load CLMS 10-m land cover map
// 2 - click </> button to open custom script, select "Custom script" radio button
// 3 - click "use additional datasets"
// 4 - set data source alias for "BYOC" to "LCM10"
// 5 - click "+" button next to SI-GRD to add Sentinel-1 images
// 6 - tick the checkbox "customize timespan" and set to your period of interest (the duration of the flood)
// 7 - paste code below into sript window
// 8 - tune "isWater" parameter for water detection - if you raise it, you will get less water, if you lower it, you will get more.
 
function setup() {
  return {
    input: [
      {
        datasource: "S1GRD",
        bands: ["VV", "VH", "dataMask"],
        mosaicking: "ORBIT"
      },
      {
        datasource: "LCM10",
        bands: ["LCM10", "dataMask"]
      }
    ],
    output: [
      { id: "default", bands: 3, sampleType: "AUTO" }
    ]
  };
}

// User-provided LCM Classification Palette (Adjusted for a darker, somber tone)
const map = [
  [10, 0x006400], // Tree cover
  [20, 0xffbb22], // Shrubland
  [30, 0x8c5b2b], // Grassland (Changed from bright yellow to a muted, earthy brown-orange)
  [40, 0x3d1c52], // Cropland (Deep, dark purple)
  [50, 0x0096a0], // Herbaceous wetland
  [60, 0x00cf75], // Mangroves
  [70, 0xfae6a0], // Moss and lichen
  [80, 0xb4b4b4], // Bare/sparse vegetation
  [90, 0xfa0000], // Built-up (Stays bright red for stark contrast)
  [100, 0x0064c8], // Permanent water bodies
  [110, 0xf0f0f0], // Snow and ice
  [254, 0x0a0a0a], // Unclassifiable
];

// Helper to convert single hex integer to RGB array [0-1]
function hexToRgb(hex) {
  return [
    ((hex >> 16) & 0xff) / 255, 
    ((hex >> 8) & 0xff) / 255, 
    (hex & 0xff) / 255
  ];
}

// Build a dictionary for fast color lookups
const colorDict = {};
for (let i = 0; i < map.length; i++) {
  colorDict[map[i][0]] = hexToRgb(map[i][1]);
}

function evaluatePixel(samples) {
  const s1 = samples.S1GRD[0];
  const lcmSample = samples.LCM10[0];
  
  let vv = s1.VV;
  
  // S1 Water Detection Threshold
  let isWater = vv < 0.055; 
  
  let classVal = lcmSample.LCM10; 
  let bgColor = colorDict[classVal];
  
  // If the pixel class somehow isn't in the map, return black so we don't crash
  if (!bgColor) {
    return [0, 0, 0]; 
  }

  // Permanent Water is class 100 in your palette
  const PERMANENT_WATER_CLASS = 100;
  
if (isWater) {
    if (classVal === PERMANENT_WATER_CLASS) {
      // It's a river/lake. Return the original map color.
      return bgColor; 
    } else {
      // New Flooded area: Piercing, high-visibility Electric Cyan
      return [0.0, 0.9, 1.0]; 
    }
  }

  // Return the adjusted land cover color, completely unaltered
  return bgColor;
}
