// VERSION=3
// VRA Zoning: Peak-Performance Logic (May-June)
// Designed to "level the playing field" between different crop types.

const T = [0.40, 0.50, 0.60, 0.70]; // Thresholds: Low to High
const MIN_KNDVI = 0.1;
const showLegend = true;

function setup() {
  return {
    input: ["B04", "B08", "dataMask"],
    output: { bands: 3 },
    mosaicking: "ORBIT"
  };
}

function calc_kNDVI(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  // Using tanh(NDVI^2) for kNDVI
  return Math.tanh(Math.pow(ndvi, 2));
}

function evaluatePixel(samples, scenes) {
  let peakK = 0;
  let hasData = false;

  for (let i = 0; i < samples.length; i++) {
    // Only process clear pixels within May (4) and June (5)
    if (samples[i].dataMask === 1) {
      let date = new Date(scenes.orbits[i].dateFrom);
      let month = date.getMonth();
      
      if (month === 4 || month === 5) {
        let currentK = calc_kNDVI(samples[i]);
        if (currentK > peakK) {
          peakK = currentK; // Capture the absolute best moment
        }
        hasData = true;
      }
    }
  }

  // Visualization Logic
  if (!hasData || peakK < MIN_KNDVI) return [0.3, 0.3, 0.3]; // Dark Grey
  
  if (peakK < T[0]) return [0.8, 0.1, 0.1]; // Red (100 kg/ha)
  if (peakK < T[1]) return [1.0, 0.5, 0.0]; // Orange (140 kg/ha)
  if (peakK < T[2]) return [1.0, 0.9, 0.2]; // Yellow (180 kg/ha)
  if (peakK < T[3]) return [0.5, 0.9, 0.2]; // Light Green (220 kg/ha)
  
  return [0.1, 0.5, 0.1]; // Dark Green (250 kg/ha)
}

function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
  if (!showLegend) return;
  outputMetadata.userData = {
    "legend": {
      "type": "discrete",
      "items": [
        {"color": "#4D4D4D", "label": "No Vegetation"},
        {"color": "#CC1A1A", "label": "100 kg/ha (Very Low Potential)"},
        {"color": "#FF8000", "label": "140 kg/ha (Low Potential)"},
        {"color": "#FFE633", "label": "180 kg/ha (Average)"},
        {"color": "#80E633", "label": "220 kg/ha (High Potential)"},
        {"color": "#1A801A", "label": "250 kg/ha (Peak Productivity)"}
      ]
    }
  };
}
