//VERSION=3
let minVal = 0.0;
let maxVal = 0.4;

let viz = new DefaultVisualizer(minVal, maxVal);

function evaluatePixel(samples) {
    // 1. Calculate the pseudo-pan using visible bands to match what the pan band (B08) "sees"
    let sudoPanW = (samples.B04 + samples.B03 + samples.B02 * 0.4) / 2.4;
    
    // 2. Prevent division by zero errors on edge/empty pixels
    if (sudoPanW === 0) {
        return [0, 0, 0, samples.dataMask];
    }

    // 3. Calculate the sharpening ratio
    let ratioW = samples.B08 / sudoPanW;
    
    // 4. Apply the ratio to the NIR False Color channels: R=B05, G=B04, B=B03
    let val = [
        samples.B05 * ratioW, 
        samples.B04 * ratioW, 
        samples.B03 * ratioW, 
        samples.dataMask
    ];
    
    return viz.processList(val);
}

function setup() {
  return {
    input: [{
      // We must include B02 for the pseudo-pan calculation, even though it isn't rendered
      bands: ["B02", "B03", "B04", "B05", "B08", "dataMask"]
    }],
    output: { bands: 4 }
  };
}
