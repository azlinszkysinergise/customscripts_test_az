//VERSION=3 - for celsius
//by András Zlinszky and GitHub Copilot
const factor = 0.01; //original value from official evalscript
const offset = 0; //celsius = kelvin - 273.15, so offset is 273.15 less than original evalscript

function setup() {
  return {
    
    input: ["LST", "dataMask"],
    output: [
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 },
    ],
  };
}

function evaluatePixel(samples) {
  
  var originalValue = samples.LST;

  let val = originalValue * factor + offset;

  let dataMask = samples.dataMask;

  const indexVal = dataMask === 1 ? val : NaN;

  return {
    index: [indexVal],
    eobrowserStats: [val, dataMask],
    dataMask: [dataMask],
  };
}
