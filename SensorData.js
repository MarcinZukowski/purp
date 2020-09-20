class SensorData{
    results;
    error;
    currentStatus = "initializing"

    START_BOX_SIZE = 4000;
    MAX_BOX_SIZE = 32000; // meters
    MIN_NEIGHBOR_COUNT = 5;

    toString()
    {
        return `SensorData(id=${this.id}, key=${this.key}, results=${this.results}, error=${this.error})`;
    }

    constructor(id, key)
    {
        this.id = id;
        this.key = key;
        fun(`Created ${this}`);

        this.setStatus("Loading sensor data");

        this.loadData();
    }

    setStatus(text)
    {
        this.currentStatus = text;
        log(`[Sensor #${this.key}] ${this.currentStatus}`);
    }

    loadData()
    {
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
        let results = data.results[0];

        results.nearby = {}
        this.results = data.results[0];

        this.setStatus("Loading sensor timeline");
        PurpleAirApi.getSensorTimeline(this);
    }

    consumeTimelineData(data)
    {
        this.clearError();
        Vue.set(this.results, "timeline", data);

        this.setStatus("Drawing chart");
        this.drawChart();
        this.setStatus("Ready");

//        this.loadNeighbors(this.START_BOX_SIZE);
    }

    loadNeighbors(box_meters)
    {
        log(`Looking for neighbors in the ${box_meters} meters box`);
        PurpleAirApi.findNeighbors(this.results.Lat, this.results.Lon, box_meters,
            this.consumeNeighborData.bind(this, box_meters),
            this.setStatus.bind(this, "ERROR: Can't load neighbors"));
    }

    consumeNeighborData(box_meters, data)
    {
        log(`Got data: ${data}`);
        log(JSON.stringify(data));
        log(`Found ${data.count} neighbors in the box of ${box_meters} meters`);
        if (data.count < this.MIN_NEIGHBOR_COUNT && box_meters * 2 < this.MAX_BOX_SIZE) {
            this.loadNeighbors(box_meters * 2);
        } else {
            log("OK");
        }
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

    getNearbyStat(si)
    {
        let count = 0;
        return "?";
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

        function doZoom(ms)
        {
            log(`doZoom: ${ms}`);
            chart.zoom([Date.now() - ms, 0, ms, 0]);
        }
        const SECOND = 1000;
        const HOUR = 3600 * SECOND;
        const DAY = 24 * HOUR;
        const WEEK = 7 * DAY;

        let chart = JSC.chart(divId,{
            debug: true,
            type: 'line',
            events_load: doZoom.bind(this, 1 * DAY),
            toolbar: {
                items: {
                    "3 hours": {
                        events_click: doZoom.bind(this, 3 * HOUR),
                    },
                    "1 day": {
                        events_click: doZoom.bind(this, 1 * DAY),
                    },
                    "1 week": {
                        events_click: doZoom.bind(this, 1 * WEEK),
                    },
                    "4 weeks": {
                        events_click: doZoom.bind(this, 4 * WEEK),
                    },
                }
            },
            axisToZoom: 'x',
            title:{
                label:{
                    text: 'AQI over time',
                    style_fontSize: 14
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
                formatString: 'HH:mm<br/>MMM dd yyyy',
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
