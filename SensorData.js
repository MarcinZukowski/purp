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

        PurpleAirApi.getSensorData(this);
    }

    clearError()
    {
        this.error = null;
    }

    raiseError(msg)
    {
        this.error = msg;
    }

    consumeData(data)
    {
        fun(data);
        this.clearError();
        this.results = data.results[0];

        PurpleAirApi.getSensorTimeline(this);
    }

    consumeTimelineData(data)
    {
        fun(data);
        this.clearError();
        this.results.timeline = data;
    }

    getAQI()
    {
        if (this.results) {
            return PurpleAirApi.aqiFromPM(1.0 * this.results.PM2_5Value);
        } else {
            return "?";
        }
    }

    getAQIColor()
    {
        let aqi = this.getAQI();
        return PurpleAirApi.aqiColor(aqi);
    }

    getStat(si)
    {
        if (!this.results) {
            return null;
        }
        console.log(`results=${JSON.stringify(this.results.Stats)}`)
        let stats = JSON.parse(this.results.Stats);
        let pm = 1.0 * stats[si.key];
        let aqi = PurpleAirApi.aqiFromPM(pm);
        let color = PurpleAirApi.aqiColor(aqi)
        let zoom = 17;
        let lat = this.results.Lat;
        let lon = this.results.Lon;
        let map = `https://www.purpleair.com/map?opt=1/mAQI/a${si.minutes}/cC0&key=${this.key}&select=${this.id}#${zoom}/${lat}/${lon}`
        return {
            label: si.label,
            aqi: aqi,
            pm: pm,
            color: color,
            map: map,
        }
    }
}
