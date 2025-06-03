<script>
	import * as d3 from 'd3';
	import Axis from './Axis.svelte';

	let {
		dataset,
		dataset_line,
		thresholds,
		selectedCategory,
		targetSensors,
		selectedDensityNames,
		selectedStageButtonNames,
		stageLabel2Abbreviation,
		colors,
		width,
		height,
		marginLeft,
		marginTop,
		marginRight,
		marginBottom
	} = $props();

	let filteredDataset = $derived(
		dataset.filter(
			(item) =>
				selectedCategory === item.Category &&
				selectedDensityNames.includes(item.Sensor) &&
				[...selectedStageButtonNames].some(
					(stageLabel) =>
						item[stageLabel2Abbreviation[stageLabel] + '_Max'] > thresholds[item.Sensor]
				)
		)
	);
	let filteredIndexes = $derived(filteredDataset.map((item) => parseInt(item.CategoryIndex, 10)));
	let filteredAPPDataset = $derived(
		dataset_line
			.filter(
				(item) => item.category == selectedCategory && filteredIndexes.includes(item.category_index)
			)
			.sort((a, b) => a.category_index - b.category_index)
	);
	let appNames = $derived(filteredAPPDataset.map((item) => get_short_name(item)));

	const subGraphWidth = 415;
	const paddingWidth = 20;
	let totalWidth = $derived(
		appNames.length * (subGraphWidth + paddingWidth) + marginLeft + marginRight
	);

	const globalX = $derived(
		d3
			.scaleBand()
			.domain(appNames)
			.range([marginLeft - marginLeft, totalWidth - marginRight - marginLeft])
			.padding(0.2)
	);

	const globalY = $derived(
		d3
			.scaleBand()
			.domain(targetSensors)
			.range([marginTop, height - marginBottom])
			.padding(0.2)
	);

	let illustratedDataset = $derived(
		filteredAPPDataset.map((appData) => {
			const temp = globalX.bandwidth();
			appData.sensor_data = appData.sensor_data.map((sensorInfo) => {
				let maxFreq = d3.max(sensorInfo.freq_data, (d) => d.freq);
				const maxTime = d3.max(sensorInfo.freq_data, (d) => d.time);
				maxFreq = d3.max([maxFreq, 1.8]);
				const lineX = d3.scaleLinear().domain([0, maxTime]).nice().range([0, globalX.bandwidth()]);
				const lineY = d3.scaleLinear().domain([0, maxFreq]).nice().range([globalY.bandwidth(), 0]);
				return {
					...sensorInfo,
					max_freq: maxFreq,
					max_time: maxTime,
					lineX: lineX,
					lineY: lineY,
					line: d3
						.line()
						.x((d) => lineX(d.time))
						.y((d) => lineY(d.freq))
				};
			});
			return appData;
		})
	);

	// x = d3.scaleTime()
	// .domain(monthExtent)
	// .range([margin.left, width - margin.right])

	// y = d3.scaleLinear()
	// .domain([0, maxInjuries]).nice()
	// .range([height - margin.bottom, margin.top])

	// const x1 = $derived(
	// 	d3.scaleBand().domain(illustratedSensorNames).range([0, x0.bandwidth()]).padding(0.05)
	// );

	// Line generator

	function get_short_name(app) {
		let appIndex = app.category_index;
		let appName = app.name;
		if (appName.includes('-')) {
			appName = app.name.split('-')[0].trim();
		} else if (appName.includes(':')) {
			appName = app.name.split(':')[0].trim();
		} else if (appName.includes('_')) {
			appName = app.name.split('_')[0].trim();
		} else if (appName.includes('.')) {
			appName = app.name.split('.')[0].trim();
		} else {
			appName = app.name.trim();
		}

		return '#' + appIndex + ' ' + appName;
	}
</script>

<!--  -->
<svg
	{totalWidth}
	{height}
	style="position: absolute; pointer-events: none; z-index: 1; width: 90vw;"
>
	<Axis
		orientation={'left'}
		scale={globalY}
		{width}
		{height}
		{marginLeft}
		{marginBottom}
		label="Sensor"
	/>
</svg>

<div style="overflow-x: auto;" style:margin-left={`${marginLeft}px`}>
	<svg
		width={totalWidth - marginLeft - marginRight}
		{height}
		style="display: block; max-width: none;"
	>
		{#each illustratedDataset as app_info}
			{#each app_info.sensor_data as sensor_data}
				{#if targetSensors.includes(sensor_data.sensor_name)}
					{@const maxFreq = d3.max([d3.max(sensor_data.freq_data, (d) => d.freq), 1.8])}
					{@const maxTime = d3.max(sensor_data.freq_data, (d) => d.time)}
					{@const lineX = d3
						.scaleLinear()
						.domain([0, maxTime])
						.nice()
						.range([0, globalX.bandwidth()])}
					{@const lineY = d3
						.scaleLinear()
						.domain([0, maxFreq])
						.nice()
						.range([globalY.bandwidth(), 0])}
					{@const line = d3
						.line()
						.x((d) => lineX(d.time))
						.y((d) => lineY(d.freq))}
					<g
						transform="translate({globalX(get_short_name(app_info))}, {globalY(
							sensor_data.sensor_name
						)})"
					>
						<path
							d={line(sensor_data.freq_data)}
							fill="none"
							stroke={colors(sensor_data.sensor_name)}
							stroke-width="1.5"
						/>

						<Axis
							orientation="bottom"
							scale={lineX}
							width={globalX.bandwidth()}
							height={globalY.bandwidth()}
							marginLeft={0}
							marginBottom={0}
						/>
						<Axis
							orientation="left"
							scale={lineY}
							width={globalX.bandwidth()}
							height={globalY.bandwidth()}
							marginLeft={0}
							marginBottom={0}
							coarseTickFlag={true}
						/>
						<g class="grid">
							{#each lineX.ticks() as tick}
								<line
									x1={lineX(tick)}
									x2={lineX(tick)}
									y1={0}
									y2={globalY.bandwidth()}
									stroke="lightgray"
									stroke-dasharray="2,2"
								/>
							{/each}
							{#each lineY.ticks() as tick}
								<line
									x1={0}
									x2={globalX.bandwidth()}
									y1={lineY(tick)}
									y2={lineY(tick)}
									stroke="lightgray"
									stroke-dasharray="2,2"
								/>
							{/each}
						</g>
						{#each app_info.analysis_info as analysis_info}
							<line
								x1={lineX(analysis_info.stage_time)}
								x2={lineX(analysis_info.stage_time)}
								y1={0}
								y2={globalY.bandwidth()}
								stroke="red"
								stroke-width="1"
								stroke-dasharray="2,2"
							/>
							{#if targetSensors[0] === sensor_data.sensor_name}
								<text
									x={lineX(analysis_info.stage_time) + lineX(analysis_info.stage_bias)}
									y={-5}
									text-anchor="middle"
									fill="red"
									font-size="10px"
									font-weight="bold"
								>
									{analysis_info.stage_abbreviation}
								</text>
							{/if}
						{/each}
					</g>
				{/if}
			{/each}
		{/each}
		<Axis
			orientation="bottom"
			scale={globalX}
			width={totalWidth}
			{height}
			{marginLeft}
			{marginBottom}
		/>
	</svg>
</div>
<div
	style="
    position: absolute;
    bottom: 16px;
    right: 12px;
    background: white;
    padding: 4px 8px;
    pointer-events: none;
    font-weight: bold;
"
>
	APP Name
</div>

<style>
	path {
		transition: all 0.4s ease;
	}
</style>
