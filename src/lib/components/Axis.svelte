<script>
	let {
		orientation,
		scale,
		marginLeft,
		marginBottom,
		width,
		height,
		label,
		transformAngle = 0,
		highlightLabels = null,
		onChangeHighlightLabels = null,
		coarseTickFlag = false
	} = $props();

	const ticks = $derived(scale.bandwidth ? scale.domain() : scale.ticks());
	const offset = $derived(scale.bandwidth ? scale.bandwidth() / 2 : 0);
</script>

<g>
	{#if orientation === 'left'}
		<g transform="translate({marginLeft})">
			{#if coarseTickFlag}
				{#each ticks.filter((_, i) => i % 2 === 0) as tick (tick)}
					<g transform="translate(0, {scale(tick) + offset})">
						<line x2={-6} stroke="black" />
						<text text-anchor="end" dominant-baseline="middle" fill="black" x={-10}>{tick}</text>
					</g>
				{/each}
			{:else}
				{#each ticks as tick (tick)}
					<g transform="translate(0, {scale(tick) + offset})">
						<line x2={-6} stroke="black" />
						<text text-anchor="end" dominant-baseline="middle" fill="black" x={-10}>{tick}</text>
					</g>
				{/each}
			{/if}
		</g>
		{#if label}
			font-weight="bold"
			<text
				text-anchor="start"
				dominant-baseline="hanging"
				x={0}
				y={0}
				fill="black"
				font-weight="bold"
			>
				{label}
			</text>
		{/if}
	{:else}
		<g transform="translate(0, {height - marginBottom})">
			{#each ticks as tick (tick)}
				<g transform="translate({scale(tick) + offset}, 0)">
					<line y2={6} stroke="black" />
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<text
						text-anchor="middle"
						dominant-baseline="hanging"
						fill={highlightLabels === null ? 'black' : highlightLabels.has(tick) ? 'blue' : 'black'}
						y={10}
						transform={`rotate(${transformAngle})`}
						onclick={() => {
							if (highlightLabels !== null && onChangeHighlightLabels !== null) {
								if (highlightLabels.has(tick) && highlightLabels.size > 1) {
									highlightLabels.delete(tick);
								} else {
									highlightLabels.add(tick);
								}
								onChangeHighlightLabels(new Set([...highlightLabels]));
							}
						}}
						style={highlightLabels === null ? '' : 'cursor: pointer;'}
					>
						{tick}
					</text>
				</g>
			{/each}
		</g>
		{#if label}
			<text
				text-anchor="end"
				dominant-baseline="hanging"
				x={width}
				y={height - marginBottom + 32}
				font-weight="bold"
			>
				{label}
			</text>
		{/if}
	{/if}
</g>

<style>
</style>
