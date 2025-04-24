<script>
	import * as d3 from 'd3';
	import Axis from './Axis.svelte';

	let {
		illustrationData,
		categories,
		targetSensors,
		multipleSensorUsageNames,
		selectedCategories,
		onChangeSelectedCategories,
		selectedButtonNames,
		sortbyIncreaseFlag,
		sortbyName,
		onSortByNameChange,
		onSortByIncreaseFlagChange,
		height,
		marginLeft,
		marginTop,
		marginRight,
		marginBottom,
		thresholds,
		colors
	} = $props();

	// [{category, ratioType, ratio}, ...]
	// ratioType: [Acce, Gyro, Magn, All, Any, None]
	// let illustrationData = $derived(
	// 	processDataset(dataset, targetSensors, multipleSensorUsageNames, selectedButtonNames)
	// );

	// sort by ratio
	// let categories = $derived([
	// 	...new Set(
	// 		illustrationData
	// 			.filter((item) => item.ratioType === sortbyName)
	// 			.slice()
	// 			.sort((a, b) => (sortbyIncreaseFlag ? a.ratio - b.ratio : b.ratio - a.ratio))
	// 			.map((d) => d.category)
	// 	)
	// ]);
	// let categories = $derived(getCategoriesSorted(illustrationData));

	// sensor show order
	let illustratedSensorNames = $derived(
		selectedButtonNames.size === 1
			? [...selectedButtonNames]
			: targetSensors.filter((item) => selectedButtonNames.has(item))
	);

	// UnitLength: 144
	let barWidth = $derived(
		selectedButtonNames.size === 1 ? 60 : selectedButtonNames.size === 2 ? 50 : 40
	);
	let barPadding = $derived(
		selectedButtonNames.size === 1 ? 85 : selectedButtonNames.size === 2 ? 45 : 25
	);

	let totalWidth = $derived(
		categories.length * (barWidth * selectedButtonNames.size + barPadding) +
			marginLeft +
			marginRight
	);

	let maxRatio = $derived(d3.max(illustrationData, (d) => d.ratio));

	const x0 = $derived(
		d3
			.scaleBand()
			.domain(categories)
			.range([marginLeft - marginLeft, totalWidth - marginRight - marginLeft])
			.padding(0.2)
	);

	const x1 = $derived(
		d3.scaleBand().domain(illustratedSensorNames).range([0, x0.bandwidth()]).padding(0.05)
	);

	const y = $derived(
		d3
			.scaleLinear()
			.domain([0, 1])
			.nice()
			.range([height - marginBottom, marginTop])
	);

	function handleMouseOver(ratioType) {
		if (selectedButtonNames.size > 1) {
			// dim all bars
			d3.selectAll('.Rect').style('opacity', 0.4);
			// highlight selected sensor group
			d3.selectAll(`.${ratioType}`).style('opacity', 1);
		}
	}

	function handleMouseLeave() {
		d3.selectAll('.Rect').style('opacity', 0.8);
	}

	function handleClick(ratioType) {
		if (sortbyName !== ratioType) {
			onSortByNameChange(ratioType);
		} else {
			onSortByIncreaseFlagChange();
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
</script>

<svg {height} style="position: absolute; pointer-events: none; z-index: 1; width: 90vw;">
	<Axis
		orientation="left"
		scale={y}
		width={1600}
		{height}
		{marginLeft}
		{marginBottom}
		label="Ratio"
	/>
	{#each y.ticks() as tick}
		<line
			x1={marginLeft}
			x2={totalWidth}
			y1={y(tick)}
			y2={y(tick)}
			stroke="#ccc"
			stroke-dasharray="3,3"
		/>
	{/each}
</svg>

<div style="overflow-x: auto;" style:margin-left={`${marginLeft}px`}>
	<svg
		width={totalWidth - marginLeft - marginRight}
		{height}
		style="display: block; max-width: none;"
	>
		{#each illustrationData as { category, ratioType, ratio } (category + (targetSensors.includes(ratioType) ? ratioType : 'Multi'))}
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_mouse_events_have_key_events -->
			<rect
				class={`Rect ${ratioType} appear`}
				x={x0(category) + x1(ratioType)}
				y={y(ratio)}
				width={x1.bandwidth()}
				height={y(0) - y(ratio)}
				fill={colors(ratioType)}
				stroke={'grey'}
				style="opacity: 0.8; cursor: pointer;"
				role="button"
				aria-label="Clickable Rectangle"
				onclick={() => {
					handleClick(ratioType);
				}}
				onmouseover={() => handleMouseOver(ratioType)}
				onmouseleave={handleMouseLeave}
			/>
		{/each}

		<Axis
			orientation="bottom"
			scale={x0}
			width={totalWidth}
			{height}
			{marginLeft}
			{marginBottom}
			highlightLabels={selectedCategories}
			onChangeHighlightLabels={onChangeSelectedCategories}
		/>
	</svg>
</div>
<div
	style="
    position: absolute;
    bottom: 17px;
    right: 12px;
    background: white;
    padding: 4px 8px;
    pointer-events: none;
    font-weight: bold;
"
>
	Category
</div>

<style>
	rect {
		transition:
			width 400ms ease,
			height 400ms ease,
			x 400ms ease-in-out,
			y 400ms ease-in-out,
			fill 400ms ease,
			opacity 400ms ease;
	}
</style>
