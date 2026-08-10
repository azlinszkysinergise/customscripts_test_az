//VERSION=3

/**
 * Thermal sharpening of CLMS LST (3 km hourly V3) with Landsat thermal imagery.
 * Data fusion of three sources; see README.md for the method, caveats and setup.
 *
 * Quick setup (Copernicus Browser -> "use additional datasets (advanced)"):
 *   - Primary dataset      Landsat 8-9 L1        -> alias  LANDSAT-OT-L1
 *   - Additional dataset 1 CLMS LST 3km hourly V3 -> alias  CLMS_CAL
 *   - Additional dataset 2 CLMS LST 3km hourly V3 -> alias  CLMS_TGT
 *   Customize timespans: LANDSAT-OT-L1 + CLMS_CAL = calibration date (clear-sky
 *   Landsat overpass); CLMS_TGT = the target date you want to sharpen.
 *
 * Per pixel, in Kelvin:
 *   residual      = LST_landsat_cal - LST_clms_cal
 *   LST_sharpened = LST_clms_target + residual + biasOffset
 */

//// ---- USER OPTIONS ---------------------------------------------------------

// choose which Landsat TIRS band drives brightness temperature (B10 or B11)
var band = "B10";

// scene-wide bias offset (see header). Units match the LST (Kelvin degrees).
// 0 = pure additive Landsat detail; set to mean(CLMS_cal)-mean(Landsat_cal)
// to anchor the sharpened scene-mean to CLMS.
var biasOffset = 0;

// physical sanity range for the Landsat-derived calibration LST (degC).
// Pixels whose derived LST falls outside this band are masked out (catches
// undetected cloud / emissivity blow-ups that pass the raw-band guard).
var minValidC = -20;
var maxValidC = 60;

// color-map range for the RGBA "default" output (Kelvin), matching CLMS ramp.

//// ---- LANDSAT LST CONSTANTS (unchanged from source script) -----------------

// NDVI thresholds for bare soil / full vegetation
var NDVIs = 0.2;
var NDVIv = 0.8;

// emissivity
var waterE = 0.991;
var soilE = 0.966;
var vegetationE = 0.973;
var C = 0.009; // surface roughness

// central/mean wavelength in meters, B10 or B11
var bCent = band == "B10" ? 0.000010895 : 0.000012005;

// rho = h*c/sigma = PlanckC*velocityLight/BoltzmannC
var rho = 0.01438; // m K

//// ---- CLMS DECODE ----------------------------------------------------------

// raw CLMS LST -> Kelvin
var CLMS_FACTOR = 1 / 100;
var CLMS_OFFSET = 273.15;

//// ---- VISUALIZATION (CLMS LST 3km hourly V3 magma-style ramp, Kelvin) ------

const ColorBar = [
  [240, [0, 0, 4]],
  [250, [27, 12, 65]],
  [260, [76, 12, 107]],
  [270, [120, 28, 109]],
  [280, [165, 45, 96]],
  [290, [206, 68, 70]],
  [300, [237, 105, 37]],
  [310, [251, 154, 7]],
  [320, [247, 208, 60]],
  [330, [252, 255, 164]],
];
const visualizer = new ColorRampVisualizer(ColorBar);

//// ---- SETUP ----------------------------------------------------------------

function setup() {
  return {
    input: [
      { datasource: "LANDSAT-OT-L1", bands: ["B03", "B04", "B05", "B10", "B11"] },
      { datasource: "CLMS_CAL", bands: ["LST", "dataMask"] },
      { datasource: "CLMS_TGT", bands: ["LST", "dataMask"] },
    ],
    output: [
      { id: "default", bands: 4, sampleType: "UINT8" }, // RGBA color map
      { id: "index", bands: 1, sampleType: "FLOAT32" }, // sharpened LST (K)
      { id: "eobrowserStats", bands: 1, sampleType: "FLOAT32" }, // sharpened LST (K) for stats
      { id: "dataMask", bands: 1 }, // validity mask
    ],
    mosaicking: "SIMPLE", // one clear scene per layer; access samples.X[0]
  };
}

//// ---- LANDSAT EMISSIVITY (unchanged from source script) --------------------

function LSEcalc(NDVI, Pv) {
  var LSE;
  if (NDVI < 0) {
    // water
    LSE = waterE;
  } else if (NDVI < NDVIs) {
    // soil
    LSE = soilE;
  } else if (NDVI > NDVIv) {
    // vegetation
    LSE = vegetationE;
  } else {
    // mixtures of vegetation and soil
    LSE = vegetationE * Pv + soilE * (1 - Pv) + C;
  }
  return LSE;
}

// Landsat single-scene LST in KELVIN, or null if the pixel is invalid.
function landsatLST(s) {
  var Bi = band == "B10" ? s.B10 : s.B11;
  var B03i = s.B03;
  var B04i = s.B04;
  var B05i = s.B05;

  // raw-band guard: screens error scenes / fill (same as source script)
  if (!(Bi > 173 && Bi < 65000 && B03i > 0 && B04i > 0 && B05i > 0)) {
    return null;
  }

  // 1 Kelvin to C (brightness temperature)
  var btC = Bi - 273.15;
  // 2 NDVI
  var NDVI = (B05i - B04i) / (B05i + B04i);
  // 3 Pv - proportional vegetation
  var Pv = Math.pow((NDVI - NDVIs) / (NDVIv - NDVIs), 2);
  // 4 LSE - land surface emissivity
  var LSE = LSEcalc(NDVI, Pv);
  // 5 LST (degC)
  var lstC = btC / (1 + ((bCent * btC) / rho) * Math.log(LSE));

  // physical sanity range
  if (lstC < minValidC || lstC > maxValidC) {
    return null;
  }

  // return Kelvin
  return lstC + 273.15;
}

//// ---- EVALUATE PIXEL -------------------------------------------------------

function invalid() {
  return {
    default: [0, 0, 0, 0],
    index: [NaN],
    eobrowserStats: [NaN],
    dataMask: [0],
  };
}

function evaluatePixel(samples) {
  // note: LANDSAT-OT-L1 has hyphens, so it must be accessed via bracket notation
  var landsat = samples["LANDSAT-OT-L1"][0];
  var clmsCal = samples.CLMS_CAL[0];
  var clmsTgt = samples.CLMS_TGT[0];

  // CLMS validity
  if (clmsCal.dataMask === 0 || clmsTgt.dataMask === 0) {
    return invalid();
  }

  // Landsat calibration LST (Kelvin), with raw-band + physical-range guards
  var lstLandsatCal = landsatLST(landsat);
  if (lstLandsatCal === null) {
    return invalid();
  }

  // CLMS LST (Kelvin)
  var lstClmsCal = clmsCal.LST * CLMS_FACTOR + CLMS_OFFSET;
  var lstClmsTgt = clmsTgt.LST * CLMS_FACTOR + CLMS_OFFSET;

  // additive residual sharpening
  var residual = lstLandsatCal - lstClmsCal;
  var lstSharpened = lstClmsTgt + residual + biasOffset;

  var rgb = visualizer.process(lstSharpened);
  return {
    default: rgb.concat(255),
    index: [lstSharpened],
    eobrowserStats: [lstSharpened],
    dataMask: [1],
  };
}
