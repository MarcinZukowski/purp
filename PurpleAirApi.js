class PurpleAirApi {

    static boundaries = this.generateBoundaries();

    static gradient = this.generateGradient();

    static getSensorData(sensor)
    {
        let url = `https://www.purpleair.com/json?show=${sensor.id}&key=${sensor.key}`;

        $.ajax({
            type: "GET",
            url: url,
            processData: false,
            error: function(sensor) { sensor.raiseError("Can't load data"); }.bind(this, sensor),
            success: sensor.consumeData.bind(sensor)
        });
    }

    static getSensorTimeline(sensor)
    {
        let channel = sensor.results.THINGSPEAK_PRIMARY_ID;
        let api_key = sensor.results.THINGSPEAK_PRIMARY_ID_READ_KEY;
        let field = 2;
        let start = "2020-09-12%2000:54:08";
        let average = 10;

        let url = `https://api.thingspeak.com/channels/${channel}/fields/${field}.json?start=${start}&offset=0&round=2&average=${average}&api_key=${api_key}`

        $.ajax({
            type: "GET",
            url: url,
            processData: false,
            error: function(sensor) { sensor.raiseError("Can't load timeline data"); }.bind(this, sensor),
            success: sensor.consumeTimelineData.bind(sensor)
        });
    }
    static generateBoundaries()
    {
        function rgb(r, g, b) {
            let comp = val => "0".concat(val.toString(16)).substr(-2,2);
            return "#" + comp(r) + comp(g) + comp(b);
        }

        let boundary_data = [
            [    0,  rgb(104,225,67), "Good"],
            [   50,  rgb(255,255,85), "Moderate"],
            [  100,  rgb(239,133,51), "Unhealthy for S.G."],
            [  150,  rgb(234,51,36),  "Unhealthy"],
            [  200,  rgb(140,26,75),  "Very Unhealthy"],
            [  300,  rgb(115,20,37),  "Hazardous"],
            [  500,  rgb(65,0,25),  "Here be monsters"],
            [  1000,  rgb(65,0,25),  ""],
        ];
        this.boundaries_max = 1000;


        let boundaries = boundary_data.map(v => {
            return {
                low: v[0],
                color: v[1],
                label: v[2]
            }
        });
        boundaries.forEach((v,i, a) => a[i].high = a[i + 1]?.low || 1000);
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

    // Verbatim pasted from https://docs.google.com/document/d/15ijz94dXJ-YAZLi9iZ_RaBwrZ4KtYeCy08goGBwnbCU/edit
    // Only changed "function" to "static"

    static aqiFromPM(pm) {
        if (isNaN(pm)) return "-";
        if (pm == undefined) return "-";
        if (pm < 0) return pm;
        if (pm > 1000) return "-";
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
