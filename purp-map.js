// See also: https://gispub.epa.gov/airnow/?xmin=-13664250.073993878&ymin=4437038.424618474&xmax=-13515534.191762239&ymax=4531093.194773805&clayer=none&mlayer=ozonepm
// ●
const USE_ZSTD = true;

var map;
var recs;
var minTm = null, maxTm = null;

var curTm;
var infowindow;

var visibleRecs;

const DELAY = 250;  // ms

function updateTimeSlider(value)
{
    console.log(value);
    curTm = parseInt(value);
}

function showMarkerInfo(rec)
{
    if (!infowindow) {
        infowindow = new google.maps.InfoWindow({
            maxWidth: 200,
        });
    }
    infowindow.setContent(`ID: ${rec.id}<br>Label: ${rec.label}`)
    infowindow.open({
        anchor: rec.marker,
        map,
        shouldFocus: false
    });
}

function animate()
{
    let HOUR_SEC = 3600;
    window.setInterval(() => {
        if (!map) {
            return;
        }
        bounds = map.getBounds();
        if (!bounds) {
            return;
        }

        curTm = curTm + HOUR_SEC;
        if (curTm > maxTm) {
            return;
            curTm = minTm;
        }

        visibleRecs = [];

        recs.forEach(rec => {
            let aqi = rec.snaps[curTm];
            if (!bounds.contains(rec.position) || !aqi) {
                // Not visible
                if (rec.visible) {
                    rec.visible = false;
                    rec.marker.setMap(null);
                }
                return;
            }
            // Visible
            visibleRecs.push(rec);
            rec.currentAqi = aqi;
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

        $("#tm").html(`Time: ${new Date(curTm * 1000)} (${visibleRecs.length}/${recs.length} sensors)`);
        $("#time-slider").attr("min", minTm).attr("max", maxTm).attr("step", HOUR_SEC).attr("value", curTm).val(curTm);
    }, DELAY);
}


function consume(data)
{
    if (USE_ZSTD) {
        const compressedBuf = data;
        const compressed = new Uint8Array(compressedBuf);
        const decompressed = fzstd.decompress(compressed);
        const decompressedString = new TextDecoder().decode(decompressed);

        data = JSON.parse(decompressedString)
    } else {
//        data = await data.json();
    }

    recs = data;
    console.log(`Consumed ${recs.length} records`);

    for (let i = 0; i < recs.length; i++) {
        let rec = recs[i];

        let feeds = rec.feeds;
        let snaps = {};
        let last = 0;
        let lastColor;

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

            if (minTm < 10000) {
                console.log(`minTm=${minTm} maxTm=${maxTm} tm=${tm}`);
                foo;
            }
        }

        rec.snaps = snaps;

        let position = new google.maps.LatLng(rec.lat, rec.long);
        let label = `id: <b>${rec.id}</b>`

        icon = {
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
    animate()
}

function update_url()
{
    let zoom = map.getZoom();
    let center = map.getCenter();

    url = `${window.location.pathname}?zoom=${zoom}&lat=${center.lat()}&lng=${center.lng()}`;
    window.history.pushState('page2', 'Purp-Map', url);

    return true;
}

async function initMap() {
    let elem = document.getElementById('map');

    let mapTypeId = "roadmap";

    // Handle optional map parameters
    let zoom = parseInt($.QueryString.zoom || "12");
    let lat = parseFloat($.QueryString.lat || "37.382");
    let lng = parseFloat($.QueryString.lng || "-122.064");

    map = new google.maps.Map(elem, {
        center: new google.maps.LatLng(lat, lng),
        zoom: zoom,
        mapTypeId: mapTypeId,
        mapId: "44f4acbc0b00dbf9"
    });
    return map;
}

function initWithGL()
{
    runGL(false);
}

async function initWithMaps()
{
    map = await initMap();

    map.addListener('zoom_changed', update_url);
    map.addListener('center_changed', update_url);

    runGL(true);

    const dataFile = "purp-map-data/preproc.json" + (USE_ZSTD ? ".zst" : "")
    if (USE_ZSTD) {
        fetch(dataFile).then(data => data.arrayBuffer()).then(consume);
    } else {
        fetch(dataFile).then(data=>data.json()).then(consume);
    }

}

function init()
{
    let key = GOOGLE_MAPS_API_KEY;
    if (!key) {
        alert("Google maps key missing");
        return;
    }
    console.log(`Using api key: ${key}`);
    let maps_url = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=&v=beta`
    $.getScript(maps_url, initWithMaps);
}
