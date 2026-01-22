//VERSION = 3
// Adapted for VHR imagery (B1=Red, B4=NIR)
// Includes FLOAT32 output for precise kNDVI stats and index values

function setup() {
    return {
        input: ["B1", "B4", "dataMask"],
        output: [
            { id: "default", bands: 4 }, // Standard UI output
            { id: "index", bands: 1, sampleType: "FLOAT32" }, // High precision index
            { id: "eobrowserstats", bands: 1, sampleType: "FLOAT32" } // High precision stats
        ]
    };
}

const kndvi_ramp = [
    [-1.1, [0, 0, 0]],
    [-0.1, [0.86, 0.86, 0.86]],
    [0, [1, 1, 0.88]],
    [0.025, [1, 0.98, 0.8]],
    [0.05, [0.93, 0.91, 0.71]],
    [0.075, [0.87, 0.85, 0.61]],
    [0.1, [0.8, 0.78, 0.51]],
    [0.125, [0.74, 0.72, 0.42]],
    [0.15, [0.69, 0.76, 0.38]],
    [0.175, [0.64, 0.8, 0.35]],
    [0.2, [0.57, 0.75, 0.32]],
    [0.25, [0.5, 0.7, 0.28]],
    [0.3, [0.44, 0.64, 0.25]],
    [0.35, [0.38, 0.59, 0.21]],
    [0.4, [0.4, 0.54, 0.18]],
    [0.45, [0.25, 0.49, 0.14]],
    [0.5, [0.19, 0.43, 0.11]],
    [0.55, [0.13, 0.38, 0.07]],
    [0.6, [0.06, 0.33, 0.04]]
];

const visualizer = new ColorRampVisualizer(kndvi_ramp);

function evaluatePixel(sample) {
    // kNDVI formula: tanh(((NIR - Red) / (NIR + Red))^2)
    let ndvi = (sample.B4 - sample.B1) / (sample.B4 + sample.B1);
    let kndvi = Math.tanh(Math.pow(ndvi, 2));
    
    // Visual Output
    let imgVals = kndvi <= 0.6 ? visualizer.process(kndvi) : [0, 0.27, 0];
    
    // Masking for the visual 'default' display only
    let visualAlpha = (kndvi <= 0.15) ? 0 : sample.dataMask;
    
    return {
        default: [imgVals[0], imgVals[1], imgVals[2], visualAlpha],
        index: [kndvi],
        eobrowserstats: [kndvi]
    };
}
