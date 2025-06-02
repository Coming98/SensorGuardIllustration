import * as d3 from 'd3';

export async function load({ fetch }) {

    const item_name = 'OnePlus-12-Armour';
    const res_item = await fetch(`/${item_name}-Sensor_data.csv`);
    if (!res_item.ok) throw new Error(`Failed to load ${item_name}-Sensor_data.csv`);
    const text_item = await res_item.text();
    // parse the string into an array of objects.
    // d3.autoType will automatically detect the types of the columns
    const dataset_item = d3.csvParse(text_item, d3.autoType);
    const dataset_item_aggregate = transformSensorData(dataset_item)

    // load the json data in '/static/S9.json'
    const res_item_json = await fetch(`/${item_name}.json`);
    if (!res_item_json.ok) throw new Error(`Failed to load ${item_name}.json`);
    const text_item_json = await res_item_json.text();
    // Parse the JSON using d3.jsonParse and d3.autoType for auto type detection
    const dataset_item_show = JSON.parse(text_item_json);
    // const dataset_item_show = jsonArray.map(d3.autoType);
    return { dataset_item, dataset_item_aggregate, dataset_item_show, item_name };
}
function transformSensorData(sensorData) {
    const REGION_NAMES = ['INSTL', 'FG', 'BG', 'STOP', 'RM'];
    const DURATION_THRESHOLD = 2.0;
    const SENSOR_THRESHOLDS = {
        Accelerometer: 1.5,
        Gyroscope: 1.5,
        Magnetometer: 1.5
    };

    // Nest by Category, CategoryIndex, VenderIdentifier, then Sensor
    const grouped = d3.group(
        sensorData,
        (d) => `${d.Category}|${d.CategoryIndex}|${d.VenderIdentifier}|${d.Sensor}`
    );

    const result = [];

    for (const [key, records] of grouped) {
        const [category, categoryIndex, vender, sensor] = key.split('|');
        const threshold = SENSOR_THRESHOLDS[sensor];

        const regions = d3.group(records, (d) => d.Region);
        const item = {
            Category: category,
            CategoryIndex: categoryIndex,
            VenderIdentifier: vender,
            Sensor: sensor
        };

        // Per-region features
        for (const region of REGION_NAMES) {
            const regionData = regions.get(region) || [];

            const freqOverThreshold = regionData.filter((d) => d.Frequency > threshold);

            item[`${region}_Max`] = d3.max(regionData, (d) => d.Frequency) ?? 0;
            item[`${region}_Min`] = d3.min(regionData, (d) => d.Frequency) ?? 0;
            item[`${region}_Duration`] =
                d3.sum(freqOverThreshold, (d) => d.Duration) ?? 0;

            const first = regionData[0];
            const last = regionData[regionData.length - 1];
            item[`${region}_Start`] =
                first.Duration > DURATION_THRESHOLD ? first.Frequency : regionData[1].Frequency;
            item[`${region}_End`] =
                last.Duration > DURATION_THRESHOLD
                    ? last.Frequency
                    : regionData[regionData.length - 2].Frequency;
        }

        // Sensor-level aggregations
        item[`Max`] = d3.max(
            REGION_NAMES.map((r) => item[`${r}_Max`] ?? 0)
        );
        item[`Min`] = d3.max(
            REGION_NAMES.slice(1, 3).map((r) => item[`${r}_Min`] ?? 0)
        ); // FG, BG
        item[`Duration`] = d3.sum(
            REGION_NAMES.map((r) => item[`${r}_Duration`] ?? 0)
        );

        // Region differences (e.g. FG2BG = BG_Start - FG_End)
        for (let i = 0; i < 4; i++) {
            const regionU = REGION_NAMES[i];
            const regionV = REGION_NAMES[i + 1];
            const endU = item[`${regionU}_End`] ?? 0;
            const startV = item[`${regionV}_Start`] ?? 0;
            item[`${regionU}2${regionV}`] = startV - endU;
        }

        result.push(item);
    }

    return result;
}