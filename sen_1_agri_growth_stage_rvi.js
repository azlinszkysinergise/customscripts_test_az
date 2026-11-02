//VERSION=3
/* 
Recreation of the Agriculture Growth Stage script using Sentinel-1 (or Sentinel-1 Monthly Mosaics) 
and the Radar Vegetation Index (RVI).
Calculates the average RVI for the previous 3 months.
Requires multi-temporal processing (TEMPORAL=true).
*/
//by @azlinszky.bsky.social and Google Gemini Pro
// User-tuneable stretch parameters for RVI
const minRvi = 0.15;
const maxRvi = 0.75;

function setup() {
  return {
    input: ["VV", "VH", "dataMask"],
    output: { bands: 3 },
    mosaicking: "ORBIT" // Necessary for multi-temporal processing
  };
}

function calcRVI(sample) {
  // RVI calculation for Sentinel-1 Dual-Pol (linear power)
  // RVI = 4 * VH / (VV + VH)
  var denom = sample.VV + sample.VH;
  return denom !== 0 ? (4 * sample.VH) / denom : 0.0;
}

function stretch(val, min, max) {
  let res = (val - min) / (max - min);
  // Clamp values between 0 and 1 to prevent color artifacts
  return Math.max(0, Math.min(1, res)); 
}

function evaluatePixel(samples, scenes) {
  var avg1 = 0; var count1 = 0; // Oldest month (Red)
  var avg2 = 0; var count2 = 0; // Middle month (Green)
  var avg3 = 0; var count3 = 0; // Most recent month (Blue)
  
  if (scenes.length === 0) return [0, 0, 0];
  
  var endMonth = scenes[0].date.getMonth();
  var endYear = scenes[0].date.getFullYear();
  
  for (var i = 0; i < samples.length; i++) {
    if (samples[i].dataMask === 0) continue;
    
    var rvi = calcRVI(samples[i]);
    var sMonth = scenes[i].date.getMonth();
    var sYear = scenes[i].date.getFullYear();
    
    // Calculate accurate month difference (handles year wraparound)
    var monthDiff = (endYear - sYear) * 12 + (endMonth - sMonth);
    
    if (monthDiff === 0) {
      avg3 += rvi;
      count3++;
    } else if (monthDiff === 1) {
      avg2 += rvi;
      count2++;
    } else if (monthDiff === 2) {
      avg1 += rvi;
      count1++;
    }
  }
  
  // Calculate averages
  avg1 = count1 > 0 ? avg1 / count1 : 0;
  avg2 = count2 > 0 ? avg2 / count2 : 0;
  avg3 = count3 > 0 ? avg3 / count3 : 0;
  
  // Stretch values for visualization
  avg1 = stretch(avg1, minRvi, maxRvi);
  avg2 = stretch(avg2, minRvi, maxRvi);
  avg3 = stretch(avg3, minRvi, maxRvi);
  
  return [avg1, avg2, avg3];
}

function preProcessScenes(collections) {
  // Filter scenes to include only the last 3 months
  collections.scenes.orbits = collections.scenes.orbits.filter(function (orbit) {
    var orbitDateFrom = new Date(orbit.dateFrom);
    return (
      orbitDateFrom.getTime() >= collections.to.getTime() - 3 * 31 * 24 * 3600 * 1000
    );
  });
  return collections;
}
