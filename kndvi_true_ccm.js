//VERSION = 3
// Adapted for VHR imagery with 0-500 raw value scale
// Renders True Color for non-vegetated pixels (kNDVI <= 0.15) using HighlightCompressVisualizer

function setup() {
    return {
        input: ["Red", "Green", "Blue", "Grey", "dataMask"],
        output: [
            { id: "default", bands: 4 },
            { id: "index", bands: 1, sampleType: "FLOAT32" },
            { id: "eobrowserstats", bands: 1, sampleType: "FLOAT32" }
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

const trueColorViz = new HighlightCompressVisualizer(0, 500);
const kndviViz = new ColorRampVisualizer(kndvi_ramp);

function evaluatePixel(sample) {
    // kNDVI is ratio-based, so raw scale (0-500) cancels out naturally
    let ndvi = (sample.Grey - sample.Red) / (sample.Grey + sample.Red);
    let kndvi = Math.tanh(Math.pow(ndvi, 2));
    
    let rgb;
    if (kndvi <= 0.15) {
        // Compress 0-500 raw values to standard [0, 1] RGB output
        rgb = trueColorViz.processList([sample.Red, sample.Green, sample.Blue]);
    } else if (kndvi <= 0.6) {
        rgb = kndviViz.process(kndvi);
    } else {
        rgb = [0, 0.27, 0];
    }
    
    return {
        default: [rgb[0], rgb[1], rgb[2], sample.dataMask],
        index: [kndvi],
        eobrowserstats: [kndvi]
    };
}
