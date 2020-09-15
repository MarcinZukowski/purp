class SensorData{
    results;
    error;
    currentStatus = "initializing"

    toString()
    {
        return `SensorData(id=${this.id}, key=${this.key}, results=${this.results}, error=${this.error})`;
    }

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
        fun(`Created ${this}`);

        this.currentStatus = "Loading sensor data"

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
        this.clearError();
        this.results = data.results[0];

        this.currentStatus = "Loading sensor timeline"
        PurpleAirApi.getSensorTimeline(this);
    }

    consumeTimelineData(data)
    {
        this.clearError();
        Vue.set(this.results, "timeline", data);

        this.currentStatus = "Drawing chart";
        this.drawChart();
        this.currentStatus = "Ready";
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
        let map = this.getMapURL(si.minutes);
        let text = aqi >= 100 ? "white" : "black";
        return {
            label: si.label,
            aqi: aqi,
            pm: pm,
            color: color,
            text: text,
            map: map,
        }
    }

    getInfoURL()
    {
        return `https://www.purpleair.com/sensorlist?show=${this.id}&key=${this.key}`;
    }

    getMapURL(minutes = 10, mode = "AQI")
    {
        if (!this.results) {
            return null;
        }
        let zoom = 17;
        let lat = this.results.Lat;
        let lon = this.results.Lon;
        return `https://www.purpleair.com/map?opt=1/m${mode}/a${minutes}/cC0&key=${this.key}&select=${this.id}#${zoom}/${lat}/${lon}`
    }

    getTempF()
    {
        if (!this.results) {
            return null;
        }
        return 1.0 * this.results.temp_f;
    }

    getTempURL()
    {
        return this.getMapURL(10, "TEMP");
    }

    drawChart()
    {
        let divId = 'chart-' + this.key;

        // Shared line settings
        let line = {
            width: 3,
            caps: { end_type:'arrow', },
        };

        let chart = JSC.chart(divId,{
            debug: true,
            type: 'line',
            toolbar: {
                items: {
                    Refresh: {
                        // TODO
                    },
                }
            },
            axisToZoom: 'x',
            title:{
                label:{
                    text: 'AQI over time',
                    style_fontSize: 16
                },
                position:'center'
            },
            legend_visible: false,
            annotations:[
                {
                    label_text:'Data from PurpleAir',
                    position:'inside top',
                    fill:['white', .5],
                    margin:[10, 10],
                }
            ],
            defaultAxis_label_style_fontWeight:'bold',
            yAxis:{
                label_text:'AQI',
                scale_interval:50,
                line: line,
                markers: PurpleAirApi.boundaries.map(v => {
                    return {
                        value: [v.low, v.high],
                        color: [v.color, 0.7],
                        label_text: v.label,
                    }
                }),
                defaultTick:{
                    enabled: false,
                    label_text: '%Value',
                    line_width: 2
                },
                customTicks: PurpleAirApi.boundaries.map(v => v.low),
            },
            xAxis: {
                line: line,
                label_text:'Time',
                scale_type: 'time',
                formatString: 'HH:mm<br/>MMM dd'
            },
//            defaultPoint_tooltip: '%xValue<br/>%yValue',
            series: [
                {
                    name: 'AQI over time',
                    defaultPoint: {
                        marker_visible: false,
                        focusGlow: {width: 5, color: "black"},
                        color: "red",
                    },
                    mouseTracking_enabled: true,
                    line_width:2,
                    points: this.results.timeline.feeds.map(
                        v => [v.created_at, PurpleAirApi.aqiFromPM(v.field2)]
                    )
                },
            ]
        });
    }
}
