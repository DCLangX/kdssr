import shell from "shelljs";
import { transform } from "esbuild";
import { accessFile, accessFileSync, getCwd, getFeDir } from "./";
import { resolve, join } from "path";
import { promises } from "fs";
import type { IConfig, UserConfig } from "./types";
import { createRequire } from "module";
import { normalizeEndPath, normalizeStartPath } from "./normalize";
const { mkdir, cp } = shell;
export const getStaticConfig = () => {
	const staticConfigPath = resolve(getCwd(), "./build/staticConfig.js");
	const staticConfig = accessFileSync(staticConfigPath)
		? (createRequire(staticConfigPath) as UserConfig)
		: {};
	return staticConfig;
};

export const transformConfig = async () => {
	// 转换用户配置
	const cwd = getCwd();
	if (!(await accessFile(resolve(cwd, "./build")))) {
		mkdir(resolve(cwd, "./build"));
	}
	if (await accessFile(resolve(cwd, "./config.js"))) {
		cp(
			"-r",
			`${resolve(cwd, "./config.js")}`,
			`${resolve(cwd, "./build/config.js")}`,
		);
	}
	const configWithTs = await accessFile(resolve(cwd, "./config.ts"));
	if (configWithTs) {
		const fileContent = (
			await promises.readFile(resolve(cwd, "./config.ts"))
		).toString();
		const { code } = await transform(fileContent, {
			loader: "ts",
			format: "cjs",
			keepNames: true,
		});
		await promises.writeFile(resolve(cwd, "./build/config.js"), code);
	}
};

const getUserConfig = (): UserConfig => {
	const defaultConfig = resolve(getCwd(), "./build/config.js");
	return accessFileSync(defaultConfig)
		? (createRequire(defaultConfig) as UserConfig)
		: {}; // for dynamic file
};
type Json = string | number | boolean | { [key: string]: Json };

export const stringifyDefine = (obj: Record<string, Json>) => {
	for (const key in obj) {
		const val = obj[key];
		if (typeof val === "string" && val.slice(0, 1) !== '"') {
			obj[key] = JSON.stringify(val);
		} else if (typeof val === "object") {
			stringifyDefine(val);
		}
	}
};
export const loadConfig = (): IConfig => {
	const userConfig = getUserConfig();
	const cwd = getCwd();
	const mode = "ssr";
	const stream = false;
	const isVite = true;
	const optimize = process.env.OPTIMIZE === "1";
	const isCI = !!process.env.CI_TEST;
	const vue3ServerEntry = join(
		cwd,
		"./node_modules/kdssr/dist/esm/plugin-nest/server-entry.js",
	);
	const vue3ClientEntry = join(
		cwd,
		"./node_modules/ssr-plugin-vue3/esm/entry/client-entry.js",
	);
	// const supportOptinalChaining = coerce(process.version)!.major >= 14;
	const define = userConfig.define ?? {};
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	userConfig.define && stringifyDefine(define);

	const alias = Object.assign(
		{
			"@": getFeDir(),
			"~": getCwd(),
			"~/src": join(cwd, "./src"),
			_build: join(cwd, "./build"),
		},
		{
			vue$: "vue/dist/vue.runtime.esm-bundler.js",
			// "@vue/server-renderer": loadModuleFromFramework(
			// 	"@vue/server-renderer/index.js",
			// ), // use commonjs file
		},
		userConfig.alias,
	);
	const publicPath = userConfig.publicPath?.startsWith("http")
		? userConfig.publicPath
		: normalizeStartPath(userConfig.publicPath ?? "/");

	const devPublicPath = publicPath.startsWith("http")
		? publicPath.replace(/^http(s)?:\/\/(.*)?\d/, "")
		: publicPath; // 本地开发不使用 http://localhost:3000 这样的 path 赋值给 webpack-dev-server 会很难处理

	const moduleFileExtensions = [
		".web.mjs",
		".mjs",
		".web.js",
		".js",
		".web.ts",
		".ts",
		".web.tsx",
		".tsx",
		".json",
		".web.jsx",
		".jsx",
		".vue",
		".css",
	];
	const isDev = userConfig.isDev ?? process.env.NODE_ENV !== "production";
	const fePort = userConfig.fePort ?? 8999;

	const hmr = Object.assign(
		{
			// host: '127.0.0.1',
			protocol: "ws",
		},
		userConfig.hmr,
	);

	let https = userConfig.https ? userConfig.https : !!process.env.HTTPS;

	if (
		!(
			(typeof https === "boolean" && https) ||
			(typeof https === "object" && Object.keys(https).length !== 0)
		)
	) {
		https = false;
	}

	const serverPort = process.env.SERVER_PORT
		? Number(process.env.SERVER_PORT)
		: 3000;

	const host = hmr?.host ?? "127.0.0.1";

	const chunkName = "Page";

	const useHash = !isDev; // 生产环境默认生成hash
	const defaultWhiteList: (RegExp | string)[] = [
		/\.(css|less|sass|scss)$/,
		/vant.*?style/,
		/antd.*?(style)/,
		/ant-design-vue.*?(style)/,
		/store$/,
		/\.(vue)$/,
	];
	const whiteList: (RegExp | string)[] = defaultWhiteList.concat(
		userConfig.whiteList ?? [],
	);

	const jsOrder = [`${chunkName}.js`];

	const cssOrder = [
		"vendor.css",
		"common-vendor.css",
		`${chunkName}.css`,
		"layout-app.css",
	];

	const dynamic = true;
	const writeDebounceTime = 2000;

	const assetsDir = userConfig.assetsDir ?? "static";
	const manifestPath = `${normalizeEndPath(devPublicPath)}asset-manifest.json`;
	const staticPath = `${normalizeEndPath(devPublicPath)}${assetsDir}`;
	const hotUpdatePath = `${normalizeEndPath(devPublicPath)}*.hot-update**`;
	const proxyKey = [staticPath, hotUpdatePath, manifestPath];
	const prefix = "/";
	const dynamicFile = {
		serverBundle: join(cwd, `./build/server/${chunkName}.server.js`),
		assetManifest: join(cwd, "./build/client/asset-manifest.json"),
		asyncChunkMap: join(cwd, "./build/asyncChunkMap.json"),
	};
	const staticConfigPath = join(cwd, "./build/staticConfig.js");
	const getOutput = () => ({
		clientOutPut: join(cwd, "./build/client"),
		serverOutPut: join(cwd, "./build/server"),
	});
	const rootId = "#app";
	const config = Object.assign(
		{},
		{
			cwd,
			isDev,
			getOutput,
			publicPath,
			useHash,
			host,
			moduleFileExtensions,
			fePort,
			serverPort,
			chunkName,
			jsOrder,
			cssOrder,
			dynamic,
			mode,
			stream,
			https,
			manifestPath,
			proxyKey,
			vue3ServerEntry,
			vue3ClientEntry,
			isVite,
			whiteList,
			isCI,
			define,
			prefix,
			optimize,
			writeDebounceTime,
			dynamicFile,
			rootId,
			staticConfigPath,
		},
		userConfig,
	);
	config.staticConfigPath = join(config.cwd, "./build/staticConfig.js");
	config.getOutput = getOutput;
	config.assetsDir = assetsDir;
	config.alias = alias;
	config.prefix = normalizeStartPath(config.prefix ?? "/");
	config.whiteList = whiteList;
	config.hmr = hmr;

	return config;
};
