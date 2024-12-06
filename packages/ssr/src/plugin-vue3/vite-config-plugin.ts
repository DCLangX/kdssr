import { promises } from "fs";
import { EventEmitter } from "node:events";
import { resolve, isAbsolute, dirname } from "node:path";
import type { UserConfig, Plugin } from "vite";
import { parse as parseImports } from "es-module-lexer";
import MagicString from "magic-string";
import type {
	OutputOptions,
	PreRenderedChunk,
	PluginContext,
	GetModuleInfo,
} from "rollup";
import shell from "shelljs";

import {
	loadConfig,
	getOutputPublicPath,
	getCwd,
	logErr,
	logWarning,
	accessFile,
	debounce,
	normalizePosixPath,
} from "../utils";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const { mkdir } = shell;

// 获取当前模块的绝对路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建一个指向当前模块所在目录的 require 实例
const require = createRequire(__dirname);

const viteCommentRegExp = /chunkTypeName:\s?"(.*)?"\s?\*/;
const chunkNameRe = /chunkName=(.*)/;
const imageRegExp = /\.(jpe?g|png|svg|gif)(\?[a-z0-9=.]+)?$/;
const fontRegExp = /\.(eot|woff|woff2|ttf)(\?.*)?$/;
const cwd = getCwd();
const dependenciesMap: Record<string, string[]> = {};
const asyncChunkMapJSON: Record<string, string[]> = {};
const generateMap: Record<string, string> = {};
const defaultExternal = [
	"@vue/server-renderer",
	"ssr-serialize-javascript",
	"react",
	"react-dom",
	"react-dom/server",
	"react-dom/server.node",
	"vue",
	"vue-router",
	"vuex",
	"pinia",
	"ssr-react-dom",
	"ssr-server-utils",
	"ssr-deepclone",
	"ssr-hoc-react",
	"ssr-common-utils",
	"vite",
	"axios",
];

const vendorList = [
	"vue",
	"vuex",
	"vue-demi",
	"vue-router",
	"react",
	"react-router",
	"react-router-dom",
	"react-dom",
	"@vue",
	"pinia",
	"@babel/runtime",
	"kdssr",
	"react/jsx-runtime",
	"path-to-regexp",
	"plugin-vue:export-helper",
	"@vue/devtools-api",
];
const cyrb53 = function (str: string, seed = 0) {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 =
		Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
		Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 =
		Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
		Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const cryptoAsyncChunkName = (
	chunks: Array<{ name: string }>,
	asyncChunkMap: Record<string, string[]>,
) => {
	const arr = chunks.filter(Boolean);
	arr.sort((a, b) => (a.name > b.name ? -1 : 1)); // 保证相同值不同顺序的数组最终的加密结果一致
	const allChunksNames = arr.map((item) => item.name).join("~");
	const allChunksNamesArr = allChunksNames.split("~");
	const cryptoAllChunksNames = String(
		arr.length > 3 ? cyrb53(allChunksNames) : allChunksNames,
	);
	if (
		allChunksNamesArr.length >= 2 &&
		!asyncChunkMap?.[cryptoAllChunksNames]
	) {
		asyncChunkMap[cryptoAllChunksNames] = allChunksNamesArr;
	}
	return cryptoAllChunksNames;
};

export const getDependencies = (
	abPath: string,
	allDependencies: Record<string, string>,
) => {
	const lastIndex = abPath.lastIndexOf("node_modules");
	if (lastIndex === -1) {
		return;
	}
	const pkgName = getPkgName(abPath);

	const pkgJson = resolve(
		abPath.slice(0, lastIndex),
		`./node_modules/${pkgName}/package.json`,
	);
	const {
		dependencies = {},
		peerDependencies = {},
	}: {
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	} = require(pkgJson);
	Object.entries(Object.assign(dependencies, peerDependencies)).forEach(
		([key, value]) => {
			if (!allDependencies[key]) {
				allDependencies[key] = value;
				try {
					const childId = require.resolve(key, {
						paths: [abPath],
					});
					getDependencies(childId, allDependencies);
				} catch (error) {
					// ignore it, some package has not correct main field or exports field in package.json like @babel/runtime cause require.resolve throw error
				}
			}
		},
	);
};

export function getPkgName(modulePath: string, packageFolder = "node_modules") {
	if (typeof modulePath === "string" && modulePath.includes(packageFolder)) {
		const path = normalizePosixPath(modulePath);
		const segments = path.split("/");
		const index = segments.lastIndexOf(packageFolder);

		if (index > -1) {
			const name = segments[index + 1] || "";
			const scopedName = segments[index + 2] || "";

			if (name[0] === "@") {
				return scopedName ? `${name}/${scopedName}` : "";
			}

			if (name) {
				return name;
			}
		}
	}
	return "";
}

export const getBuildConfig = () => {
	const { useHash, assetsDir } = loadConfig();
	const output = {
		chunkFileName: useHash
			? `${assetsDir}/[name].[contenthash:8].chunk.js`
			: `${assetsDir}/[name].chunk.js`,
		fileName: useHash
			? `${assetsDir}/[name].[contenthash:8].js`
			: `${assetsDir}/[name].js`,
		cssfileName: useHash
			? `${assetsDir}/[name].[contenthash:8].css`
			: `${assetsDir}/[name].css`,
		cssChunkFilename: useHash
			? `${assetsDir}/[name].[contenthash:8].chunk.css`
			: `${assetsDir}/[name].chunk.css`,
	};
	return {
		viteImageChunk: `${assetsDir}/[name].[hash].[ext]`,
		jsBuldConfig: {
			fileName: `${assetsDir}/[name].[hash].chunk.js`,
			chunkFileName: `${assetsDir}/[name].[hash].chunk.js`,
		},
		viteEntryChunk: `${assetsDir}/Page.[hash].chunk.js`,
		viteClientEntryChunk: `${assetsDir}/Page.[hash].chunk.[ext]`,
		viteAssetChunk: `${assetsDir}/[name].[hash].chunk.[ext]`,
		cssBuildConfig: [
			{
				filename: output.cssfileName,
				chunkFilename: output.cssChunkFilename,
			},
		],
	};
};

const chunkNamePlugin = function (): Plugin {
	return {
		name: "chunkNamePlugin",
		transform(source, id) {
			if (
				id.includes("ssr-declare-routes") ||
				id.includes("ssr-manual-routes")
			) {
				console.log(
					"%c Line:225 🌭 source",
					"color:#fff;background:#3f7cff",
					source,
				);
				let str = new MagicString(source);
				const imports = parseImports(source)[0];
				// 获得import语句的解析
				for (let index = 0; index < imports.length; index++) {
					const {
						s: start, //import内容的开始位置
						e: end, //import内容的结束位置
						ss: statementStart, //完整一条import语句的开始位置
						se: statementEnd, //完整一条import语句的结束位置
					} = imports[index];
					// const rawUrl = source.slice(start, end);
					const rawUrl = source.slice(statementStart, statementEnd);
					// 这条import语句的内容
					const chunkTypeName = viteCommentRegExp.exec(rawUrl)?.[1];
					// 匹配导入语句中包含的 chunkTypeName 注释，并从注释中提取 chunkTypeName 的值，如import(/* chunkTypeName: "index" */ '@/pages/index/render.vue')
					if (!rawUrl.includes("render")) {
						if (
							rawUrl.includes("layout") ||
							rawUrl.includes("App") ||
							rawUrl.includes("store")
						) {
							str = str.appendRight(
								statementEnd - 1,
								"?chunkName=Page",
							);
						} else if (chunkTypeName) {
							str = str.appendRight(
								statementEnd - 2,
								`?chunkName=${chunkTypeName}`,
							);
							// 类型收窄到这里，基本是动态路由，普通import结尾是',动态路由结尾是')，故需要往前推两位字符插入
						} else {
							str = str.appendRight(
								statementEnd - 1,
								"?chunkName=Page",
							);
						}
						continue;
					}
					str = str.appendRight(
						statementEnd - 2,
						`?chunkName=${chunkTypeName}`,
					);
					// 类型收窄到这里，基本是动态路由，普通import结尾是',动态路由结尾是')，故需要往前推两位字符插入
				}
				return {
					code: str.toString(),
				};
			}
		},
	};
};

const filePathMap: Record<string, string> = {};

const recordInfo = (
	id: string,
	chunkName: string | null,
	defaultChunkName: string | null,
	parentId: string,
) => {
	const sign = id.includes("node_modules") ? getPkgName(id) : id;
	if (id.includes("node_modules")) {
		filePathMap[sign] = parentId;
		// 记录文件里的node_modules依赖，结构是{ [key:依赖名] : 所在文件id }
	}
	if (!dependenciesMap[sign]) {
		dependenciesMap[sign] = defaultChunkName ? [defaultChunkName] : [];
	}
	chunkName && dependenciesMap[sign].push(chunkName);
	// 记录文件里的依赖类型，结构是{ [key:依赖名] : (模块类型名或"dynamic"或"vendor")[] }
	if (id.includes("node_modules")) {
		dependenciesMap[sign].push("vendor");
	}
	if (parentId) {
		dependenciesMap[sign] = dependenciesMap[sign].concat(
			dependenciesMap[parentId],
		);
		// 把父模块作为依赖时，所属的模块类型也加上
	}
	dependenciesMap[sign] = Array.from(
		new Set(dependenciesMap[sign].filter(Boolean)),
	).sort(sortByAscii);
	// 数组去重并排序
};

const sortByAscii = (a: string, b: string) => {
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		if (a.charCodeAt(i) !== b.charCodeAt(i)) {
			return a.charCodeAt(i) - b.charCodeAt(i);
		}
	}
	return a.length - b.length;
};

let hasWritten = false;
const writeEmitter = new EventEmitter();

const fn = () => {
	const { writeDebounceTime } = loadConfig();
	return debounce(() => {
		if (hasWritten) {
			throw new Error(
				`generateMap has been written over twice, please check your machine performance, or add config.writeDebounceTime that default is ${writeDebounceTime}ms`,
			);
		}
		hasWritten = true;
		writeEmitter.emit("buildEnd");
	}, writeDebounceTime);
};

let checkBuildEnd: () => void;
const moduleIds: string[] = [];

const findChildren = (id: string, getModuleInfo: GetModuleInfo) => {
	const queue = [id];
	while (queue.length > 0) {
		const id = queue.shift();
		if (id?.includes("node_modules")) {
			continue;
		}
		const { importedIds = [], dynamicallyImportedIds = [] } =
			getModuleInfo(id!) ?? {};
		for (const importerId of importedIds) {
			recordInfo(importerId, null, null, id!);
			queue.push(importerId);
		}
		for (const dyImporterId of dynamicallyImportedIds) {
			recordInfo(dyImporterId, null, "dynamic", id!);
			queue.push(dyImporterId);
		}
	}
};

const asyncOptimizeChunkPlugin = (): Plugin => {
	return {
		name: "asyncOptimizeChunkPlugin",
		buildStart() {
			checkBuildEnd = fn();
		},
		moduleParsed(this, info) {
			// 模块解析后调用
			const { id } = info;
			if (id.includes("chunkName")) {
				const { importedIds, dynamicallyImportedIds } = info;
				// id是当前在处理的文件，importedIds是静态导入的模块列表, dynamicallyImportedIds动态导入的模块
				const chunkName = id.includes("client-entry")
					? "client-entry"
					: chunkNameRe.exec(id)![1];
				for (const importerId of importedIds) {
					recordInfo(importerId, chunkName, null, id);
				}
				for (const dyImporterId of dynamicallyImportedIds) {
					recordInfo(dyImporterId, chunkName, "dynamic", id);
				}
			}
		},
		transform(this, code, id) {
			moduleIds.push(id);
			logWarning(`build optimize process file ${id}`);
			checkBuildEnd();
		},
		async buildEnd(this, err) {
			// 在第一层文件可以确定属于哪个chunkName之后
			// 确认所有子依赖属于哪个chunkName

			Object.keys(dependenciesMap).forEach((item) => {
				const id = !isAbsolute(item) ? filePathMap[item] : item;
				findChildren(id, this.getModuleInfo);
			});
			Object.keys(dependenciesMap).forEach((item) => {
				if (!isAbsolute(item)) {
					const abPath = filePathMap[item];
					if (abPath) {
						try {
							const allDependencies = {};
							// find absolute dependencies path from business file
							getDependencies(
								require.resolve(item, {
									paths: [abPath],
								}),
								allDependencies,
							);
							Object.keys(allDependencies).forEach((d) => {
								dependenciesMap[d] = (
									dependenciesMap[d] ?? []
								).concat(dependenciesMap[item]);
							});
						} catch (error) {
							logErr(
								`Please check ${getPkgName(abPath)}/package.json ${abPath} use ${item} but don't specify it in dependencies`,
							);
						}
					}
				}
			});
			Object.keys(dependenciesMap).forEach((item) => {
				dependenciesMap[item] = Array.from(
					new Set(dependenciesMap[item].filter(Boolean)),
				);
			});
			return await new Promise((resolve) => {
				if (err) {
					logErr(JSON.stringify(err));
					writeEmitter.on("buildEnd", () => {
						for (const id of moduleIds) {
							setGenerateMap(id);
						}
						writeEmitter.removeAllListeners();
						writeGenerateMap().then(() => resolve());
					});
				} else {
					for (const id of moduleIds) {
						setGenerateMap(id);
					}
					writeGenerateMap().then(() => resolve());
				}
			});
		},
	};
};

const manifestPlugin = (): Plugin => {
	const { getOutput, optimize } = loadConfig();
	const { clientOutPut } = getOutput();
	return {
		name: "manifestPlugin",
		async generateBundle(_, bundles) {
			if (optimize) return;
			const manifest: Record<string, string> = {};
			for (const bundle in bundles) {
				const val = bundle;
				const arr = bundle.split("/")[1].split(".");
				arr.splice(1, 2);
				manifest[arr.join(".")] = `${getOutputPublicPath()}${val}`;
			}
			if (!(await accessFile(resolve(clientOutPut)))) {
				mkdir("-p", resolve(clientOutPut));
			}
			manifest["vite"] = "1";
			await promises.writeFile(
				resolve(clientOutPut, "./asset-manifest.json"),
				JSON.stringify(manifest, null, 2),
			);
		},
	};
};

const writeGenerateMap = async () => {
	await promises.writeFile(
		resolve(getCwd(), "./build/asyncChunkMap.json"),
		JSON.stringify(asyncChunkMapJSON, null, 2),
	);
	await promises.writeFile(
		resolve(getCwd(), "./build/generateMap.json"),
		JSON.stringify(generateMap, null, 2),
	);
	await promises.writeFile(
		resolve(getCwd(), "./build/dependenciesMap.json"),
		JSON.stringify(dependenciesMap, null, 2),
	);
};

const setGenerateMap = (id: string) => {
	const res = manualChunksFn(id);
	generateMap[id] = res ?? "Page";
};

const rollupOutputOptions: () => OutputOptions = () => {
	const buildConfig = getBuildConfig();
	return {
		entryFileNames: (chunkInfo: PreRenderedChunk) => {
			return buildConfig.viteEntryChunk;
		},
		chunkFileNames: buildConfig.jsBuldConfig.chunkFileName,
		assetFileNames: (assetInfo) => {
			if (assetInfo.name?.includes("client-entry")) {
				return buildConfig.viteClientEntryChunk;
			}
			if (
				assetInfo.name &&
				(imageRegExp.test(assetInfo.name) ||
					fontRegExp.test(assetInfo.name))
			) {
				return buildConfig.viteImageChunk;
			}
			return buildConfig.viteAssetChunk;
		},
		manualChunks: (id: string) => {
			return generateMap[id];
		},
	};
};

const manualChunksFn = (id: string) => {
	if (id.includes("chunkName")) {
		const chunkName = chunkNameRe.exec(id)![1];
		return chunkName;
	}
	if (!process.env.LEGACY_VITE) {
		const sign = id.includes("node_modules") ? getPkgName(id) : id;
		if (vendorList.includes(sign)) {
			// build in Page chunk
			return "Page";
		}
		const arr = dependenciesMap[sign] ?? [];
		console.log("%c Line:548 🍬 arr", "color:#fff;background:#93c0a4", arr);
		if (arr.length === 1) {
			return arr[0];
		} else if (arr.length >= 2) {
			if (arr.includes("Page")) {
				return "Page";
			}
			const commonChunkName = cryptoAsyncChunkName(
				arr.map((item) => ({ name: item })),
				asyncChunkMapJSON,
			);
			return commonChunkName === "vendor~client-entry"
				? "common-vendor"
				: commonChunkName;
		}
	}
};

const commonConfig = (): UserConfig => {
	const { whiteList, alias, css, hmr, viteConfig, optimize } = loadConfig();
	const lessOptions = css?.().loaderOptions?.less?.lessOptions
		? css?.().loaderOptions?.less?.lessOptions
		: css?.().loaderOptions?.less;
	return {
		root: cwd,
		mode: process.env.VITEMODE ?? "development",
		...(optimize ? { logLevel: "slient" } : {}),
		server: {
			middlewareMode: "ssr" as const,
			hmr,
			...viteConfig?.().common?.server,
		},
		css: {
			postcss: css?.().loaderOptions?.postcss ?? {},
			preprocessorOptions: {
				less: {
					javascriptEnabled: true,
					...lessOptions,
				},
				scss: css?.().loaderOptions?.scss ?? {},
			},
		},
		// @ts-expect-error
		ssr: {
			external: defaultExternal.concat(
				viteConfig?.()?.server?.externals ?? [],
			),
			noExternal: whiteList,
		},
		resolve: {
			alias: alias,
			extensions: [".mjs", ".ts", ".jsx", ".tsx", ".json", ".vue", ".js"],
		},
	};
};
export {
	chunkNamePlugin,
	manifestPlugin,
	rollupOutputOptions,
	commonConfig,
	asyncOptimizeChunkPlugin,
	writeEmitter,
};
