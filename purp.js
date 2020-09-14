var app = null;
var data = {
    error: null,
    title: 'Purp?',
    message: 'Hello Vue!!??!?!',
    sensors: [],
};

class PurpleAPI {

    /** Set headers necessary for accessing PurpleAir */
    static setHeaders(request)
    {
        request.setRequestHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Cookie");
        request.setRequestHeader("Content-Type", "application/json");
        request.setRequestHeader("Accept", "application/json");
    }

    static getSensorData(sensor)
    {
        let url = `https://www.purpleair.com/json?show=${sensor.id}&key=${sensor.key}`;

        fun(url)

        $.ajax({
            type: "GET",
            beforeSend: this.setHeaders,
            url: url,
            processData: false,
            error: function(sensor) { sensor.error = "Can't load data" }.bind(this, sensor),
            success: sensor.consumeData.bind(sensor)
        });
    }
}

class SensorData{
    results;
    error;

    toString()
    {
        return `SensorData(id=${this.id}, key=${this.key}, results=${this.results}, error=${this.error})`;
    }

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
        fun(`Created ${this}`);

        PurpleAPI.getSensorData(this);
    }

    clearError()
    {
        this.error = null;
    }

    consumeData(data)
    {
        fun(data);
        clearError();
        this.results = data;
    }
}

function main()
{
    fun("Starting");
    app = new Vue({
        el: '#app',
        data: data
    });

    shows = $.QueryString.show.split(',');
    fun(shows)
    keys = $.QueryString.key.split?.(',');
    fun(keys);
    if (!shows) {
        data.error = "Missing the 'show' param";
        return;
    }
    if (keys && shows.length != keys.length) {
        data.error = "The number of ids in 'show' doesn't match the number of keys in 'key' params";
        return;
    }

    shows.forEach(function (id, idx) {
        data.sensors.push(new SensorData(id, keys[idx]))
    })

    console.log(location);
    console.log($.QueryString.show);

    console.log($.QueryString.key);


}
