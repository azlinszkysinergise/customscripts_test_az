//VERSION = 3
//A little script to visualize urban greenspace based on kNDVI. Created with AI
// Modified for CDSE Sentinel-2 Quarterly Mosaics
// Transparency applied to kNDVI <= 0

function setup() {
    return {
        input: ["B04", "B08", "dataMask"],
        output: [
            { bands: 4 }
        ]
    }
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
    [0.4, [0.31, 0.54, 0.18]],
    [0.45, [0.25, 0.49, 0.14]],
    [0.5, [0.19, 0.43, 0.11]],
    [0.55, [0.13, 0.38, 0.07]],
    [0.6, [0.06, 0.33, 0.04]]
];

const visualizer = new ColorRampVisualizer(kndvi_ramp);

function evaluatePixel(sample) {
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
    let kndvi = Math.tanh(Math.pow(ndvi, 2));
    
    let imgVals = kndvi <= 0.6 ? visualizer.process(kndvi) : [0, 0.27, 0];
    
    // Logic for Transparency: 
    // If kNDVI is 0 or less, set alpha to 0. Otherwise, use the original dataMask.
    let alpha = (kndvi <= 0.15) ? 0 : sample.dataMask;
    
    return [imgVals[0], imgVals[1], imgVals[2], alpha];
}
