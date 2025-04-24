<script>
	import * as d3 from 'd3';
	import Axis from './Axis.svelte';
	import { density1d } from 'fast-kde';

	let {
		dataset,
		thresholds,
		selectedDensityNames,
		selectedCategories,
		selectedStageButtonNames,
		stageAbbreviation2Label,
		colors,
		width,
		height,
		marginLeft,
		marginTop,
		marginRight,
		marginBottom
	} = $props();

	let illustrationDataset = $derived(
		dataset.filter(
			(item) =>
				item.Frequency > thresholds[item.Sensor] &&
				selectedCategories.has(item.Category) &&
				selectedDensityNames.includes(item.Sensor) &&
				selectedStageButtonNames.has(stageAbbreviation2Label[item.Region])
		)
	);
	let kdeBins = 200; // default value, controlled by user

	const fy = $derived(
		d3
			.scaleBand()
			.domain(selectedDensityNames)
			.range([marginTop, height - marginBottom])
			.padding(0.05)
	);

	const x = $derived(
		d3
			.scaleLinear()
			.domain(d3.extent(illustrationDataset, (item) => item.Frequency))
			.nice()
			.range([marginLeft, width - marginRight])
	);

	const groupHeight = $derived(fy.bandwidth());
	const areaHeight = $derived(groupHeight * 0.6);
	const dotHeight = $derived(groupHeight * 0.3);
	const gapHeight = $derived(groupHeight * 0.04);
	const boxHeight = $derived(areaHeight * 0.15);
	const radius = 1;

	// Grouped data by colorFeature
	const groupedData = $derived(d3.group(illustrationDataset, (d) => d.Sensor));

	const groupedIllustrationData = $derived(getGroupedIllustrationData(groupedData));

	function getGroupedIllustrationData(groupedData) {
		return Array.from(groupedData, ([category, items]) => {
			const values = items.map((d) => d.Frequency);
			const mean = d3.mean(values);
			const density = Array.from(
				density1d(values, { extent: x.domain(), bandwidth: 7, bins: kdeBins })
			);
			const maxDensity = d3.max(density, (d) => d.y);
			const y = d3.scaleLinear().domain([0, maxDensity]).range([areaHeight, 0]);
			const area = d3
				.area()
				.x((d) => x(d.x))
				.y0((d) => y(d.y))
				.y1(y(0));
			return { category, values, mean, density, y, area };
		});
	}
</script>

<svg {width} {height}>
	<g>
		{#each groupedIllustrationData as { category, values, mean, density, y, area }}
			<g transform="translate(0, {fy(category)})">
				<!-- Density area -->
				<path
					d={area(density)}
					fill={colors(category)}
					fill-opacity={0.2}
					style="transition: d 0.4s ease-in-out;"
				/>

				<!-- Box plot elements -->
				{#if values.length > 0}
					{@const q1 = d3.quantile(values, 0.25)}
					{@const median = d3.quantile(values, 0.5)}
					{@const q3 = d3.quantile(values, 0.75)}
					{@const min = d3.min(values)}
					{@const max = d3.max(values)}
					{@const boxY = areaHeight - boxHeight}

					<rect
						x={x(q1)}
						y={boxY}
						width={x(q3) - x(q1)}
						height={boxHeight}
						fill="white"
						stroke={colors(category)}
						stroke-width="1"
						style="transition: all 0.4s ease-in-out;"
					/>
					<line
						x1={x(median)}
						x2={x(median)}
						y1={boxY}
						y2={boxY + boxHeight}
						stroke={colors(category)}
						style="transition: all 0.4s ease-in-out;"
					/>
					<line
						x1={x(min)}
						x2={x(min)}
						y1={boxY + boxHeight * 0.25}
						y2={boxY + boxHeight * 0.75}
						stroke={colors(category)}
						style="transition: all 0.4s ease-in-out;"
					/>
					<line
						x1={x(max)}
						x2={x(max)}
						y1={boxY + boxHeight * 0.25}
						y2={boxY + boxHeight * 0.75}
						stroke={colors(category)}
						style="transition: all 0.4s ease-in-out;"
					/>
					<line
						x1={x(min)}
						x2={x(max)}
						y1={boxY + boxHeight / 2}
						y2={boxY + boxHeight / 2}
						stroke={colors(category)}
						stroke-dasharray="4 2"
						style="transition: all 0.4s ease-in-out;"
					/>
				{/if}

				<!-- Dot strip -->
				{#each values as value, i (i)}
					<circle
						cx={x(value) + Math.random() * radius * 6}
						cy={areaHeight + gapHeight + radius + Math.random() * (dotHeight - radius * 8)}
						r={radius}
						fill={colors(category)}
						fill-opacity={0.8}
						style="transition: cx 0.4s ease, cy 0.4s ease;"
					/>
				{/each}
			</g>
		{/each}
	</g>
	<Axis
		orientation={'left'}
		scale={fy}
		{width}
		{height}
		{marginLeft}
		{marginBottom}
		label={'Sensor'}
	/>

	<Axis
		orientation={'bottom'}
		scale={x}
		{width}
		{height}
		{marginLeft}
		{marginBottom}
		label={'Frequency (Hz)'}
	/>
</svg>

<style>
	circle {
		transition: r 0.2s ease;
	}
	circle:hover {
		r: 5;
	}
</style>
