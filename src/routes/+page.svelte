<script>
	import * as d3 from 'd3';
	import './style.css';
	import BarChart from '$lib/components/BarChart.svelte';
	import RainCloudPlot from '../lib/components/RainCloudPlot.svelte';
	import StagePieChart from '../lib/components/StagePieChart.svelte';
	import FreqLineCharts from '../lib/components/FreqLineCharts.svelte';
	import ColorLegend from '../lib/components/ColorLegend.svelte';

	let { data } = $props();

	// ########################## Thresholds Control ##########################
	let AccelerometerThresholds = $state(data.item_name === "OnePlus-12-Armour" ? 5.5 : 1.5);
	let GyroscopeThresholds = $state(1.5);
	let MagnetometerThresholds = $state(1.5);
	let thresholds = $derived({
		Accelerometer: AccelerometerThresholds,
		Gyroscope: GyroscopeThresholds,
		Magnetometer: MagnetometerThresholds
	});

	// ########################## Overview ##########################
	// Overview
	const targetSensors = ['Accelerometer', 'Gyroscope', 'Magnetometer'];
	const targetSensorColors = ['#bd7ebe', '#ffb55a', '#8bd3c7'];
	// const acceLightnessColors = ['#9444a0', '#bd7ebe', '#d9aeda'];
	// const acceLightnessColors = ['#EBAAFC', '#614266', '#bd7ebe'];
	// // const gyroLightnessColors = ['#e39b2f', '#ffb55a', '#ffd7a4'];
	// const gyroLightnessColors = ['#FDBA14', '#A37710', '#ffb55a'];
	// // const magnLightnessColors = ['#5db3a9', '#8bd3c7', '#b8ece3'];
	// const magnLightnessColors = ['#5BDAC1', '#5db3a9', '#8bd3c7'];

	const acceLightnessColors = ['#854B85', '#ddc8da', '#bd7ebe'];
	// const gyroLightnessColors = ['#e39b2f', '#ffb55a', '#ffd7a4'];
	const gyroLightnessColors = ['#E6A949', '#FDE0B7', '#ffb55a'];
	// const magnLightnessColors = ['#5db3a9', '#8bd3c7', '#b8ece3'];
	const magnLightnessColors = ['#5BDAC1', '#D6EEEA', '#8bd3c7'];
	const multipleSensorUsageNames = ['All Sensor Usage', 'Any Sensor Usage', 'None Sensor Usage'];
	const multipleSensorUsageColors = ['#fd7f6f', '#7eb0d5', '#519E3E'];
	const singleSelectableButtonNames = new Set(multipleSensorUsageNames);
	const densityButtonNames = [...multipleSensorUsageNames, ...targetSensors];
	const densityColorNames = [
		...multipleSensorUsageColors,
		...targetSensorColors,
		'#fdcce5',
		'#b2e061',
		'#ffee65'
	];
	const densityButtonNameColors = d3
		.scaleOrdinal()
		.domain(densityButtonNames)
		.range(densityColorNames);

	let categories_item = $derived(
		d3
			.groupSort(
				data.dataset_item_aggregate,
				(g) => g.length,
				(item) => item['Category']
			)
			.reverse()
	);
	let selectedButtonNames = $state(new Set(targetSensors));
	let selectedCategories = $derived(new Set(categories_item));
	let selectedDensityNames = $derived(getSelectedDensityNames(selectedButtonNames, targetSensors));
	let toggleOverviewCategoryButtonName = $derived(
		selectedCategories.size >= categories_item.length / 2 ? 'Reverse' : 'Select All'
	);

	let sortbyName = $state(targetSensors[0]);
	let sortbyIncreaseFlag = $state(true);
	let hoveredButtonName = $state(null);
	let illustrationData = $derived(
		processDataset(
			data.dataset_item_aggregate,
			targetSensors,
			multipleSensorUsageNames,
			selectedButtonNames
		)
	);
	let sortedCategories = $derived(getCategoriesSorted(illustrationData));

	function toggleButton(buttonName) {
		if (singleSelectableButtonNames.has(buttonName)) {
			if (!selectedButtonNames.has(buttonName)) {
				selectedButtonNames.clear();
				selectedButtonNames.add(buttonName);
			}
		} else {
			if (selectedButtonNames.has(buttonName)) {
				if (selectedButtonNames.size >= 2) {
					selectedButtonNames.delete(buttonName);
				}
			} else {
				for (let btn of singleSelectableButtonNames) {
					selectedButtonNames.delete(btn);
				}
				selectedButtonNames.add(buttonName);
			}
		}
		sortbyName = [...selectedButtonNames][0];
		selectedButtonNames = new Set(selectedButtonNames);
	}

	function getButtonStyle(buttonName) {
		if (buttonName === 'FlagButton') {
			return `border-color: ${densityButtonNameColors(sortbyName)};`;
		}
		const isSelected = selectedButtonNames.has(buttonName);
		const isHovered = hoveredButtonName === buttonName;

		if (!isSelected && !isHovered) return '';

		let style = '';
		if (isHovered || isSelected) {
			style += `border-color: ${densityButtonNameColors(buttonName)};`;
		}
		if (isSelected) {
			style += `box-shadow: inset 0 0 0 2px ${densityButtonNameColors(buttonName)};`;
			if (sortbyName === buttonName) {
				style += `background-color: ${densityButtonNameColors(buttonName)}; color: white;`;
			}
		}
		return style;
	}

	function toggleSelectedCategories() {
		if (toggleOverviewCategoryButtonName === 'Select All') {
			selectedCategories = new Set(categories_item);
		} else {
			let unselectedCategories = new Set();
			categories_item.forEach((category) => {
				if (!selectedCategories.has(category)) {
					unselectedCategories.add(category);
				}
			});
			selectedCategories = new Set(unselectedCategories);
		}
	}

	function processDataset(dataset, targetSensors, multipleSensorUsageNames, selectedButtonNames) {
		// For each sensor
		let singleRatioRollup = d3.rollup(
			dataset,
			(group) => group.filter((item) => item.Max > thresholds[item.Sensor]).length / group.length,
			(d) => d.Category,
			(d) => d.Sensor
		);

		let singleRatioGroupedData = Array.from(singleRatioRollup, ([categoryName, sensorMap]) =>
			targetSensors.map((sensorName) => ({
				category: categoryName,
				ratioType: sensorName,
				ratio: sensorMap.get(sensorName) ?? 0
			}))
		).flat();

		// For Multiple Sensor Usage
		let multipleSensorRollup = d3.rollup(
			dataset,
			(group) => d3.sum(group.map((item) => (item.Max > thresholds[item.Sensor] ? 1 : 0))),
			(d) => d.Category,
			(d) => d.VenderIdentifier
		);

		let multipleRatioGroupedData = Array.from(multipleSensorRollup, ([categoryName, appsUsage]) => {
			const entries = Array.from(appsUsage);

			return [
				{
					category: categoryName,
					ratioType: multipleSensorUsageNames[0],
					ratio: entries.filter(([_, value]) => value === 3).length / entries.length
				},
				{
					category: categoryName,
					ratioType: multipleSensorUsageNames[1],
					ratio: entries.filter(([_, value]) => value >= 1).length / entries.length
				},
				{
					category: categoryName,
					ratioType: multipleSensorUsageNames[2],
					ratio: entries.filter(([_, value]) => value === 0).length / entries.length
				}
			];
		}).flat();

		// Filtering

		for (const multipleSensorUsageName of multipleSensorUsageNames) {
			if (selectedButtonNames.has(multipleSensorUsageName)) {
				return multipleRatioGroupedData.filter(
					(item) => item.ratioType === multipleSensorUsageName
				);
			}
		}

		return singleRatioGroupedData.filter((item) => selectedButtonNames.has(item.ratioType));
	}

	function getCategoriesSorted(illustrationData) {
		const filtered = [
			...new Set(
				illustrationData
					.filter((item) => item.ratioType === sortbyName)
					.slice()
					.sort((a, b) => (sortbyIncreaseFlag ? a.ratio - b.ratio : b.ratio - a.ratio))
					.map((item) => item.category)
			)
		];

		// Separate selected and non-selected
		const selected = [];
		const others = [];

		for (const item of filtered) {
			if (selectedCategories.has(item)) {
				selected.push(item);
			} else {
				others.push(item);
			}
		}

		// onChangeSelectedCategory([...selected, ...others][0]);

		return [...selected, ...others];
		// return filtered;
	}

	// ########################## Stage Details ##########################

	const stageButtonNameColor = '#7eb0d5';
	const trendNames = ['Increase', 'Decrease', 'Unchanged'];
	const runtimeStageInfos = [
		{ label: 'Installation', abbreviation: 'INSTL', duration: 5 },
		{ label: 'ForeGround', abbreviation: 'FG', duration: 15 },
		{ label: 'BackGround', abbreviation: 'BG', duration: 15 },
		{ label: 'Force Stop', abbreviation: 'STOP', duration: 5 },
		{ label: 'Uninstallation', abbreviation: 'RM', duration: 5 }
	];
	const stageLabel2Abbreviation = runtimeStageInfos.reduce((acc, stage) => {
		acc[stage.label] = stage.abbreviation;
		return acc;
	}, {});
	const stageAbbreviation2Label = runtimeStageInfos.reduce((acc, stage) => {
		acc[stage.abbreviation] = stage.label;
		return acc;
	}, {});

	const stageChangeNames = runtimeStageInfos
		.slice(0, -1)
		.map((stage, index) => `${stage.abbreviation}2${runtimeStageInfos[index + 1].abbreviation}`);
	const stageButtonNames = runtimeStageInfos.map((stage) => stage.label);
	const stageTrends = targetSensors.flatMap((sensor) =>
		stageChangeNames.flatMap((stageChange) =>
			trendNames.map((trend) => `${sensor} ${stageChange} ${trend}`)
		)
	);
	const stageTrendColors = d3
		.scaleOrdinal()
		.domain(stageTrends)
		.range(
			Array(4)
				.fill(acceLightnessColors)
				.flat()
				.concat(Array(4).fill(gyroLightnessColors).flat())
				.concat(Array(4).fill(magnLightnessColors).flat())
		);

	let selectedStageButtonNames = $state(new Set(stageButtonNames));
	let selectedStageChangeNames = $state(new Set(stageChangeNames));

	function toggleStageButton(targetStageButtonName) {
		if (selectedStageButtonNames.has(targetStageButtonName)) {
			if (selectedStageButtonNames.size >= 2) {
				selectedStageButtonNames.delete(targetStageButtonName);
			}
		} else {
			selectedStageButtonNames.add(targetStageButtonName);
		}

		let curSelectedStageChangeNames = new Set();
		runtimeStageInfos.forEach((stage) => {
			if (selectedStageButtonNames.has(stage.label)) {
				stageChangeNames.forEach((stageChange) => {
					if (stageChange.includes(stage.abbreviation)) {
						curSelectedStageChangeNames.add(stageChange);
					}
				});
			}
		});
		selectedStageChangeNames = new Set(curSelectedStageChangeNames);
		selectedStageButtonNames = new Set(selectedStageButtonNames);
	}

	function getStageButtonStyle(buttonName) {
		const isSelected = selectedStageButtonNames.has(buttonName);
		const isHovered = hoveredButtonName === buttonName;
		if (!isSelected && !isHovered) return '';
		let style = '';
		if (isHovered || isSelected) {
			style += `border-color: ${stageButtonNameColor};`;
		}
		if (isSelected) {
			style += `box-shadow: inset 0 0 0 2px ${stageButtonNameColor};`;
		}
		return style;
	}

	function getSelectedDensityNames(selectedButtonNames, targetSensors) {
		const selectedDensityNames = [];

		for (const targetSensorName of targetSensors) {
			if (selectedButtonNames.has(targetSensorName)) {
				selectedDensityNames.push(targetSensorName);
			}
		}

		return selectedDensityNames.length === 0 ? [...targetSensors] : selectedDensityNames;
	}

	// ########################## Specific Apps Show ##########################
	let selectedCategory = $derived(sortedCategories[0]);
	// ########################## Illustration Details ##########################
	let width_overview = $state(1980);
	let height_overview = $state(400);
	let width_detail = $state(950);
	let height_detail = $state(400);
	let width_app = $state(1980);
	let height_app = $state(700);
	let size_overview = $derived(Math.min(width_overview, height_overview));
	let size_detail = $derived(Math.min(width_detail, height_detail));
	let size_app = $derived(Math.min(width_app, height_app));

	// ########################## HTML WORDING ##########################
	let barChartTitleDensity = $derived(getBarChartTitleDensityName(selectedButtonNames));

	function getBarChartTitleDensityName(selectedButtonNames) {
		let title = '';
		if ([...selectedButtonNames][0] === multipleSensorUsageNames[0]) {
			title = 'All';
		} else if ([...selectedButtonNames][0] === multipleSensorUsageNames[1]) {
			title = 'Any';
		} else if ([...selectedButtonNames][0] === multipleSensorUsageNames[2]) {
			title = 'None';
		}
		return title;
	}
</script>

<div class="container">
	<div class="paper-info">
		<div class="paper-title">
			<h2>ARMOUR US: Monitoring Android Zero-permission Sensor Usage From User Space</h2>
		</div>
		<div class="authors">
			<div class="author-group">
				<div><a href="https://yanlong.site/" target="_blank" rel="noopener noreferrer" class="author-link">Yan Long</a><sup>1</sup></div>
				<div><a href="https://www.linkedin.com/in/tobias-alam-5a4057215/" target="_blank" rel="noopener noreferrer" class="author-link">Tobias Alam</a><sup>3</sup></div>
			</div>
			<div class="author-group">
				<div><a href="https://jiancongcui.github.io/" target="_blank" rel="noopener noreferrer" class="author-link">Jiancong Cui</a><sup>1</sup></div>
				<div><a href="https://zhiqlin.github.io/" target="_blank" rel="noopener noreferrer" class="author-link">Zhiqiang Lin</a><sup>2</sup></div>
			</div>
			<div class="author-group">
				<div><a href="https://frostwing98.com/" target="_blank" rel="noopener noreferrer" class="author-link">Yuqing Yang</a><sup>2</sup></div>
				<div><a href="https://web.eecs.umich.edu/~kevinfu/" target="_blank" rel="noopener noreferrer" class="author-link">Kevin Fu</a><sup>1</sup></div>
			</div>
		</div>
		<div class="affiliations">
            <div class="affiliation">
				<img src="logos/NU-logo.svg" alt="UF" style="height:60px;vertical-align:middle;" />
			</div>
			<div class="affiliation">
				<img src="logos/OSU-logo.png" alt="UM" style="height:60px;vertical-align:middle;" />
			</div>
			<div class="affiliation">
				<img src="logos/Umich-logo.jpg" alt="UM" style="height:60px;vertical-align:middle;" />
			</div>
		</div>
	</div>
	<div class="overview">
		<div class="bar-chart-control button-group">
			{#each densityButtonNames as buttonName}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<button
					style={getButtonStyle(buttonName)}
					class:selected={selectedButtonNames.has(buttonName)}
					onclick={() => toggleButton(buttonName)}
					onmouseover={() => (hoveredButtonName = buttonName)}
					onmouseout={() => (hoveredButtonName = null)}
				>
					{buttonName}
				</button>
			{/each}
			{#if selectedCategories.size === categories_item.length}
				<button class="unclickableButton">
					{toggleOverviewCategoryButtonName}
				</button>
			{:else}
				<button
					onclick={() => toggleSelectedCategories()}
					class="ungroupedButton"
					style={getButtonStyle('FlagButton')}
				>
					{toggleOverviewCategoryButtonName}
				</button>
			{/if}
			<button
				onclick={() => (sortbyIncreaseFlag = !sortbyIncreaseFlag)}
				class="ungroupedButton"
				style={getButtonStyle('FlagButton')}
			>
				{sortbyIncreaseFlag ? 'Ascending ⬆' : 'Descending ⬇'}
			</button>
		</div>
		<div class="chart-title">
			<div class="declarative">
				Zero-permission
				<span style="color: {densityButtonNameColors(sortbyName)};"
					>{barChartTitleDensity} Sensor Usage</span
				>
				by Different Categories
			</div>
			<div class="interpretive">
				<span style="color: {densityButtonNameColors(sortbyName)};">{selectedCategory}</span>
				has the {sortbyIncreaseFlag ? 'lowest' : 'highest'}
				<span style="color: {densityButtonNameColors(sortbyName)};"
					>{barChartTitleDensity}
					{targetSensors.includes(sortbyName) ? sortbyName : ''} Sensor Usage</span
				>
				Ratio
			</div>
		</div>
		<div class="bar-chart-overview">
			<BarChart
				{illustrationData}
				categories={sortedCategories}
				{targetSensors}
				{multipleSensorUsageNames}
				{selectedCategories}
				onChangeSelectedCategories={(value) => {
					selectedCategories = value;
				}}
				{selectedButtonNames}
				{sortbyIncreaseFlag}
				{sortbyName}
				onSortByNameChange={(value) => {
					sortbyName = value;
				}}
				onSortByIncreaseFlagChange={() => {
					sortbyIncreaseFlag = !sortbyIncreaseFlag;
				}}
				width={width_overview}
				height={size_overview}
				marginLeft={64}
				marginBottom={80}
				marginTop={32}
				marginRight={32}
				{thresholds}
				colors={densityButtonNameColors}
			/>
		</div>
		<!-- <div class="category-control">
			<button onclick={() => toggleSelectedCategories()}>{toggleOverviewCategoryButtonName}</button>
		</div> -->
	</div>
	<div class="details">
		<div class="control-pannel">
			<div class="details-control button-group">
				{#each stageButtonNames as stageButtonName}
					<!-- svelte-ignore a11y_mouse_events_have_key_events -->
					<button
						style={getStageButtonStyle(stageButtonName)}
						class:selected={selectedStageButtonNames.has(stageButtonName)}
						onclick={() => toggleStageButton(stageButtonName)}
						onmouseover={() => (hoveredButtonName = stageButtonName)}
						onmouseout={() => (hoveredButtonName = null)}
					>
						{stageButtonName}
					</button>
				{/each}
			</div>
			<div class="sensor-threshold-control">
				<div class="control-unit">
					<label for="Accelerometer">Accelerometer Threshold:</label>
					<input
						type="range"
						id="AccelerometerRange"
						bind:value={AccelerometerThresholds}
						min="1.5"
						max="400"
						step="1"
						style="flex:1"
					/>
					<input
						type="number"
						id="Accelerometer"
						bind:value={AccelerometerThresholds}
						min="1.5"
						max="400"
						step="1"
					/>
				</div>
				<div class="control-unit">
					<label for="Gyroscope">Gyroscope Threshold:</label>
					<input
						type="range"
						id="GyroscopeRange"
						bind:value={GyroscopeThresholds}
						min="1.5"
						max="400"
						step="1"
						style="flex:1"
					/>
					<input
						type="number"
						id="Gyroscope"
						bind:value={GyroscopeThresholds}
						min="1.5"
						max="400"
						step="1"
					/>
				</div>
				<div class="control-unit">
					<label for="Magnetometer">Magnetometer Threshold:</label>
					<input
						type="range"
						id="MagnetometerRange"
						bind:value={MagnetometerThresholds}
						min="1.5"
						max="95"
						step="1"
						style="flex:1"
					/>
					<input
						type="number"
						id="Magnetometer"
						bind:value={MagnetometerThresholds}
						min="1.5"
						max="95"
						step="1"
					/>
				</div>
			</div>
			<div class="legend-pannel">
				<ColorLegend
					colorList={[acceLightnessColors, gyroLightnessColors, magnLightnessColors].map(
						(item) => item[0]
					)}
					label="🔼 Increase"
				/>
				<ColorLegend
					colorList={[acceLightnessColors, gyroLightnessColors, magnLightnessColors].map(
						(item) => item[2]
					)}
					label="⚪ Unchanged"
					opacity={0.7}
				/>
				<ColorLegend
					colorList={[acceLightnessColors, gyroLightnessColors, magnLightnessColors].map(
						(item) => item[1]
					)}
					label="🔽 Decrease"
				/>
			</div>
		</div>
		<div class="chart-titles-in-a-row">
			<div class="chart-title">
				<div class="declarative">Frequency Distribution of Zero-Permission Sensor Usage</div>
				<div class="interpretive">
					Third-Party Apps Exhibit Consistent Usage Patterns of Zero-Permission Sensors
				</div>
			</div>
			<div class="chart-title">
				<div class="declarative">Sensor Usage Changes At Various Runtime Region Transitions</div>
				<div class="interpretive">Sensor Usage Peaks at INSTL2FG, Then Declines Toward STOP</div>
			</div>
		</div>
		<div class="details-show">
			<div
				class="rain-cloud-overview"
				bind:clientWidth={width_detail}
				bind:clientHeight={height_detail}
			>
				<RainCloudPlot
					dataset={data.dataset_item}
					{thresholds}
					{selectedDensityNames}
					{selectedCategories}
					{selectedStageButtonNames}
					{stageAbbreviation2Label}
					colors={densityButtonNameColors}
					width={width_detail}
					height={size_detail}
					marginLeft={128}
					marginBottom={64}
					marginTop={32}
					marginRight={32}
				/>
			</div>

			<div
				class="stage-change-overview"
				bind:clientWidth={width_detail}
				bind:clientHeight={height_detail}
			>
				<StagePieChart
					dataset={data.dataset_item_aggregate}
					{thresholds}
					{selectedDensityNames}
					{selectedStageButtonNames}
					{selectedCategories}
					{stageChangeNames}
					{selectedStageChangeNames}
					{trendNames}
					colors={stageTrendColors}
					width={width_detail}
					height={size_detail}
					marginLeft={0}
					marginBottom={64}
					marginTop={32}
					marginRight={0}
				/>
			</div>
		</div>
	</div>
	<div class="app-show">
		<!-- <div class="category-list">
			{#each selectedCategories as category}
				<div class="category-item">
					<h3>{category}</h3>
				</div>
			{/each}
		</div> -->
		<div class="chart-title">
			<div class="declarative">Per-App Sensor Usage Details on 
                <span style="color: {densityButtonNameColors(sortbyName)};"
                >{selectedCategory}</span
            >
            </div>
			<div class="interpretive">
				Apps Tend to Co-Activate Multiple Sensors in a Synchronized Manner
			</div>
		</div>
		<div class="app-list">
			<FreqLineCharts
				dataset={data.dataset_item_aggregate}
				dataset_line={data.dataset_item_show}
				{thresholds}
				{selectedCategory}
				{targetSensors}
				{selectedDensityNames}
				{selectedStageButtonNames}
				{stageLabel2Abbreviation}
				colors={densityButtonNameColors}
				width={width_app}
				height={size_app}
				marginLeft={128}
				marginBottom={80}
				marginTop={0}
				marginRight={0}
			/>
		</div>
	</div>
</div>

<style>
	.container {
		/* set the font */
		font-family: system-ui, sans-serif;
		font-size: 16px;
		/* dimensions */
		/* height: 100vh; */
		width: 96vw;
		/* padding */
		/* padding: 2em; */
		/* layout */
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
	}

	.paper-info {
		width: 100vw;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1em;
	}
	.paper-title {
		text-align: center;
		color: #4a90e2;
		font-size: 1.8em;
		font-weight: bold;
		margin-bottom: 1.5em;
        margin-top: 2em;
	}
	.authors {
		display: flex;
		flex-direction: row;
		justify-content: center;
		gap: 5em;
		font-size: 1.5em;
		color: #2196f3;
		margin-bottom: 2em;
	}
	.author-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2em;
	}

    .author-group div sup {
        margin-left: 0.2em;
        font-size: 0.6em;
        color: black;
    }
	.affiliations {
		display: flex;
		flex-direction: row;
		justify-content: center;
		gap: 4em;
		align-items: center;
		margin-bottom: 1em;
	}
	.affiliation {
		display: flex;
		align-items: center;
		gap: 0.5em;
		font-size: 1.3em;
		font-weight: bold;
		position: relative;
	}
	.affiliation:nth-child(1)::before {
		content: '1';
		position: absolute;
		top: -0.7em;
		left: -0.9em;
		font-size: 0.9em;
		width: 1.3em;
		height: 1.3em;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.affiliation:nth-child(2)::before {
		content: '2';
		position: absolute;
		top: -0.7em;
		left: -0.9em;
		font-size: 0.9em;
		width: 1.3em;
		height: 1.3em;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.affiliation:nth-child(3)::before {
		content: '3';
		position: absolute;
		top: -0.7em;
		left: -0.9em;
		font-size: 0.9em;
		width: 1.3em;
		height: 1.3em;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overview {
		position: relative;
	}

	.chart-titles-in-a-row {
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		gap: 2em;
	}

	.chart-titles-in-a-row .chart-title {
		flex: 1;
	}

	.details,
	.overview {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		justify-content: center;
	}

	.app-show {
		flex: 1;
		display: flex;
		flex-direction: column;
		/* justify-content: center; */
	}

	/* .app-show .category-list {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		height: 80vh;
		overflow: scroll;
	} */

	.app-show .app-list {
		width: 90vw;
		overflow-x: auto;
		position: relative;
		align-items: center;
		overscroll-behavior: contain;
	}

	.control-pannel {
		width: 90vw;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		gap: 2em;
	}

	.details-control,
	.bar-chart-control {
		display: flex;
		flex-direction: row;
		gap: 2em;
		align-items: center;
		justify-content: center;
	}

	.details-control button,
	.button-group button {
		margin: 0.25rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 2px solid #ccc;
		background-color: white;
		cursor: pointer;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.sensor-threshold-control {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;
	}

	.control-unit {
		display: flex;
		width: 100%;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 2em;
	}

	.details-show {
		display: flex;
		flex-direction: row;
		width: 90vw;
		justify-content: space-between;
	}

	/* Selected: bold border simulated with inner box-shadow */
	/* .button-group button.selected {
		border-color: #7bb1f9;
		box-shadow: inset 0 0 0 2px #7bb1f9;
	} */

	/* Optional: keep hover consistent */
	.ungroupedButton {
		min-width: 9em;
	}

	.unclickableButton {
		cursor: not-allowed !important;
		background-color: #ccc !important;
	}

	.button-group .ungroupedButton:hover {
		border-color: #7bb1f9;
	}

	.bar-chart-overview {
		width: 90vw;
		overflow-x: auto;
		position: relative;
		align-items: center;
		/* justify-content: center; */
	}

	/* .runtimeStage {
		display: flex;
		align-items: center;
		justify-content: center;
		border-right: 2px solid black;
	} */

	/* .rain-cloud-overview {
		width: 40vw;
		overflow-x: auto;
		position: relative;
		align-items: center;
	} */

	/* .secondShow {
		width: 33vw;
	} */
	/* 
	.control-unit input[type='range'] {
		appearance: none;
		height: 6px;
		background: #ddd;
		border-radius: 3px;
		outline: none;
		transition: background 0.3s ease;
	}

	.control-unit input[type='range']::-webkit-slider-thumb {
		appearance: none;
		height: 18px;
		width: 18px;
		background: #4caf50;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
	}
	.control-unit input[type='range']::-moz-range-thumb {
		height: 18px;
		width: 18px;
		background: #4caf50;
		border: none;
		border-radius: 50%;
		cursor: pointer;
	} */

	.control-unit input[type='number'] {
		width: 80px;
		padding: 6px 10px;
		border: 1px solid #ccc;
		margin: 4px 0;
		border-radius: 6px;
		font-size: 1rem;
		transition: border 0.3s ease;
	}

	.control-unit input[type='number']:focus {
		border-color: #4caf50;
		outline: none;
		box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
	}

	.legend-pannel {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 1em;
	}
	/* 
	.category-control {
		position: absolute;
		bottom: 17px;
		left: 0px;
		background: white;
		padding: 4px 8px;
		font-weight: bold;
		cursor: pointer;
	}

	.category-control button {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 2px solid #ccc;
		background-color: white;
		cursor: pointer;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	} */
	.chart-title {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	.declarative {
		font-weight: bold;
		font-size: 1.5em;
		margin-bottom: 0.5em;
	}
	.interpretive {
		font-size: 1.2em;
		color: #555;
	}
	.author-link {
		color: #4aa3f3;
		transition: color 0.2s;
	}
	.author-link:hover {
		color: #1976d2;
	}

    a {
        text-decoration: none;
    }
</style>
