// See also: https://gispub.epa.gov/airnow/?xmin=-13664250.073993878&ymin=4437038.424618474&xmax=-13515534.191762239&ymax=4531093.194773805&clayer=none&mlayer=ozonepm

import {runGL} from './purp-map-gl.js'
import {initMap, map} from "./purp-map-gmap.js";
import {loadData, updateData, setCurTm, DELAY} from "./purp-map-state.js";

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

function startAnimation()
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

async function initWithMaps(map)
{
    map.addListener('zoom_changed', update_url);
    map.addListener('center_changed', update_url);

    runGL(true);

    await loadData();

    startAnimation();
}

async function init()
{
    let map = await initMap(initWithMaps);
    initWithMaps(map);
}

// Make it visible for html
window.init = init;
window.updateTimeSlider = updateTimeSlider;