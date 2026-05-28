//VERSION=3

function setup() {
 return {
  input: ["B02", "B03", "B04", "SCL", "dataMask"],
  output: { bands: 3 },
  mosaicking: "ORBIT"
 };
}

function evaluatePixel(samples) {
 const bandB04 = [];
 const bandB02 = [];
 const bandB03 = [];

 for (var i = 0; i < samples.length; i++) {
  if (validate(samples[i].SCL) && samples[i].dataMask===1) {
   bandB02.push(samples[i].B02)
   bandB03.push(samples[i].B03)
   bandB04.push(samples[i].B04)
  }
 }

 if (bandB02.length === 0) {
  bandB02.push(NaN)
 }
 if (bandB03.length === 0) {
  bandB03.push(NaN)
 }
 if (bandB04.length === 0) {
  bandB04.push(NaN)
 }

 const sortedB02 = ourSort(bandB02);
 const sortedB03 = ourSort(bandB03);
 const sortedB04 = ourSort(bandB04);



 return [2.5*getFirstQuartile(sortedB04), 2.5*getFirstQuartile(sortedB03), 2.5*getFirstQuartile(sortedB02)];
}

function ourSort(arrayIn) {
 return arrayIn.sort((a, b) => a - b)
}

function getFirstQuartile(sortedValues) {
 var index = Math.floor(sortedValues.length / 4);
 return sortedValues[index];
}

function validate(scl) {

 if (scl === 3) { // SC_CLOUD_SHADOW
  return false;
 } else if (scl === 9) { // SC_CLOUD_HIGH_PROBA
  return false;
 } else if (scl === 8) { // SC_CLOUD_MEDIUM_PROBA
  return false;
 } else if (scl === 7) { // SC_CLOUD_LOW_PROBA / UNCLASSIFIED
  // return false;
 } else if (scl === 10) { // SC_THIN_CIRRUS
  return false;
 } else if (scl === 1) { // SC_SATURATED_DEFECTIVE
  return false;
 } else if (scl === 2) { // SC_DARK_FEATURE_SHADOW
  // return false;
 }
 return true;
}
