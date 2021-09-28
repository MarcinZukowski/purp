// See also: https://gispub.epa.gov/airnow/?xmin=-13664250.073993878&ymin=4437038.424618474&xmax=-13515534.191762239&ymax=4531093.194773805&clayer=none&mlayer=ozonepm

import {runGL} from './purp-map-gl.js'
import {initMap} from "./purp-map-gmap.js";
import {setCurTm, USE_ZSTD, DELAY, consumeData, updateData} from "./purp-map-state.js";

var infowindow;

function updateTimeSlider(value)
{
    setCurTm(parseInt(value));
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
    window.setInterval(updateData, DELAY);
}

function update_url()
{
    let zoom = map.getZoom();
    let center = map.getCenter();

    let url = `${window.location.pathname}?zoom=${zoom}&lat=${center.lat()}&lng=${center.lng()}`;
    window.history.pushState('page2', 'Purp-Map', url);

    return true;
}

function initWithGL()
{
    runGL(false);
}

async function consume(data)
{
    await consumeData(data);
    animate();
}

function initWithMaps(map)
{
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

async function init()
{
    let map = await initMap(initWithMaps);
    initWithMaps(map);
}

// Make it visible for onload
window.init = init;