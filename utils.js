// From http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript

(function($)
{
    $.QueryString = (function(a) {
        if (a == "") return {};
        let b = {};
        for (let i = 0; i < a.length; ++i)
        {
            const p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

/**
 * Log text including the calling function name
 * @param level  Override to print Nth function name in stack
 */
function fun(text, level)
{
    if (text == null)
        text = "";

    let func = arguments.callee.caller;
    while (func && level > 1) {
        func = func.arguments.callee.caller;
        level--;
    }
    const name = func?.name || "?";
    console.log("PURP::" + name + ": " + text)
}

// Like fun(), but log JSON objects
function funj(j, varname) {
    let string = "";
    if (varname)
        string = varname + "=";
    string += JSON.stringify(j);

    fun(string, 2);
}

function log(text)
{
    // Log to console
    console.log(text);

    // Log to our div
    let elem = $("#log");
    if (elem) {
        let dateStr = new Date().toISOString();
        elem.append(`[${dateStr}] ${text}<br/>`);
        // Scroll to bottom
        let dom = elem[0];
        if (dom) {
            dom.scrollTop = dom.scrollHeight;
        }

    }
}

function computeLatLonBox(lat, lon, box_meters)
{
    const r_earth = 6371008;  // mean radius according to IUGG
    const pi = Math.PI;
    let delta = box_meters / 2;
    let nwlat = lat + (delta / r_earth) * (180 / pi);
    let selat = lat - (delta / r_earth) * (180 / pi);
    let nwlon = lon - (delta / r_earth) * (180 / pi) / Math.cos(lat * pi/180);
    let selon = lon + (delta / r_earth) * (180 / pi) / Math.cos(lat * pi/180);
    return {
        nwlat: nwlat,
        selat: selat,
        nwlon: nwlon,
        selon: selon,
    }
}

function run_delayed(delay, func)
{
    log(`Running with ${delay} ms delay: ${func}`);
    setTimeout(func, delay);
}

// From https://stackoverflow.com/a/48805273/1457258
/**
 * Calculates the haversine distance between point A, and B.
 * @param {number[]} latlngA [lat, lng] point A
 * @param {number[]} latlngB [lat, lng] point B
 * @param {boolean} isMiles If we are using miles, else km.
 */
function haversineDistance([lat1, lon1], [lat2, lon2], isMiles = false)
{
    const toRadian = angle => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(lat2, lat1);
    const dLon = distance(lon2, lon1);

    lat1 = toRadian(lat1);
    lat2 = toRadian(lat2);

    // Haversine Formula
    const a =
        Math.pow(Math.sin(dLat / 2), 2) +
        Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.asin(Math.sqrt(a));

    let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

    if (isMiles) {
        finalDistance /= 1.60934;
    }

    return finalDistance;
}

const SECOND = 1000;
const HOUR = 3600 * SECOND;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
