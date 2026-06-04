//VERSION=3
/* Modified Sentinel-2 Water Surface Visualizer
   - Includes NDWI-based land/water classification
   - Visualizes land in NIR False Color (B08, B04, B03)
   - Visualizes water using the original logarithmic variance method
*/

function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "dataMask"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  // If the pixel has no data, render it black (or transparent)
  if (sample.dataMask === 0) {
    return [0, 0, 0];
  }

  // Calculate NDWI (Normalized Difference Water Index) using Green (B03) and NIR (B08)
  let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  
  // Classify water based on an NDWI threshold (values > 0.0 generally indicate water)
  if (ndwi > 0.0) {
    // Prevent division by zero for the logarithmic calculations
    let b02 = sample.B02 === 0 ? 0.0001 : sample.B02;
    let b03 = sample.B03 === 0 ? 0.0001 : sample.B03;
    let b04 = sample.B04 === 0 ? 0.0001 : sample.B04;
    let b08 = sample.B08 === 0 ? 0.0001 : sample.B08;
    
    // Original Water Surface Visualizer logic
    let v1 = Math.log(b02 / b03);
    let v2 = Math.log(b03 / b04);
    let v3 = Math.log(b04 / b08);
    
    return [v1, v2, v3];
    
    // Alternatively, to enhance the green band fraction as suggested in the original script:
    // return [v1 * v2, v2, v3];
    
  } else {
    // Land surfaces: NIR False Color (B08, B04, B03)
    // Values are multiplied by 2.5 to increase brightness, which is a standard enhancement
    return [sample.B08 * 1.8, sample.B04 * 2.5, sample.B03 * 2.5];
  }
}
