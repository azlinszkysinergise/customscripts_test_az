//VERSION=3

// By András Zlinszy @azlinszky.bsky.social and Google Gemini
// This script counts the number of "tropical nights" in the study time interval, defined according to the WMO as "the temperature does not fall below 20°C all night (https://climate.copernicus.eu/what-tropical-night)

// --- USER PARAMETERS ---
const UTC_OFFSET = +1;            // e.g., +9 for Japan, -7 for Phoenix
const NIGHT_START = 18;          // 18:00 (6 PM) local time
const NIGHT_END = 6;             // 06:00 (6 AM) local time
const MIN_TEMP_THRESHOLD = 20.0; // 20.0 for WMO Standard, 30.0 for Super Tropical

function setup() {
    return {
        input: ["LST", "dataMask"],
        output: { bands: 4, sampleType: "AUTO" },
        mosaicking: "TILE"
    };
}

// Intercept and filter scenes BEFORE downloading pixel data
function preProcessScenes(collections) {
    collections.scenes.tiles = collections.scenes.tiles.filter(function (tile) {
        let date = new Date(tile.date);
        
        // Calculate local hour (0-23)
        let utcHour = date.getUTCHours();
        let localHour = (utcHour + UTC_OFFSET) % 24;
        if (localHour < 0) {
            localHour += 24; // Handle negative modulo for negative UTC offsets
        }
        
        // Keep only tiles that fall within the night window
        return (localHour >= NIGHT_START || localHour <= NIGHT_END);
    });
    
    return collections;
}

function evaluatePixel(samples, scenes) {
    let nights = {};

    for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];
        
        if (sample.dataMask === 1) {
            let tempC = sample.LST * 0.01;
            let date = new Date(scenes.tiles[i].date);
            
            // Shift the UTC time by the local offset, then subtract 12 hours 
            // so local noon becomes the start of a new day block.
            date.setUTCHours(date.getUTCHours() + UTC_OFFSET - 12);
            let nightId = date.toISOString().split('T')[0];
            
            if (!nights[nightId]) {
                nights[nightId] = { validCount: 0, tropicalCount: 0 };
            }
            
            nights[nightId].validCount++;
            if (tempC >= MIN_TEMP_THRESHOLD) {
                nights[nightId].tropicalCount++;
            }
        }
    }
    
    let tropicalNights = 0;
    
    for (let id in nights) {
        let night = nights[id];
        // Enforce at least 1 valid reading to count as a night block
        if (night.validCount > 0 && night.validCount === night.tropicalCount) {
            tropicalNights++;
        }
    }
    
    // Visualizer Scale Map:
    // 0 = Transparent
    // 1 = Yellow [1, 1, 0]
    // 5 = Red [1, 0, 0] (midpoint)
    // >= 10 = Black [0, 0, 0]
    
    if (tropicalNights === 0) {
        return [0, 0, 0, 0]; // Transparent
    } 
    if (tropicalNights >= 10) {
        return [0, 0, 0, 1]; // Black
    }
    
    let r, g, b, a = 1.0;
    
    if (tropicalNights <= 5) {
        // Interpolate 1 to 5: Yellow to Red
        let fraction = (tropicalNights - 1) / 4.0;
        r = 1.0;
        g = 1.0 - fraction;
        b = 0.0;
    } else {
        // Interpolate 5 to 10: Red to Black
        let fraction = (tropicalNights - 5) / 5.0;
        r = 1.0 - fraction;
        g = 0.0;
        b = 0.0;
    }
    
    return [r, g, b, a];
}
