class PurpleAirApi {

    static CALL_DELAY = 100; // URL call delay, hopefully to reduce throttling

    static boundaries = this.generateBoundaries();

    static gradient = this.generateGradient();

    static getSensorData(sensor)
    {
        let url = `https://www.purpleair.com/json?show=${sensor.id}&key=${sensor.key}`;
        let errorFunc = function(sensor) { sensor.raiseError("Can't load data"); }.bind(this, sensor);
        let successFunc = sensor.consumeData.bind(sensor);

        this.makeTheCall(url, errorFunc, successFunc);
    }

    static getSensorTimeline(sensor)
    {
        let channel = sensor.results.THINGSPEAK_PRIMARY_ID;
        let api_key = sensor.results.THINGSPEAK_PRIMARY_ID_READ_KEY;
        let field = 2;

        let four_weeks = 1000 * 3600 * 24 * 7 * 4;
        let start = new Date(Date.now() - four_weeks).toDateString();
        let average = 10;

        let url = `https://api.thingspeak.com/channels/${channel}/fields/${field}.json?start=${start}&offset=0&round=2&average=${average}&api_key=${api_key}`
        let errorFunc = function(sensor) { sensor.raiseError("Can't load timeline data"); }.bind(this, sensor);
        let successFunc = sensor.consumeTimelineData.bind(sensor);

        this.makeTheCall(url, errorFunc, successFunc);
    }

    static makeTheCall(url, errorFunc, successFunc)
    {
        let startTime = Date.now();

        function onSuccess(data)
        {
            let dur = Date.now() - startTime;
            log(`Request succeeded in ${dur} ms, calling ${successFunc}`)
            successFunc(data);
        }
        function onError(data)
        {
            log(`Handling call error, data: ${JSON.stringify(data)}`)
            if (data.readyState == 4 && data.responseJSON.code == 429) {
                // Possible throttling
                let msg = data.responseJSON.message;
                // Handle "Rate limit exceeded. Try again in XXX milli seconds."
                let m = msg.match(/.*Try again in (\d+) milli.*/);
                if (m && !isNaN(m[1])) {
                    // Throttling detected
                    log(`Detected throttle of ${m[1]} ms`)
                    run_delayed(m[1], PurpleAirApi.makeTheCall.bind(this, url, errorFunc, successFunc));
                    return;
                }
            }
            if (data.readyState == 0) {
                // Some weird error, retry
                log("Error response, retrying");
                run_delayed(1000, PurpleAirApi.makeTheCall.bind(this, url, errorFunc, successFunc));
                return;
            }
            // Can't recover
            log(`ERROR: ${data}`);
            errorFunc(data);
        }

        log(`Calling PurpleAir URL: ${url}`);
        run_delayed(this.CALL_DELAY, () =>
            $.ajax({
                type: "GET",
                url: url,
                processData: false,
                error: onError.bind(this),
                success: onSuccess.bind(this)
            }));
    }

    static generateBoundaries()
    {
        log("generateBoundaries(): start")
        let comp = val => "0".concat(val.toString(16)).substr(-2,2);

        function rgb(r, g, b) {
            return "#" + comp(r) + comp(g) + comp(b);
        }
        function rgba(r, g, b, a) {
            return "#" + comp(r) + comp(g) + comp(b) + comp(a);
        }

        let boundary_data = [
            [    0,  [104,225,67], "Good"],
            [   50,  [255,255,85], "Moderate"],
            [  100,  [239,133,51], "Unhealthy for S.G."],
            [  150,  [234,51,36],  "Unhealthy"],
            [  200,  [140,26,75],  "Very Unhealthy"],
            [  300,  [115,20,37],  "Hazardous"],
            [  500,  [65,0,25],  "Here be monsters"],
            [  1000, [65,0,25],  ""],
        ];
        this.boundaries_max = 1000;


        let boundaries = boundary_data.map(v => {
            return {
                low: v[0],
                color: rgb(v[1][0], v[1][1], v[1][2]),
                rgb: v[1],
                label: v[2]
            }
        });
        boundaries.forEach((v,i, a) => a[i].high = a[i + 1]?.low || 1000);
        log("generateBoundaries(): end")
        return boundaries;
    }

    static generateGradient()
    {
        function rgb(r, g, b) {
            let comp = val => "0".concat(val.toString(16)).substr(-2,2);
            return "#" + comp(r) + comp(g) + comp(b);
        }

        let gradient_colors = this.boundaries.map(v => {
            return {
                color: v.color,
                pos: v.low / this.boundaries_max
            }
        });
        return tinygradient(gradient_colors);
    }

    static aqiColor(aqi)
    {
        let gray = "#aaa";
        if (isNaN(aqi)) {
            return gray;
        }

        aqi = Math.min(aqi, this.boundaries_max)
        return this.gradient.rgbAt(aqi / this.boundaries_max);
    }

    static findNeighbors(lat, lon, box_meters, callback_ok, callback_error)
    {
        let box = computeLatLonBox(lat, lon, box_meters);
        let url = `https://www.purpleair.com/data.json?opt=1/mAQI/a0/cC0&fetch=true&` +
            `nwlat=${box.nwlat}&selat=${box.selat}&nwlng=${box.nwlon}&selng=${box.selon}&fields=pm_0`;

        this.makeTheCall(url, callback_error, callback_ok);
    }


    // Verbatim pasted from https://docs.google.com/document/d/15ijz94dXJ-YAZLi9iZ_RaBwrZ4KtYeCy08goGBwnbCU/edit
    // Only changed "function" to "static"

    static aqiFromPM(pm) {
        if (isNaN(pm)) return null;
        if (pm == undefined) return null;
        if (pm < 0) return pm;
        if (pm > 1000) return null;
        /*
              Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
        Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
        Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
        Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
        Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
        Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
        Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
        */
        if (pm > 350.5) {
            return this.calcAQI(pm, 500, 401, 500, 350.5);
        } else if (pm > 250.5) {
            return this.calcAQI(pm, 400, 301, 350.4, 250.5);
        } else if (pm > 150.5) {
            return this.calcAQI(pm, 300, 201, 250.4, 150.5);
        } else if (pm > 55.5) {
            return this.calcAQI(pm, 200, 151, 150.4, 55.5);
        } else if (pm > 35.5) {
            return this.calcAQI(pm, 150, 101, 55.4, 35.5);
        } else if (pm > 12.1) {
            return this.calcAQI(pm, 100, 51, 35.4, 12.1);
        } else if (pm >= 0) {
            return this.calcAQI(pm, 50, 0, 12, 0);
        } else {
            return undefined;
        }
    }

    static bplFromPM(pm) {
        if (isNaN(pm)) return 0;
        if (pm == undefined) return 0;
        if (pm < 0) return 0;
        /*
              Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
        Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
        Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
        Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
        Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
        Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
        Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
        */
        if (pm > 350.5) {
            return 401;
        } else if (pm > 250.5) {
            return 301;
        } else if (pm > 150.5) {
            return 201;
        } else if (pm > 55.5) {
            return 151;
        } else if (pm > 35.5) {
            return 101;
        } else if (pm > 12.1) {
            return 51;
        } else if (pm >= 0) {
            return 0;
        } else {
            return 0;
        }
    }

    static bphFromPM(pm) {
        //return 0;
        if (isNaN(pm)) return 0;
        if (pm == undefined) return 0;
        if (pm < 0) return 0;
        /*
              Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
        Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
        Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
        Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
        Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
        Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
        Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
        */
        if (pm > 350.5) {
            return 500;
        } else if (pm > 250.5) {
            return 500;
        } else if (pm > 150.5) {
            return 300;
        } else if (pm > 55.5) {
            return 200;
        } else if (pm > 35.5) {
            return 150;
        } else if (pm > 12.1) {
            return 100;
        } else if (pm >= 0) {
            return 50;
        } else {
            return 0;
        }
    }

    static calcAQI(Cp, Ih, Il, BPh, BPl) {
        var a = (Ih - Il);
        var b = (BPh - BPl);
        var c = (Cp - BPl);
        return Math.round((a/b) * c + Il);
    }

    static getAQIDescription(aqi) {
        if (aqi >= 401) {
            return 'Hazardous';
        } else if (aqi >= 301) {
            return 'Hazardous';
        } else if (aqi >= 201) {
            return 'Very Unhealthy';
        } else if (aqi >= 151) {
            return 'Unhealthy';
        } else if (aqi >= 101) {
            return 'Unhealthy for Sensitive Groups';
        } else if (aqi >= 51) {
            return 'Moderate';
        } else if (aqi >= 0) {
            return 'Good';
        } else {
            return undefined;
        }
    }

    static getAQIMessage(aqi) {
        if (aqi >= 401) {
            return '>401: Health alert: everyone may experience more serious health effects';
        } else if (aqi >= 301) {
            return '301-400: Health alert: everyone may experience more serious health effects';
        } else if (aqi >= 201) {
            return '201-300: Health warnings of emergency conditions. The entire population is more likely to be affected. ';
        } else if (aqi >= 151) {
            return '151-200: Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
        } else if (aqi >= 101) {
            return '101-150: Members of sensitive groups may experience health effects. The general public is not likely to be affected.';
        } else if (aqi >= 51) {
            return '51-100: Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.';
        } else if (aqi >= 0) {
            return '0-50: Air quality is considered satisfactory, and air pollution poses little or no risk';
        } else {
            return undefined;
        }
    }
}
