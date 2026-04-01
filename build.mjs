import {build} from 'esbuild';

const EXTERNAL_PREFIXES = [
	'@ckeditor/',
	'@clayui/',
	'@liferay/',
	'react',
	'react-dom',
];

const external = (id) => {
	return EXTERNAL_PREFIXES.some((prefix) => id.startsWith(prefix));
};

await build({
	bundle: true,
	entryPoints: ['src/index.ts'],
	format: 'esm',
	outdir: 'build',
	entryNames: '[name]-[hash]',

	external: EXTERNAL_PREFIXES.map((p) => `${p}*`),
});

console.log('Build completed');