//VERSION=3
// Custom Land Surface Temperature (LST) Visualization based on Fedoniuk 2024  GeoTerrace-2024 https://doi.org/10.3997/2214-4609.2024510007
// Adapted for Hemisphere and a single Dynamic Climate Baseline

// --- LOCATION SETTINGS ---
const isSouthernHemisphere = false; // Change to true for South America, Australia, etc.

// --- CLIMATE BASELINE CALIBRATION (in Kelvin) ---
// Define what a "normal" comfortable temperature is for your location.
// 293.15K = +20°C (Temperate default). 
// For tropical areas, increase this (e.g., 303.15K for +30°C).
const k_baseline = 293.15; 

// Heat markers are automatically calculated in 5K (+5°C) increments
const k_t1 = k_baseline + 5;  // Warm
const k_t2 = k_baseline + 10; // Hot
const k_t3 = k_baseline + 15; // Very Hot
const k_t4 = k_baseline + 20; // Severe Heat
const k_t5 = k_baseline + 25; // Abnormal Heat

function setup() {
    return {
        input: ["B10", "dataMask"],
        output: { bands: 4 },
        mosaicking: "ORBIT" 
    };
}

const summerRamp = [
    [273.15, 0x2e82ff],     // 0°C - Blue
    [k_baseline, 0xffffff], // Normal - White
    [k_t1, 0xfde191],       // +5°C - Yellow 
    [k_t2, 0xf69855],       // +10°C - Orange 
    [k_t3, 0xec6927],       // +15°C - Dark Orange 
    [k_t4, 0xaa2d1d],       // +20°C - Red 
    [k_t5, 0x650401]        // +25°C - Dark Red 
];

const springAutumnRamp = [
    [263.15, 0x003d99],     // -10°C - Dark Blue
    [273.15, 0x2e82ff],     // 0°C - Blue
    [283.15, 0xffffff],     // +10°C - White 
    [k_baseline, 0xf69855], // Atypically Warm
    [k_t1, 0xaa2d1d],       // Atypically Hot
    [k_t2, 0x650401]        // Extreme for season
];

const winterRamp = [
    [243.15, 0x003d99], // -30°C - Deep Blue
    [253.15, 0x2e82ff], // -20°C - Blue
    [263.15, 0x80b3ff], // -10°C - Light Blue
    [273.15, 0xffffff], // 0°C - White
    [283.15, 0xaa2d1d]  // +10°C - Red (Atypically Warm for Winter)
];

const vizSummer = new ColorRampVisualizer(summerRamp);
const vizTransition = new ColorRampVisualizer(springAutumnRamp);
const vizWinter = new ColorRampVisualizer(winterRamp);

function evaluatePixel(samples, scenes) {
    let val = null;
    for (let i = 0; i < samples.length; i++) {
        if (samples[i].dataMask === 1) {
            val = samples[i].B10;
            break;
        }
    }
    
    if (val === null) return [0, 0, 0, 0];
    
    let month = 6; 
    if (scenes.orbits && scenes.orbits.length > 0) {
        let dateString = scenes.orbits[0].dateFrom; 
        month = parseInt(dateString.substring(5, 7), 10);
    }
    
    // Shift the month by 6 if in the Southern Hemisphere
    if (isSouthernHemisphere) {
        month = month + 6;
        if (month > 12) month = month - 12;
    }
    
    let rgb;
    if (month >= 3 && month <= 5) {
        rgb = vizTransition.process(val);      
    } else if (month >= 6 && month <= 8) {
        rgb = vizSummer.process(val);          
    } else if (month >= 9 && month <= 11) {
        rgb = vizTransition.process(val);      
    } else {
        rgb = vizWinter.process(val);          
    }
    
    return [rgb[0], rgb[1], rgb[2], 255];
}
