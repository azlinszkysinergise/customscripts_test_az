//VERSION=3
// Detecting sediment load and flooding for disaster monitoring from Sentinel-2

function setup() {
    return {
        input: ["B04", "B05", "B08", "SCL", "dataMask"],
        output: [
            { id: "default", bands: 4 },
            { id: "sedimentIndex", bands: 1, sampleType: "FLOAT32" },
            { id: "NDVI", bands: 1, sampleType: "FLOAT32" },
            { id: "dataMask", bands: 1 }
        ]
    };
}   

const map1 = [
    [0.00, [0.000, 0.251, 0.502]], // Dark Navy Blue #004080
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
    [0.00, [1.000, 0.843, 0.000]], // Gold #FFD700
    [0.10, [1.000, 0.765, 0.000]], // Saffron Yellow #FFC300
    [0.20, [1.000, 0.867, 0.341]], // Lemon Yellow #FFDD57
    [0.30, [1.000, 0.878, 0.400]], // Light Goldenrod #FFE066
    [0.40, [1.000, 0.922, 0.600]], // Light Yellow #FFEB99
    [0.50, [0.976, 0.780, 0.310]], // Honey Yellow #F9C74F
    [0.55, [0.957, 0.635, 0.380]], // Warm Sand #F4A261
    [0.60, [0.929, 0.682, 0.286]], // Sunset Yellow #EDAE49
    [0.65, [1.000, 0.400, 0.400]], // Light Coral #FF6666
    [0.70, [1.000, 0.435, 0.380]], // Coral Red #FF6F61
    [0.75, [1.000, 0.353, 0.373]], // Watermelon Red #FF5A5F
    [0.80, [1.000, 0.251, 0.251]], // Tomato Red #FF4040
    [0.85, [0.902, 0.224, 0.275]], // Soft Red #E63946
    [0.90, [0.827, 0.184, 0.184]], // Brick Red #D32F2F
    [1.00, [0.698, 0.133, 0.133]]  // Firebrick Red #B22222
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
            NDVI: [0],
            dataMask: [samples.dataMask]
        };
    }
    
    if ([8, 9, 10].includes(samples.SCL)) {
        // Clouds - white
        return {
            default: [1, 1, 1, 1],
            sedimentIndex: [0],
            NDVI: [0],
            dataMask: [samples.dataMask]
        };
    }
    
    // Calculate NDVI
    let NDVI = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
    
    // Calculate sediment index from B05
    let sedimentIndex = samples.B05;
    
    // Apply visualization based on NDVI threshold
    let visualization;
    if (NDVI > 0.1) {
        // Use viz2 (yellow/gold to red colors) for vegetation
        visualization = viz2.process(NDVI);
    } else {
        // Use viz1 (blue colors) for water/sediment based on B05
        visualization = viz1.process(sedimentIndex);
    }
    
    return {
        default: visualization.concat([1]),
        sedimentIndex: [sedimentIndex],
        NDVI: [NDVI],
        dataMask: [samples.dataMask]
    };
}
