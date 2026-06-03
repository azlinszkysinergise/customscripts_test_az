//VERSION=3
/*
Visualizing NDVI multi-temporal trends in Sentinel-2 imagery.
Tweaked to remove swath edges using dataMask and create seamless 30-day composites.
*/

function setup() {
    return {
        input: [
            {
                bands: ["B04", "B08", "dataMask"],
            },
        ],
        output: { bands: 3 },
        mosaicking: "ORBIT",
    };
}

function calcNDVI(sample) {
    var denom = sample.B04 + sample.B08;
    return denom !== 0 ? (sample.B08 - sample.B04) / denom : 0.0;
}

// Added clamping to prevent color wrapping if values exceed bounds
function stretch(val, min, max) {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function evaluatePixel(samples, scenes) {
    var avg1 = 0, count1 = 0;
    var avg2 = 0, count2 = 0;
    var avg3 = 0, count3 = 0;

    // 1. Find the most recent VALID date to act as our baseline anchor
    var anchorDate = null;
    for (var i = 0; i < samples.length; i++) {
        if (samples[i].dataMask === 1) {
            anchorDate = scenes[i].date.getTime();
            break;
        }
    }

    // If there is no valid data in the entire series, return black
    if (anchorDate === null) return [0, 0, 0];

    var DAY_IN_MS = 24 * 3600 * 1000;

    // 2. Build seamless composites using 30-day windows
    for (var i = 0; i < samples.length; i++) {
        // Skip no-data pixels immediately to remove artificial edges
        if (samples[i].dataMask === 0) continue; 

        var ndvi = calcNDVI(samples[i]);
        var sceneTime = scenes[i].date.getTime();
        var daysDiff = (anchorDate - sceneTime) / DAY_IN_MS;

        // Group into roughly monthly composites from the anchor date
        if (daysDiff <= 30) {
            avg3 += ndvi;
            count3++;
        } else if (daysDiff <= 60) {
            avg2 += ndvi;
            count2++;
        } else {
            avg1 += ndvi;
            count1++;
        }
    }

    // 3. Calculate averages safely
    avg1 = count1 > 0 ? avg1 / count1 : 0;
    avg2 = count2 > 0 ? avg2 / count2 : 0;
    avg3 = count3 > 0 ? avg3 / count3 : 0;

    return [
        stretch(avg1, 0.1, 0.7),
        stretch(avg2, 0.1, 0.7),
        stretch(avg3, 0.1, 0.7)
    ];
}

function preProcessScenes(collections) {
    // Standardized to a 90-day lookback window (roughly 3 months)
    collections.scenes.orbits = collections.scenes.orbits.filter(function (orbit) {
        var orbitDateFrom = new Date(orbit.dateFrom);
        return (
            orbitDateFrom.getTime() >=
            collections.to.getTime() - 90 * 24 * 3600 * 1000
        );
    });
    return collections;
}
