let map;

const MIN_ZOOM_LEVEL = 5;

async function initMap(callback) {
    let key = GOOGLE_MAPS_API_KEY;
    if (!key) {
        alert("Google maps key missing");
        return;
    }
    console.log(`Using api key: ${key}`);

    // Fetch the maps API
    let maps_url = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=&v=beta`
    await $.getScript(maps_url);

    // Handle optional map parameters
    let zoom = parseInt($.QueryString.zoom || "12");
    let lat = parseFloat($.QueryString.lat || "37.382");
    let lng = parseFloat($.QueryString.lng || "-122.064");

    // Create a map
    let elem = document.getElementById('map');
    let mapTypeId = "roadmap";
    map = new google.maps.Map(elem, {
        center: new google.maps.LatLng(lat, lng),
        zoom: zoom,
        mapTypeId: mapTypeId,
        mapId: "44f4acbc0b00dbf9",
        minZoom: MIN_ZOOM_LEVEL,
    });

    return map;
}

export {map, initMap, MIN_ZOOM_LEVEL}
