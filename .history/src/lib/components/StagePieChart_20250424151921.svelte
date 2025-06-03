<script>
	import * as d3 from 'd3';
	import Axis from './Axis.svelte';

	let {
		dataset,
		thresholds,
		selectedDensityNames,
		selectedStageButtonNames,
		selectedCategories,
		stageChangeNames,
		selectedStageChangeNames,
		trendNames,
		colors,
		width,
		height,
		marginLeft,
		marginTop,
		marginRight,
		marginBottom
	} = $props();
	const key2icon = {
		Increase: '🔼',
		Decrease: '🔽',
		Unchanged: '⚪'
	};
	let illustrationDataset = $derived(
		dataset.filter(
			(item) =>
				//
				selectedCategories.has(item.Category) && selectedDensityNames.includes(item.Sensor)
		)
	);

	let illustrationData = $derived(
		getIllustrateionData(illustrationDataset, stageChangeNames, trendNames)
	);

	const fy = $derived(
		d3
			.scaleBand()
			.domain(selectedDensityNames)
			.range([marginTop, height - marginBottom])
			.padding(0.05)
	);

	const x = $derived(
		d3
			.scaleBand()
			.domain(selectedStageChangeNames)
			.range([marginLeft, width - marginRight])
			.padding(0.05)
	);
	const groupHeight = $derived(fy.bandwidth());
	const radius = $derived(d3.min([groupHeight * 0.45, x.bandwidth() / 2]));
	const pie = d3.pie().value((d) => d.value);
	const arc = $derived(d3.arc().innerRadius(0).outerRadius(radius));

	// Grouped data by colorFeature
	const groupedIllustrationData = $derived(getGroupedIllustrationData(illustrationData));
	
    function getGroupedIllustrationData(illustrationData) {
		const result = {};

		Object.entries(illustrationData).forEach(([key, value]) => {
			const [sensor, stageChangeName, trend] = key.split(' ');
			if (!result[sensor]) {
				result[sensor] = {};
			}

			if (!result[sensor][stageChangeName]) {
				result[sensor][stageChangeName] = [];
			}

			result[sensor][stageChangeName].push({ key: trend, value });
		});

		// Convert trendDict to pie data
		Object.keys(result).forEach((sensor) => {
			Object.keys(result[sensor]).forEach((stageChangeName) => {
				result[sensor][stageChangeName] = pie(result[sensor][stageChangeName]);
			});
		});

		// Filter the result by selectedStageChangeNames
		Object.keys(result).forEach((sensor) => {
			Object.keys(result[sensor]).forEach((stageChangeName) => {
				if (!selectedStageChangeNames.has(stageChangeName)) {
					delete result[sensor][stageChangeName];
				}
			});
		});

		return result;
	}

	function getIllustrateionData(illustrationDataset, stageChangeNames, trendNames) {
		const result = {};

		// Initialize all combinations of sensor, stage, and trend with 0
		illustrationDataset.forEach((entry) => {
			const sensor = entry.Sensor;

			stageChangeNames.forEach((phase) => {
				trendNames.forEach((trend) => {
					const key = `${sensor} ${phase} ${trend}`;
					if (!result[key]) {
						result[key] = 0;
					}
				});
			});
		});

		// Populate the result with actual data
		illustrationDataset.forEach((entry) => {
			const sensor = entry.Sensor;

			stageChangeNames.forEach((phase) => {
				const twoPhrases = phase.split('2');
				if (
					entry[twoPhrases[0] + '_End'] > thresholds[sensor] ||
					entry[twoPhrases[1] + '_Start'] > thresholds[sensor]
				) {
					const value = entry[phase];
					let label;

					if (value > 0) {
						label = trendNames[0];
					} else if (value < 0) {
						label = trendNames[1];
					} else {
						label = trendNames[2];
					}

					const key = `${sensor} ${phase} ${label}`;
					result[key] += 1;
				}
			});
		});

		return result;
	}
</script>

<!--  -->
<svg {width} {height}>
	<g>
		{#each Object.entries(groupedIllustrationData) as [sensor, stageChangeNameDict]}
			<g transform="translate(0, {fy(sensor) + groupHeight / 2})">
				{#each Object.entries(stageChangeNameDict) as [stageChangeName, pie_data]}
					<g transform="translate({x(stageChangeName) + x.bandwidth() / 2}, 0)">
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						{#each pie_data as pie_data_iter, index}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore event_directive_deprecated -->
							<!-- svelte-ignore a11y_mouse_events_have_key_events -->
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<path
								d={arc(pie_data_iter)}
								fill={colors(sensor + ' ' + stageChangeName + ' ' + pie_data_iter.data.key)}
								stroke="white"
								style="stroke-width: 2px; opacity: {pie_data_iter.data.key === trendNames[2]
									? 0.7
									: 1};"
								on:mouseover={(event) => {
									const hint = document.createElement('div');
									hint.innerText = pie_data_iter.data.key + ' ' + pie_data_iter.data.value;
									hint.style.position = 'absolute';
									hint.style.backgroundColor = 'white';
									hint.style.border = '1px solid black';
									hint.style.padding = '5px';
									hint.style.left = `${event.pageX}px`;
									hint.style.top = `${event.pageY}px`;
									hint.className = 'tooltip';
									document.body.appendChild(hint);
								}}
								on:mouseout={() => {
									const hint = document.querySelector('.tooltip');
									if (hint) {
										hint.remove();
									}
								}}
							/>
							{#if pie_data_iter.endAngle - pie_data_iter.startAngle > 0.5}
								{#if pie_data_iter.endAngle - pie_data_iter.startAngle > 6.29}
									<text x={0} y={0} text-anchor="middle" dy=".35em" font-size="10" fill="black">
										{key2icon[pie_data_iter.data.key]}
									</text>
								{:else}
									<text
										x={arc.centroid(pie_data_iter)[0]}
										y={arc.centroid(pie_data_iter)[1]}
										text-anchor="middle"
										dy=".35em"
										font-size="10"
										fill="black"
									>
										{key2icon[pie_data_iter.data.key]}
									</text>
								{/if}
							{/if}
							{#if pie_data_iter.startAngle === 0 && pie_data_iter.endAngle === 0 && index === 0}
								<text
									x={0}
									y={0}
									text-anchor="middle"
									dy=".55em"
									font-size="14"
									font-weight="bold"
									fill={colors(sensor + ' ' + stageChangeName + ' ' + pie_data_iter.data.key)}
								>
									No Sensor Usage
								</text>
							{/if}
						{/each}
					</g>
				{/each}
			</g>
		{/each}
	</g>
	<!-- <Axis
        orientation={'left'}
        scale={fy}
        {width}
        {height}
        {marginLeft}
        {marginBottom}
        label={'Density'}
    /> -->

	<Axis
		orientation={'bottom'}
		scale={x}
		{width}
		{height}
		{marginLeft}
		{marginBottom}
		label="Runtime Stage"
	/>
</svg>

<style>
	path {
		transition: all 0.4s ease;
	}
</style>
