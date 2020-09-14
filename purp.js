let statsInfo = [
    ["v", "Real Time"],
    ["v1", "10 min"],
    ["v2", "30 min"],
    ["v3", "1 hour"],
    ["v4", "6 hour"],
    ["v5", "1 day"],
    ["v6", "1 week"],
]

var app = null;
var data = {
    error: null,
    title: 'Purp?',
    message: 'Hello Vue!!??!?!',
    sensors: [],
    statsInfo: statsInfo
};

function main()
{
    fun("Starting");
    app = new Vue({
        el: '#app',
        data: data
    });

    let shows = $.QueryString.show?.split(',');
    let keys = $.QueryString.key?.split?.(',');
    if (!shows) {
        data.error = "Missing the 'show' param";
        return;
    }
    if (keys && shows.length !== keys.length) {
        data.error = "The number of ids in 'show' doesn't match the number of keys in 'key' params";
        return;
    }

    shows.forEach(function (id, idx) {
        data.sensors.push(new SensorData(id, keys[idx]))
    })
}
