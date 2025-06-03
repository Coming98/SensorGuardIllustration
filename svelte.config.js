import adapter from '@sveltejs/adapter-static';

export default {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	kit: {
		adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: null,
            precompress: false,
            strict: true
        }),
		paths: { base: '/SensorGuardIllustration' }
	}
};
