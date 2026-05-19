//VERSION=3
// Calculates the mean SWI005 and renders it with a color scale

var swiColorMap = [
    [0, 0x8b0000],   // 0%: Dark Red (Extremely dry)
    [25, 0xffa500],  // 25%: Orange
    [50, 0xffff00],  // 50%: Yellow
    [75, 0x00ff00],  // 75%: Green
    [100, 0x0000ff]  // 100%: Blue (Extremely wet)
];

var visualizer = new ColorRampVisualizer(swiColorMap);

function setup() {
    return {
        input: ["SWI005", "dataMask"],
        output: { bands: 4 }, // 4 bands needed for Red, Green, Blue, Alpha
        mosaicking: "ORBIT" 
    };
}

function evaluatePixel(samples) {
    var sumSWI = 0;
    var validSamples = 0;

    // Loop through all observations
    for (var i = 0; i < samples.length; i++) {
        // Check for valid data using the correct band name
        if (samples[i].dataMask === 1 && samples[i].SWI005 !== undefined) {
            sumSWI += samples[i].SWI005;
            validSamples++;
        }
    }

    // If valid data exists, calculate mean and apply colors
    if (validSamples > 0) {
        var meanSWI = sumSWI / validSamples;
        var rgb = visualizer.process(meanSWI);
        return rgb.concat([1]); // Combine RGB with Alpha (1 = opaque)
    } else {
        return [0, 0, 0, 0]; // Returns a transparent pixel for NoData
    }
}
