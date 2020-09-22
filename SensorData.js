class SensorData{
    error;
    currentStatus = "initializing";
    chart;
    index;

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
        this.label = id;
        this.key = key;
        this.color = tinycolor("#00c").spin(data.sensors.length * 80).toString();
        this.index = sensorStates.length;
        sensorStates.push({});
        log(`Created ${this} at index ${this.index}`);
    }

    state()
    {
        return sensorStates[this.index];
    }

    setStatus(text)
    {
        this.currentStatus = text;
        log(`[Sensor #${this.key}] ${this.currentStatus}`);
    }

    loadData()
    {
        this.setStatus("Loading sensor data");
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

        this.label = results.Label;

        this.setStatus("Loading sensor timeline");
        PurpleAirApi.getSensorTimeline(this);
    }

    consumeTimelineData(data)
    {
        this.clearError();

        this.state().timeline = data;
        this.setStatus("Drawing chart");
        this.drawChart();
        this.setStatus("Chart ready");

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

    getStat(si = statsInfo[0])
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
        this.drawChartHC();
//        this.drawChartJSC();
    }

    computeSeries()
    {
        let series = [];
        for (let idx = 0; idx < data.sensors.length; idx++) {
            let sensor = data.sensors[idx];
            let timeline = sensor.state().timeline;
            if (!timeline) {
                continue;
            }
            series.push(
                {
                    name: sensor.label,
                    color: sensor.color,
                    line_width: idx == 0 ? 2 : 1,
                    data: timeline.feeds.map(
                        v => [new Date(v.created_at).getTime(), PurpleAirApi.aqiFromPM(v.field2)]
                    )
                }
            );
        }
        return series;
    }

    // JSCharting
    drawChartJSC()
    {
        let divId = 'chart';

        // Shared line settings
        let axisLine = {
            width: 3,
            caps: { end_type:'arrow', },
        };

        function doZoom(ms, retry = true)
        {
            log(`doZoom: ${ms}`);
            let chart = this.state().chart;
            if (chart) {
                chart.zoom([Date.now() - ms, 0, ms, 0]);
            } else {
                log("...retrying");
                run_delayed(1000, doZoom.bind(this, ms, false));
            }
        }

        let series = this.computeSeries();
        // JSC specific
        series.forEach((s, idx) => {
            s.defaultPoint = {
                marker_visible: false,
                    focusGlow: {width: 5, color: "black"},
            };
            s.mouseTracking_enabled = true;
            s.line_width = (idx === 0) ? 2 : 1;

        });

        this.state().chart = JSC.chart(divId,{
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
            legend_visible: false,
            annotations:[
                {
                    position:'inside top',
                    fill:['white', .5],
                    margin:[10, 10],
                }
            ],
            defaultAxis_label_style_fontWeight:'bold',
            yAxis:{
                label_text:'AQI',
                scale_interval:50,
                line: axisLine,
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
                line: axisLine,
                label_text:'Time',
                scale_type: 'time',
                formatString: 'HH:mm<br/>MMM dd yyyy',
            },
            series: series
//            defaultPoint_tooltip: '%xValue<br/>%yValue',
        });
    }

    // HighChart
    drawChartHC()
    {
        let divId = 'chart';
        let series = this.computeSeries();

        // HC specific
        series.forEach((s, idx) => {
            s.lineWidth = (idx === 0) ? 2 : 1;
        })

        let plotBands = PurpleAirApi.boundaries.map(v => {
            return {
                from: v.low,
                to: v.high,
                color: `rgba(${v.rgb[0]},${v.rgb[1]},${v.rgb[2]},0.4)`,
                label: {
                    text: v.label,
                    verticalAlign: "middle"
                }
            }
        });

        Highcharts.setOptions({
            time: {
                useUTC: false,
            }
        });

        this.state().chart = Highcharts.chart(divId, {
            chart: {
                type: 'line',
                zoomType: 'x',
                animation: {
                    duration: 300
                }
            },
            title: {
                text: "AQI over time"
            },
            tooltip: {
                crosshairs: true,
                split: false,
                shared: true,
                enabled: true,
            },
            xAxis: {
                type: "datetime",
                title: {
                    text: 'Time'
                },
                _tickInterval: 1000 * 3600 * 24,
                _labels: {
                    format: "{value:%Y-%m-%d}"
                },
                gridLineWidth: 1,
                gridLineColor: `rgba(200,200,200,0.4)`
            },
            yAxis: {
                crosshair: true,
                title: {
                    text: 'AQI'
                },
                tickInterval: 50,
                plotBands: plotBands,
                gridLineWidth: 0,
            },
            series: series,
        });

        let zooms = [
            ["3 hours", 3 * HOUR],
            ["1 day", 1 * DAY],
            ["1 week", 1 * WEEK],
            ["4 weeks", 4 * WEEK]
        ];

        function zoom(ms) {
            log(`Zooming to ${ms}`);
            let axis = this.state().chart.xAxis[0];
            if (ms) {
                axis.setExtremes(Date.now() - ms, Date.now());
            } else {
                axis.setExtremes();
            }
        }

        $("#chart-bottom").html(`<button class="btn btn-primary hc-zoom-btn" id="zoom-reset">Reset zoom</button>`);
        $("#zoom-reset").click(zoom.bind(this, null))

        for (let i = 0; i < zooms.length; i++) {
            let z = zooms[i];
            $("#chart-bottom").append(`<button class="btn btn-info hc-zoom-btn" id="zoom-${i}">${z[0]}</button>`);
            $(`#zoom-${i}`).click(zoom.bind(this, z[1]));
        }

        zoom.bind(this)(1 * DAY);
    }
}
