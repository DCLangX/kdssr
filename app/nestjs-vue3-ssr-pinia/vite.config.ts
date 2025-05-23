import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Unocss from "unocss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// https://vitejs.dev/config/

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => ({
	optimizeDeps: {
		force: true, // 启动vite时强制重新预构建构建依赖，避免kdssr/client-entry中import导入的文件路由被永久缓存，导致无论怎么重启路由表都无法更新
	},
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
		// external: ["shelljs"],
		// shelljs经由rollup打包后有问题，会报错，故排除该项，并且需要在生产部署的依赖上增加shelljs
		noExternal: isSsrBuild ? true : [/\.(css|less|sass|scss)$/],
		// 生产构建server-entry构建时禁用所有依赖的外部化，也就是所有依赖打包到server-entry中，这样在生产运行时不需要额外的依赖，但是开发模式下不要这样做，会导致vite在esm环境下执行ssrLoadModule函数动态加载server-entry后会因为运行不了某些cjs依赖而报错
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
			input: isSsrBuild ? "kdssr/server-entry" : "@/client-entry",
		},
	},
}));
