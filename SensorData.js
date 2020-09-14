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
        let pm = 1.0 * stats[si[0]];
        let aqi = PurpleAirApi.aqiFromPM(pm);
        let color = PurpleAirApi.aqiColor(aqi)
        return {
            label: si[1],
            aqi: aqi,
            pm: pm,
            color: color
        }
    }
}
