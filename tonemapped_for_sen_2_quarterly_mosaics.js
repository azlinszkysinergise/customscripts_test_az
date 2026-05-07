// VERSION=3
// Re-creation of Tonemapped Natural Color for Sentinel-2 Quarterly Cloudless Mosaics

function setup() {
  return {
    input: ["B04", "B03", "B02", "dataMask"],
    output: { bands: 4 }
  };
}

// --- Parameters ---
var tonemapMethod = 4; // 0-Simple Reinhard, 1-Luma Reinhard, 2-Uncharted2, 3-ACES Reinhard, 4-ACES Uncharted
var adjForSunColor = true;
var atmosphere = 0.025;
var gain = 1.5;
var saturation = 2.0;
var White = 2.5; 
var scaleFac = 10000; // Scaling for Quarterly Mosaic DN values

// --- Math Helpers ---
const matMul = (m, v) => m.map(row => row.reduce((acc, val, i) => acc + val * v[i], 0));

const RGBLin_2_AP0 = [
    [0.4397010, 0.3829780, 0.1773540],
    [0.0897764, 0.8134390, 0.0967610],
    [0.0175411, 0.1115440, 0.8708840]
];

const AP0_2_RGBLin = [
    [2.5216861, -1.1341309, -0.3875551],
    [-0.2764799, 1.3297076, -0.0532277],
    [-0.0157709, -0.1605294, 1.1762943]
];

function atm(c) { return Math.max(0, c - atmosphere); }

function Saturate(rgb) {
    var L = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return rgb.map(c => L + saturation * (c - L));
}

function ReinhardCurve(x) { return x / (1.0 + x); }

function Uncharted2FilmicCurve(x) {
    const A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30, W = White;
    var curr = ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
    var white = ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;
    return curr / white;
}

function tonemap(col) {
    switch (tonemapMethod) {
        case 0: return col.map(ReinhardCurve);
        case 1: 
            var L = 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2];
            return col.map(c => c * (ReinhardCurve(L) / L));
        case 2: return col.map(Uncharted2FilmicCurve);
        case 3: 
            col = matMul(RGBLin_2_AP0, col).map(ReinhardCurve);
            return matMul(AP0_2_RGBLin, col);
        case 4: 
            col = matMul(RGBLin_2_AP0, col).map(Uncharted2FilmicCurve);
            return matMul(AP0_2_RGBLin, col);
        default: return col;
    }
}

function sRGBCurve(C) {
    return C < 0.0031308 ? (12.92 * C) : (1.055 * Math.pow(Math.max(0, C), 0.41666) - 0.055);
}

// --- Main Processing ---
function evaluatePixel(samples) {
    // 1. Convert DN to reflectance (0-1)
    var col = [samples.B04 / scaleFac, samples.B03 / scaleFac, samples.B02 / scaleFac];
    
    // 2. Atmospheric correction (Haze removal)
    col = col.map(atm);
    
    // 3. Optional Solar Color Adjustment
    if (adjForSunColor) {
        col = [col[0], 0.939 * col[1], 0.779 * col[2]];
    }
    
    // 4. Gain and Saturation
    col = col.map(a => a * gain);
    col = Saturate(col);
    
    // 5. Tonemapping (Compresses highlights, keeps detail in clouds/snow)
    col = tonemap(col);
    
    // 6. Gamma Correction (sRGB)
    col = col.map(sRGBCurve);
    
    return [...col, samples.dataMask];
}
