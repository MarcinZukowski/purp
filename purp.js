let _statsInfo = [
    ["v",      0, "Real Time"],
    ["v1",    10, "10 min"],
    ["v2",    30, "30 min"],
    ["v3",    60, "1 hour"],
    ["v4",   360, "6 hour"],
    ["v5",  1440, "1 day"],
    ["v6", 10080, "1 week"],
]
let statsInfo = _statsInfo.map(v => {
    return {
        key: v[0],
        minutes: v[1],
        label: v[2],
    };
});

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
    log("Starting");

    app = new Vue({
        el: '#app',
        data: data
    });

    log(`Vue version: ${Vue.version}`);

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
        let sensor = new SensorData(id, keys?.[idx]);
        data.sensors.push(sensor);
        sensor.loadData();
    })
}
