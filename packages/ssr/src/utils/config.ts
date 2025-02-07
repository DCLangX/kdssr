import shell from "shelljs";
import { transform } from "esbuild";
import { accessFile, accessFileSync, getCwd, getFeDir } from "./file";
import { resolve, join } from "node:path";
import { promises } from "node:fs";
import type { IConfig, UserConfig } from "./types";
import { createRequire } from "node:module";
import { normalizeEndPath, normalizeStartPath } from "./normalize";
import * as parser from "@babel/parser";
import traverseDefault from "@babel/traverse";
import { createHash } from "crypto";
const require = createRequire(getCwd());
const traverse = traverseDefault.default;

const { mkdir, cp } = shell;
export const getStaticConfig = () => {
	const staticConfigPath = resolve(getCwd(), "./build/staticConfig.cjs");
	const staticConfig = accessFileSync(staticConfigPath)
		? (require(staticConfigPath) as UserConfig)
		: {};
	return staticConfig;
};

async function processScriptFile(src: string, cwd: string) {
	// 检查是否需要处理
	if (/^(https?:)?\/\//.test(src)) {
		return { newSrc: src, newCode: "" };
	}

	// 读取文件
	const fullPath = resolve(cwd, src.startsWith("/") ? src.slice(1) : src);
	const content = await promises.readFile(fullPath, "utf-8");

	// esbuild 转换
	const { code } = await transform(content, {
		minify: true,
		loader: src.endsWith(".ts") ? "ts" : "js",
	});

	// 计算 hash
	const hash = createHash("md5").update(code).digest("hex").slice(0, 8);

	// 确保目录存在
	const scriptDir = resolve(cwd, "public");
	await promises.mkdir(scriptDir, { recursive: true });

	// 写入文件
	const newPath = `${hash}.js`;

	await promises.writeFile(join(cwd, "public", newPath), code);

	return { newSrc: newPath, newCode: code };
}

/**
 * @description: 处理用户配置中的需要插入到head中脚本，对其使用esbuild压缩和转换，由于这个配置本身是一个回调函数，无法在此直接js引入修改,只能读取字符串由babel解析成ast后处理
 * @param {string} configContent
 * @return {*}
 */
async function transformScript(configContent: string) {
	const cwd = getCwd();
	let newContent = configContent;
	if (
		configContent.includes("customeHeadScript") ||
		configContent.includes("customeFooterScript")
	) {
		// 提取配置对象
		const ast = parser.parse(configContent, {
			sourceType: "module",
			plugins: ["typescript"],
		});

		// 遍历并处理脚本
		const scripts = [];
		traverse(ast, {
			ObjectProperty(path) {
				// 找到 customeHeadScript 属性
				if (
					path.node.key.name === "customeHeadScript" ||
					path.node.key.name === "customeFooterScript"
				) {
					const arrowFunction = path.node.value;
					if (arrowFunction.type === "ArrowFunctionExpression") {
						// 如果是箭头函数
						let returnArray;
						if (arrowFunction.body.type === "BlockStatement") {
							// 如果箭头函数内容不是直接返回数组，需要找到return语句
							const returnStatement =
								arrowFunction.body.body.find(
									(node) => node.type === "ReturnStatement",
								);
							if (
								returnStatement &&
								returnStatement.argument.type ===
									"ArrayExpression"
							) {
								returnArray = returnStatement.argument;
							}
						} else if (
							arrowFunction.body.type === "ArrayExpression"
						) {
							returnArray = arrowFunction.body;
							// 获取返回的数组
						}
						if (
							returnArray &&
							returnArray.type === "ArrayExpression"
						) {
							returnArray.elements.forEach((element) => {
								// 遍历返回值数组
								if (element.type === "ObjectExpression") {
									const describe = element.properties.find(
										(p) => p.key.name === "describe",
									);
									const inlineProp = element.properties.find(
										(p) => p.key.name === "inline",
									);
									const content = element.properties.find(
										(p) => p.key.name === "content",
									);
									const tagName = element.properties.find(
										(p) => p.key.name === "tagName",
									)?.value.value;
									if (describe) {
										const src =
											describe.value.properties.find(
												(p) => p.key.name === "src",
											);

										if (tagName === "script" && src) {
											// 针对 script 标签的处理
											scripts.push({
												start: element.start, // 这条数据开始的位置
												end: element.end, // 这条数据结束的位置
												srcStart: src.value.start,
												srcEnd: src.value.end,
												contentStart: content?.start,
												contentEnd: content?.end,
												src: src.value.value,
												inline:
													inlineProp?.value.value ||
													false,
											});
										}
									}
								}
							});
						}
					}
				}
			},
		});
		// console.log("%c Line:158 🍕 scripts", "color:#fff;background:#465975");
		// console.dir(scripts, { depth: null });
		for (const {
			start,
			end,
			srcStart,
			srcEnd,
			src,
			contentStart,
			contentEnd,
			inline,
		} of scripts.reverse()) {
			// 处理找到的脚本,倒序处理，避免位置变化
			const { newSrc, newCode } = await processScriptFile(src, cwd);
			const before = newContent.slice(0, start);
			const after = newContent.slice(end);
			if (inline) {
				// inline标识的脚本需要额外做内联处理，转换后的内容直接替换到content中,并且删除src标签
				const middle = newContent
					.slice(start, end)
					.replace(/src:([^,}]+),?/, "") // 移除 src
					.replace(
						/content:\s*['"].*?['"]/,
						`content: \`${newCode}\``,
					); // 替换 content
				newContent = before + middle + after;
			} else {
				const middle = newContent
					.slice(start, end)
					.replace(src, newSrc);
				newContent = before + middle + after;
			}
		}
		return newContent;
	} else {
		return configContent;
	}
}

export const transformConfig = async () => {
	// 转换用户配置
	const cwd = getCwd();
	if (!(await accessFile(resolve(cwd, "./build")))) {
		mkdir(resolve(cwd, "./build"));
	}
	// if (await accessFile(resolve(cwd, "./config.js"))) {
	// 	cp(
	// 		"-r",
	// 		`${resolve(cwd, "./config.js")}`,
	// 		`${resolve(cwd, "./build/config.cjs")}`,
	// 	);
	// }
	const configWithTs = await accessFile(resolve(cwd, "./config.ts"));
	if (configWithTs) {
		const fileContent = (
			await promises.readFile(resolve(cwd, "./config.ts"))
		).toString();
		const transformContent = await transformScript(fileContent);
		const { code } = await transform(transformContent, {
			loader: "ts",
			format: "cjs",
			keepNames: true,
		});
		await promises.writeFile(resolve(cwd, "./build/config.cjs"), code);
	}
};

const getUserConfig = (): UserConfig => {
	const defaultConfig = resolve(getCwd(), "./build/config.cjs");
	return accessFileSync(defaultConfig)
		? require(defaultConfig).userConfig
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
let cacheConfig: IConfig | null = null;
export const loadConfig = (): IConfig => {
	if (cacheConfig) {
		return cacheConfig;
	}
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

	const rootChunkName = "Page";

	const jsOrder = [`${rootChunkName}.js`];

	const cssOrder = [
		"vendor.css",
		"common-vendor.css",
		`${rootChunkName}.css`,
		"layout-app.css",
	];

	const dynamic = true;
	const writeDebounceTime = 2000;

	const assetsDir = userConfig.assetsDir ?? "static";
	const manifestPath = `${normalizeEndPath(devPublicPath)}assets-manifest.json`;
	const staticPath = `${normalizeEndPath(devPublicPath)}${assetsDir}`;
	const hotUpdatePath = `${normalizeEndPath(devPublicPath)}*.hot-update**`;
	const proxyKey = [staticPath, hotUpdatePath, manifestPath];
	const prefix = "/";
	const dynamicFile = {
		serverBundle: join(cwd, `./build/server/${rootChunkName}.server.js`),
		assetManifest: join(cwd, "./build/client/assets-manifest.json"),
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
	cacheConfig = config;
	return config;
};

export const getOutputPublicPath = () => {
	// return /client/
	const { publicPath, isDev } = loadConfig();
	const path = normalizeEndPath(publicPath);
	return isDev ? path : `${path}client/`;
};

export const getImageOutputPath = () => {
	const { publicPath, isDev, assetsDir } = loadConfig();
	const imagePath = `${assetsDir}/images`;
	const normalizePath = normalizeEndPath(publicPath);
	return {
		publicPath: isDev
			? `${normalizePath}${imagePath}`
			: `${normalizePath}client/${imagePath}`,
		imagePath,
	};
};
