import { defineBuildConfig } from "unbuild";
// export {
// 	declaration: true,
// 	externals: ["express"],
// };

export default defineBuildConfig([
	{
		// If entries is not provided, will be automatically inferred from package.json
		entries: [
			// default
			"./src/index",
			"./src/cli/index",
			"./src/plugin-nest/render",
			"./src/plugin-nest/server-entry",
			"./src/plugin-vue3/client-entry",
			// mkdist builder transpiles file-to-file keeping original sources structure
			// {
			// 	builder: "mkdist",
			// 	input: "./src/plugin-nest/",
			// 	outDir: "./dist/plugin-nest",
			// },
		],

		/**
		 * * `compatible` means "src/index.ts" will generate "dist/index.d.mts", "dist/index.d.cts" and "dist/index.d.ts".
		 * * `node16` means "src/index.ts" will generate "dist/index.d.mts" and "dist/index.d.cts".
		 * * `true` is equivalent to `compatible`.
		 * * `false` will disable declaration generation.
		 * * `undefined` will auto detect based on "package.json". If "package.json" has "types" field, it will be `"compatible"`, otherwise `false`.
		 */
		declaration: "compatible",
		clean: true,
		sourcemap: true,
		externals: [
			"express",
			"_build/ssr-declare-routes",
			"_build/ssr-manual-routes",
		],
		rollup: {
			// emitCJS: true,
			esbuild: { target: "esnext" },
		},
	},
	// {
	// 	name: "minified",
	// 	entries: ["./src/index"],
	// 	outDir: "build/min",
	// 	rollup: {
	// 		esbuild: {
	// 			minify: true,
	// 		},
	// 	},
	// },
]);
