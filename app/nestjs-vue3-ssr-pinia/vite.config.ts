import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Unocss from "unocss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// https://vitejs.dev/config/

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => ({
	server: {
		middlewareMode: true,
		watch: {
			// During tests we edit the files too fast and sometimes chokidar
			// misses change events, so enforce polling for consistency
			usePolling: true,
			interval: 100,
		},
	},
	appType: "custom",
	base: "/",
	ssr: {
		external: ["shelljs"],
		// shelljs经由rollup打包后有问题，会报错，故排除该项，并且需要在生产部署的依赖上增加shelljs
		noExternal: [/\.(css|less|sass|scss)$/, "swiper", /swiper/],
	},
	plugins: [vue(), Unocss()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./web"),
			"~": resolve(__dirname, "./"),
			"~/src": resolve(__dirname, "./src"),
			_build: resolve(__dirname, "./build"),
		},
		extensions: [".mjs", ".ts", ".jsx", ".tsx", ".json", ".vue", ".js"],
	},
	define: {
		__isBrowser__: !isSsrBuild,
	},
	build: {
		rollupOptions: {
			// 生产构建时分别构建server-entry和client-entry，server-entry需要在生产构建加--ssr参数时构建，而dev模式下sever-entry是在nest中直接调用，不需要构建
			input: isSsrBuild ? "kdssr/server-entry" : "kdssr/client-entry",
		},
	},
}));
