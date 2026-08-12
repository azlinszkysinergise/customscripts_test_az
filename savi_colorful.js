//VERSION=3
// András Zlinszky azlinszky.bsky.social and Gemini pro
// ==========================================
// USER-TUNABLE VARIABLES
// ==========================================
const MIN_SAVI = -0.2; 
const MAX_SAVI = 0.8;  
const L = 0.5;         

function setup() {
  return {
    input: ["B04", "B08", "SCL", "dataMask"],
    output: [
      { id: "default", bands: 4 },
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  // 1. Calculate SAVI
  let savi = 0.0;
  if (sample.dataMask === 1 && (sample.B08 + sample.B04 + L) !== 0) {
    savi = ((sample.B08 - sample.B04) / (sample.B08 + sample.B04 + L)) * (1.0 + L);
  }

  // 2. Identify surface types using SCL
  const isCloud = (
    sample.SCL === 3 ||  // Cloud shadows
    sample.SCL === 8 ||  // Cloud medium probability
    sample.SCL === 9 ||  // Cloud high probability
    sample.SCL === 10    // Thin cirrus
  );
  
  const isWater = (sample.SCL === 6);
  const isSnowOrDefective = (sample.SCL === 1 || sample.SCL === 11);

  // 3. Flags for statistics
  const cloudFlag = isCloud ? 1 : 0;
  const validMask = (sample.dataMask === 1 && !isCloud && !isWater && !isSnowOrDefective) ? 1 : 0;

  // 4. Define base SAVI color palette 
  const span = MAX_SAVI - MIN_SAVI;
  const limits = [
    MIN_SAVI,                  
    MIN_SAVI + span * 0.15,    
    MIN_SAVI + span * 0.30,    
    MIN_SAVI + span * 0.45,    
    MIN_SAVI + span * 0.60,    
    MIN_SAVI + span * 0.75,    
    MIN_SAVI + span * 0.90,    
    MAX_SAVI                   
  ];

  const colors = [
    [0.8, 0.0, 0.0], // Red           
    [1.0, 0.5, 0.0], // Orange        
    [1.0, 1.0, 0.0], // Yellow        
    [1.0, 1.0, 1.0], // White         
    [0.6, 0.9, 0.3], // Light Green   
    [0.0, 0.6, 0.0], // Deep Green    
    [0.0, 0.3, 1.0], // Blue          
    [0.5, 0.0, 0.5]  // Purple        
  ];

  let rgb = colorBlend(savi, limits, colors);
  
  // 5. Override visual colors for specific surfaces
  // Start with the standard SAVI output (fully opaque)
  let visualOutput = [rgb[0], rgb[1], rgb[2], 1.0];
  
  if (sample.dataMask === 0 || isSnowOrDefective) {
    // Keep missing data or snow/defective pixels completely transparent
    visualOutput = [0.0, 0.0, 0.0, 0.0]; 
  } else if (isWater) {
    // Neon blue for water
    visualOutput = [0.0, 1.0, 1.0, 1.0]; 
  } else if (isCloud) {
    // Grey for clouds and shadows
    visualOutput = [0.5, 0.5, 0.5, 1.0]; 
  }
  
  // 6. Return all expected outputs mapped by their IDs
  return {
    default: visualOutput,                        // Visual layer with custom colors
    index: [savi],                                // Histogram / Stats API
    eobrowserStats: [savi, cloudFlag],            // Line chart (Value, isCloud)
    dataMask: [validMask]                         // Stats filter (still excludes grey/blue areas)
  };
}
