import {map, MIN_ZOOM_LEVEL} from "./purp-map-gmap.js";

const USE_ZSTD = true;
const DELAY = 250;  // ms

let recs;
let groups;
let visibleRecs;
let minTm = null, maxTm = null;

let curTm;

function setCurTm(val) {
    curTm = val
}

// Time when the last data was generated, used for animation
let lastDataGen;

function updateData()
{
    if (!map) {
        return;
    }
    lastDataGen = Date.now();
    let bounds = map.getBounds();
    if (!bounds) {
        return;
    }

    // Move in time
    let HOUR_SEC = 3600;
    curTm = curTm + HOUR_SEC;
    if (curTm > maxTm) {
        if ($("#check-loop").is(":checked")) {
            // loop
            curTm = minTm;
        } else {
            curTm = maxTm;
        }
    }

    let zoomLevel = map.getZoom();
    zoomLevel = Math.trunc(Math.max(1, zoomLevel - MIN_ZOOM_LEVEL +  1));

    // Select the input records
    let useGroups = $("#check-group").is(':checked');
    let combined = recs;
    if (useGroups) {
        combined = combined.concat(groups);
    }

    // Determine visible records
    visibleRecs = [];
    let weightSum = 0;

    combined.forEach(rec => {
        let aqi = rec.snaps[curTm];
        if (!bounds.contains(rec.position) || !aqi) {
            // Not visible
            if (rec.visible) {
                rec.visible = false;
                rec.marker.setMap(null);
            }
            return;
        }
        if (useGroups) {
            if (rec.minLevel > zoomLevel || rec.maxLevel < zoomLevel) {
                return;
            }
        }
        // Visible
        visibleRecs.push(rec);
        weightSum += rec.weight;
        rec.currentAqi = aqi;
        // Also compute nextAqi
        let nextAqi;
        if (curTm < maxTm) {
            nextAqi = rec.snaps[curTm + HOUR_SEC];
        }
        rec.nextAqi = nextAqi || rec.currentAqi;
        return;

        if (!rec.visible) {
            rec.visible = true;
            rec.marker.setMap(map);
        }
        const MAX_AQI = 300;
        aqi = Math.min(MAX_AQI, aqi);
        let perc = Math.trunc(10 * (aqi / MAX_AQI)) * 10;
        let iconUrl = `purp-map-img/icon-${perc}.png`;
        rec.icon.url = iconUrl;
        rec.marker.setIcon(rec.icon);
        rec.marker.setVisible(true);
    });

    let groupText = useGroups ? ` in ${visibleRecs.length} groups` : ""
    $("#tm").html(`Time: ${new Date(curTm * 1000)}<br/>${weightSum}/${recs.length} sensors${groupText}`);
    $("#time-slider").attr("min", minTm).attr("max", maxTm).attr("step", HOUR_SEC).attr("value", curTm).val(curTm);
}

/**
 * For a set of input records, split into buckets (based on the level)
 * and group records in any bucket into a single new record.
 * Return records at this level.
 * Bucket size gets smaller with level increasing.
 * Each record is marked with minLevel and maxLevel, and is visible if (minLevel <= zoomLevel <= maxLevel)
 */
function optimizeSet(set, level)
{
    // Stop at level some level
    if (level == 10) {
        for (let r = 0; r < set.length; r++) {
            set[r].maxLevel = 1000;  //
        }
        return set;
    }

    let latRange = 1.0 / Math.pow(2, level);  // Size of a single bucket
    let lngRange = latRange;
    let buckets = {}
    // Put all input recs in their buckets by lat/lng
    for (let r = 0; r < set.length; r++) {
        let rec = set[r];
        let latBucket = Math.floor((rec.lat + 180.0) / latRange) * latRange - 180.0;
        let lngBucket = Math.floor((rec.lng + 180.0) / lngRange) * lngRange - 180.0 ;
        let bucketKey = 10000 * latBucket + lngBucket;
        let list = buckets[bucketKey];
        if (!list) {
            list = [];
            buckets[bucketKey] = list;
        }
        list.push(rec);
    }

    let result = [];
    // Iterate over all buckets
    for (let [key, list] of Object.entries(buckets)) {
        if (list.length == 1) {
            // Just one entry in this bucket, add it to the list as is.
            // Also, this entry is visible from this level (at least)
            let rec = list[0]
            rec.minLevel = level;
            result.push(rec);
            continue;
        }
        // More than 2 records in that bucket.
        // Split this bucket contents into up to 4
        list = optimizeSet(list, level + 1);
        if (list.length == 1) {
            // Only 1 of sub-buckets had children, promote it to this level
            let rec = list[0]
            rec.minLevel = level;
            result.push(rec)
            continue;
        }
        // Multiple records in different sub-buckets
        // Introduce a new fake record that combines all recs in this bucket
        let sumLat = 0, sumLng = 0, avgSnaps = [], sumWeight = 0;
        let minLat, maxLat, minLng, maxLng;
        minLat = maxLat = list[0].lat;
        minLng = maxLng = list[0].lng;
        for (let l = 0; l < list.length; l++) {
            let rec = list[l];
            let recWeight = rec.weight;
            sumLat += rec.lat * recWeight;
            sumLng += rec.lng * recWeight;
            minLat = Math.min(minLat, rec.minLat);
            maxLat = Math.max(maxLat, rec.maxLat);
            minLng = Math.min(minLng, rec.minLng);
            maxLng = Math.max(maxLng, rec.maxLng);
            for (const [snap, val] of Object.entries(rec.snaps)) {
                // We keep [sum, count] for each snap
                let pair = avgSnaps[snap];
                if (!pair) {
                    pair = [0, 0];
                    avgSnaps[snap] = pair;
                }
                pair[0] += val * recWeight;
                pair[1] += recWeight;
            }
            sumWeight += rec.weight;
            // Mark rec as not visible at this or lower levels
            rec.minLevel = level + 1;
        }

        let snaps = {}
        for (const [snap, pair] of Object.entries(avgSnaps)) {
            snaps[snap] = pair[0] / pair[1];
        }
        let lat = sumLat / sumWeight;
        let lng = sumLng / sumWeight;
        let rec = {
            lat: lat,
            lng: lng,
            position: new google.maps.LatLng(lat, lng),
            snaps: snaps,
            weight: sumWeight,
            minLevel: level,
            maxLevel: level,
            minLat: minLat,
            maxLat: maxLat,
            minLng: minLng,
            maxLng: maxLng,
        };

        result.push(rec);

        // Also add this new record to the global list of groups
        groups.push(rec);
    }
    return result;
}

function optimizeRecs()
{

    groups = [];
    for (let r = 0; r < recs.length; r++) {
        let rec = recs[r];
        rec.weight = 1;
        rec.minLat = rec.lat;
        rec.maxLat = rec.lat;
        rec.minLng = rec.lng;
        rec.maxLng = rec.lng;
    }
    optimizeSet(recs, 1);
}

function parseData(data)
{
    if (USE_ZSTD) {
        const compressedBuf = data;
        const compressed = new Uint8Array(compressedBuf);
        const decompressed = fzstd.decompress(compressed);
        const decompressedString = new TextDecoder().decode(decompressed);

        data = JSON.parse(decompressedString)
    } else {
        // Nothing to do, data is in JSON already
    }

    recs = data;
    console.log(`Consumed ${recs.length} records`);

    for (let i = 0; i < recs.length; i++) {
        let rec = recs[i];

        let feeds = rec.feeds;
        let snaps = {};
        let last = 0;

        for (let f = 0; f < feeds.length; f += 2) {
            let delta = feeds[f];
            let val = feeds[f + 1];
            let aqi = PurpleAirApi.aqiFromPM(val);
            let tm = last + 60 * delta;
            snaps[tm] = aqi;
            last = tm;

            if (!minTm) {
                minTm = tm;
                maxTm = tm;
            }
            minTm = Math.min(minTm, tm);
            maxTm = Math.max(maxTm, tm);

            console.assert(minTm > 10000, `minTm=${minTm} maxTm=${maxTm} tm=${tm}`);
        }

        rec.snaps = snaps;

        // We try to use "lng" ipo "long" everywhere
        rec.lng = rec.long;
        delete rec.long;

        let position = new google.maps.LatLng(rec.lat, rec.lng);
        let label = `id: <b>${rec.id}</b>`

        let icon = {
            url: "img/icon-0.png",
            scaledSize: new google.maps.Size(16, 16)
        }

        const marker = new google.maps.Marker({
            position: position,
            icon: icon,
            title: label,
            opacity: 0.5,
            optimized: true,
            visible: false,
        });

//        marker.addListener("click", showMarkerInfo.bind(this, rec));

        rec.marker = marker;
        rec.icon = icon;
        rec.position = position;
        rec.visible = false;
    }

    curTm = minTm;
}

function consumeData(data)
{
    parseData(data);
    optimizeRecs();
    $("#tm").html(`Data ready`);
}

export {consumeData, updateData, visibleRecs, setCurTm, USE_ZSTD, lastDataGen, DELAY}