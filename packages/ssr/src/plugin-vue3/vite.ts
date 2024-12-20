import { build, type UserConfig, type Plugin } from "vite";
import {
	asyncOptimizeChunkPlugin,
	chunkNamePlugin,
	manifestPlugin,
	rollupOutputOptions,
} from "./vite-config-plugin";
import assetManifestPlugin from "./rollup-plugin";
// import {
// 	loadConfig,
// 	chunkNamePlugin,
// 	rollupOutputOptions,
// 	manifestPlugin,
// 	commonConfig,
// 	asyncOptimizeChunkPlugin,
// 	getOutputPublicPath,
// 	getDefineEnv,
// } from "../../utils";
// import vuePlugin from "@vitejs/plugin-vue";
// import vueJSXPlugin from "@vitejs/plugin-vue-jsx";

// const {
// 	getOutput,
// 	vue3ServerEntry,
// 	vue3ClientEntry,
// 	viteConfig,
// 	isDev,
// 	define,
// 	optimize,
// } = loadConfig();
// const { clientOutPut, serverOutPut } = getOutput();

// const serverPlugins = [
// 	vuePlugin(viteConfig?.()?.server?.defaultPluginOptions),
// 	vueJSXPlugin(),
// 	viteConfig?.()?.common?.extraPlugin,
// 	viteConfig?.()?.server?.extraPlugin,
// ].filter(Boolean);

// const serverConfig: UserConfig = {
// 	...commonConfig(),
// 	...viteConfig?.().server?.otherConfig,
// 	plugins:
// 		viteConfig?.()?.server?.processPlugin?.(serverPlugins) ?? serverPlugins,
// 	optimizeDeps: {
// 		...viteConfig?.().server?.otherConfig?.optimizeDeps,
// 		esbuildOptions: {
// 			...viteConfig?.().server?.otherConfig?.optimizeDeps?.esbuildOptions,
// 			// @ts-expect-error
// 			bundle: isDev,
// 		},
// 	},
// 	build: {
// 		minify: !process.env.NOMINIFY,
// 		...viteConfig?.().server?.otherConfig?.build,
// 		ssr: vue3ServerEntry,
// 		outDir: serverOutPut,
// 		rollupOptions: {
// 			...viteConfig?.().server?.otherConfig?.build?.rollupOptions,
// 			input: isDev ? vue3ClientEntry : vue3ServerEntry, // setting prebundle list by client-entry in dev
// 			output: {
// 				entryFileNames: "Page.server.js",
// 				assetFileNames: rollupOutputOptions().assetFileNames,
// 			},
// 		},
// 	},
// 	define: {
// 		...getDefineEnv(),
// 		...viteConfig?.().server?.otherConfig?.define,
// 		__isBrowser__: false,
// 		...define?.base,
// 		...define?.server,
// 	},
// };
// const clientPlugins = [
// 	vuePlugin(viteConfig?.()?.client?.defaultPluginOptions),
// 	vueJSXPlugin(),
// 	viteConfig?.()?.common?.extraPlugin,
// 	viteConfig?.()?.client?.extraPlugin,
// ].filter(Boolean);

// const clientConfig: UserConfig = {
// 	...commonConfig(),
// 	...viteConfig?.().client?.otherConfig,
// 	base: isDev ? "/" : getOutputPublicPath(),
// 	plugins:
// 		viteConfig?.()?.client?.processPlugin?.(clientPlugins) ?? clientPlugins,
// 	build: {
// 		minify: !process.env.NOMINIFY,
// 		...viteConfig?.().client?.otherConfig?.build,
// 		...(optimize ? { write: false } : {}),
// 		ssrManifest: true,
// 		outDir: clientOutPut,
// 		rollupOptions: {
// 			...viteConfig?.().client?.otherConfig?.build?.rollupOptions,
// 			input: vue3ClientEntry,
// 			output: rollupOutputOptions(),
// 			plugins: [
// 				chunkNamePlugin(),
// 				asyncOptimizeChunkPlugin(),
// 				manifestPlugin(),
// 			],
// 		},
// 	},
// 	define: {
// 		...getDefineEnv(),
// 		...viteConfig?.().client?.otherConfig?.define,
// 		__isBrowser__: true,
// 		...define?.base,
// 		...define?.client,
// 	},
// };

const viteStart = async () => {
	//
};
const viteBuild = async () => {
	await build({
		mode: process.env.VITEMODE ?? "production",
		build: {
			ssrManifest: true,
			outDir: "build/client",
			rollupOptions: {
				output: rollupOutputOptions(),
				plugins: [
					// chunkNamePlugin(),
					// asyncOptimizeChunkPlugin(),
					// manifestPlugin(),
					assetManifestPlugin(),
				],
			},
		},
	});
	await build({
		mode: process.env.VITEMODE ?? "production",
		build: {
			ssr: true,
			outDir: "build/server",
			rollupOptions: {
				input: "kdssr/server-entry", // setting prebundle list by client-entry in dev
				output: {
					entryFileNames: "Page.server.js",
					assetFileNames: rollupOutputOptions().assetFileNames,
				},
			},
		},
	});
};

// const viteBuildClient = async () => {
// 	await build({
// 		...clientConfig,
// 		mode: process.env.VITEMODE ?? "production",
// 	}).catch((_) => {});
// };
// const viteBuildServer = async () => {
// 	await build({
// 		...serverConfig,
// 		mode: process.env.VITEMODE ?? "production",
// 	});
// };

export {
	viteBuild,
	viteStart,
	// viteBuildClient,
	// viteBuildServer,
	// serverConfig,
	// clientConfig,
};
