<script>
	let { colorList, label, opacity = 1.0 } = $props();
</script>

<div class="legend">
	<div class="legend-item">
		{#each colorList as color}
			<div class="square" style:background-color={color} style:opacity></div>
		{/each}
	</div>
	<div class="label">{label}</div>
</div>

<style>
	.legend {
		display: flex;
		flex-direction: row;
		gap: 1em;
		align-items: center;
	}

	.legend-item {
		display: flex;
		flex-direction: row;
		gap: 0.5em;
	}

	.square {
		height: 2em;
		width: 4em;
	}
</style>
