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
        dom.scrollTop = dom.scrollHeight;

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
