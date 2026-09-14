// Soil Adjusted Vegetation Index (abbrv. SAVI)
// General formula: (800nm - 670nm) / (800nm + 670nm + L) * (1 + L)
// URL https://www.indexdatabase.de/db/si-single.php?sensor_id=96&rsindex_id=87

function setup() {
   return {
      input: ["B04", "B08", "dataMask"],
      output: [
         { id: "default", bands: 4 },
         { id: "index", bands: 1, sampleType: "FLOAT32" }
      ]
   };
}

let L = 0.428; // L = soil brightness correction factor could range from (0 - 1)

// Flipped vibrant rainbow palette
const ramp = [
   [-0.5, 0x990099], // Purple (Water/Snow)
   [-0.2, 0xcc0066], // Pinkish
   [0.0,  0xff0000], // Red (Bare soil/Rocks)
   [0.15, 0xff9900], // Orange
   [0.3,  0xffff00], // Yellow
   [0.45, 0x33cc33], // Green (Moderate vegetation)
   [0.6,  0x00ffff], // Cyan 
   [0.8,  0x0066ff], // Blue
   [1.0,  0x0000cc]  // Dark Blue (Dense vegetation)
];

const visualizer = new ColorRampVisualizer(ramp);

function evaluatePixel(samples) {
   const index = (samples.B08 - samples.B04) / (samples.B08 + samples.B04 + L) * (1.0 + L);
   let imgVals = visualizer.process(index);
   
   return {
      default: imgVals.concat(samples.dataMask),
      index: [index]
   };
}
