//VERSION=3
// Detecting sediment load and flooding for disaster monitoring from Sentinel-2

function setup() {
    return {
        input: ["B04", "B05", "B08", "SCL", "dataMask"],
        output: [
            { id: "default", bands: 4 },
            { id: "sedimentIndex", bands: 1, sampleType: "FLOAT32" },
            { id: "kNDVI", bands: 1, sampleType: "FLOAT32" },
            { id: "dataMask", bands: 1 }
        ]
    };
}   

// SCL class values:
// 4 = VEGETATION, 5 = NOT_VEGETATED, 6 = WATER
// 2 = DARK_AREA_PIXELS, 7 = UNCLASSIFIED, 11 = SNOW

const waterThreshold = 0.1; // NDVI threshold below which areas are considered water

const map1 = [
    [0.00, [0.000, 0.000, 0.100]], // Very Dark Blue (nearly black)
    [0.02, [0.000, 0.251, 0.502]], // Dark Navy Blue #004080
    [0.05, [0.000, 0.502, 0.502]], // Teal #008080
    [0.10, [0.000, 0.467, 0.714]], // Sapphire Blue #0077B6
    [0.15, [0.000, 0.588, 0.780]], // Pacific Blue #0096C7
    [0.20, [0.000, 0.647, 0.812]], // Bright Cerulean #00A5CF
    [0.25, [0.400, 0.600, 0.800]], // Light Steel Blue #6699CC
    [0.30, [0.282, 0.792, 0.894]], // Light Cyan-Blue #48CAE4
    [0.35, [0.565, 0.878, 0.937]], // Baby Blue #90E0EF
    [0.40, [0.678, 0.910, 0.957]], // Powder Blue #ADE8F4
    [0.45, [0.792, 0.941, 0.973]], // Ice Blue #CAF0F8
    [0.50, [0.792, 0.941, 0.973]]  // Ice Blue #CAF0F8 (endpoint)
];

let viz1 = new ColorRampVisualizer(map1);

const map2 = [
    [0.00, [0.698, 0.133, 0.133]], // Firebrick Red #B22222
    [0.10, [0.827, 0.184, 0.184]], // Brick Red #D32F2F
    [0.20, [0.902, 0.224, 0.275]], // Soft Red #E63946
    [0.30, [1.000, 0.251, 0.251]], // Tomato Red #FF4040
    [0.40, [1.000, 0.353, 0.373]], // Watermelon Red #FF5A5F
    [0.50, [1.000, 0.435, 0.380]], // Coral Red #FF6F61
    [0.55, [1.000, 0.400, 0.400]], // Light Coral #FF6666
    [0.60, [0.929, 0.682, 0.286]], // Sunset Yellow #EDAE49
    [0.65, [0.957, 0.635, 0.380]], // Warm Sand #F4A261
    [0.70, [0.976, 0.780, 0.310]], // Honey Yellow #F9C74F
    [0.75, [1.000, 0.922, 0.600]], // Light Yellow #FFEB99
    [0.80, [1.000, 0.878, 0.400]], // Light Goldenrod #FFE066
    [0.85, [1.000, 0.867, 0.341]], // Lemon Yellow #FFDD57
    [0.90, [1.000, 0.765, 0.000]], // Saffron Yellow #FFC300
    [1.00, [1.000, 0.843, 0.000]]  // Gold #FFD700
];

let viz2 = new ColorRampVisualizer(map2);

function evaluatePixel(samples) {
    // Check for clouds and shadows first
    // SCL values: 3=cloud shadows, 8=cloud medium probability, 9=cloud high probability, 10=thin cirrus
    if (samples.SCL === 3) {
        // Cloud shadow - black
        return {
            default: [0, 0, 0, 1],
            sedimentIndex: [0],
            kNDVI: [0],
            dataMask: [samples.dataMask]
        };
    }
    
    if ([8, 9, 10].includes(samples.SCL)) {
        // Clouds - white
        return {
            default: [1, 1, 1, 1],
            sedimentIndex: [0],
            kNDVI: [0],
            dataMask: [samples.dataMask]
        };
    }
    
    // Calculate NDVI
    let NDVI = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
    
    // Calculate kNDVI (kernel Normalized Difference Vegetation Index)
    let kNDVI = Math.tanh(Math.pow(NDVI, 2));
    
    // Calculate sediment index from B05
    let sedimentIndex = samples.B05;
    
    // Apply visualization based on SCL classification and NDVI threshold
    let visualization;
    if (samples.SCL === 6 || NDVI < waterThreshold) {
        // WATER (either classified as water or NDVI below threshold)
        // Use viz1 (blue colors) based on B05 sediment index
        visualization = viz1.process(sedimentIndex);
    } else if (samples.SCL === 4 || [5, 2, 7, 11].includes(samples.SCL)) {
        // VEGETATION, NOT_VEGETATED, DARK_AREA_PIXELS, UNCLASSIFIED, SNOW
        // Use viz2 (red to yellow colors) based on kNDVI
        visualization = viz2.process(kNDVI);
    } else {
        // Fallback for other classes (0=NO_DATA, 1=SATURATED_OR_DEFECTIVE)
        // Use B05-based visualization
        visualization = viz1.process(sedimentIndex);
    }
    
    return {
        default: visualization.concat([1]),
        sedimentIndex: [sedimentIndex],
        kNDVI: [kNDVI],
        dataMask: [samples.dataMask]
    };
}
