import { promises } from "fs";
import { join, isAbsolute, dirname } from "path";
import { fileURLToPath } from "url";
import { stringify } from "qs";
import type { IConfig, UserConfig } from "../utils/types";
import type { ISSRContext, ISSRNestContext } from "./types";
import { h } from "vue";
import type { Script } from "../utils/types";
import { createRequire } from "node:module";
import { getCwd, stringifyDefine } from "../utils";
// 获取当前模块的绝对路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建一个指向当前模块所在目录的 require 实例
const require = createRequire(__dirname);
export const setHeader = (ctx: ISSRContext, serverFrameWork: string) => {
	// if (serverFrameWork === 'ssr-plugin-midway') {
	//   ctx.response.type = 'text/html;charset=utf-8'
	// } else if (serverFrameWork === 'ssr-plugin-nestjs') {
	// if ((ctx as ISSRNestContext).response.setHeader) {
	// for express
	if (!(ctx as ISSRNestContext).response.headersSent) {
		(ctx as ISSRNestContext).response.setHeader(
			"Content-type",
			"text/html;charset=utf-8",
		);
	}
	// }
	// }
};

export const splitPageInfo = (
	info: Record<string, string | boolean | object>,
): string =>
	stringify(info, {
		encode: false,
		delimiter: ";",
	});

/**
 * @description: 读取之前的vite插件打包时生成的./build/asyncChunkMap.json文件，仅生产打包才有
 * @param {IConfig} config
 * @param {*} Promise
 * @param {*} string
 * @return {*}
 */
const readAsyncChunk = async (
	config: IConfig,
): Promise<Record<string, string>> => {
	try {
		const { dynamicFile } = config;
		const str = (
			await promises.readFile(dynamicFile?.asyncChunkMap)
		).toString();
		return JSON.parse(str);
	} catch (error) {
		return {};
	}
};
/**
 * @description: 根据路由条目的chunkName，获取资源映射文件中记载的该路由所需的css或js资源文件
 * @param {string} chunkName
 * @param {IConfig} config
 * @param {*} type
 * @return {*}
 */
const addAsyncChunk = async (
	chunkName: string,
	config: IConfig,
	type: "css" | "js",
) => {
	const arr = [];
	const asyncChunkMap = await getManifest(config);
	// 取得静态资源文件映射表
	for (const key in asyncChunkMap) {
		if (key === chunkName) {
			arr.push(
				...asyncChunkMap[key].filter((item) => item.endsWith(type)),
			);
		}
	}
	return arr;
};

/**
 * @description: 处理需要插入的自定义资源文件，如果传入的是函数，则执行函数，否则直接返回数组
 * @param {UserConfig.extraJsOrder} order
 * @param {ISSRContext} ctx
 * @param {*} string
 * @return {*} 返回要插入的文件名的数组
 */
export const nomalrizeOrder = (
	order: UserConfig["extraJsOrder"],
	ctx: ISSRContext,
): string[] => {
	if (!order) {
		return [];
	}
	if (Array.isArray(order)) {
		return order;
	} else {
		return order(ctx);
	}
};

const envVarRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

export const getDefineEnv = () => {
	const envObject: Record<string, string | undefined> = {};
	Object.keys(process.env).forEach((key) => {
		if (envVarRegex.test(key)) {
			envObject[`process.env.${key}`] = process.env[key];
		}
	});
	stringifyDefine(envObject);
	return envObject;
};

/**
 * @description: 获取路由的chunkName所需的css文件
 * @param {ISSRContext} ctx
 * @param {string} chunkName 路由条目里的chunkName
 * @param {IConfig} config ssr框架配置
 * @param {*} Promise
 * @return {*}
 */
export const getAsyncCssChunk = async (
	ctx: ISSRContext,
	chunkName: string,
	config: IConfig,
): Promise<string[]> => {
	const { extraCssOrder, cssOrderPriority } = config;
	const combineOrder = [
		...nomalrizeOrder(extraCssOrder, ctx),
		...(await addAsyncChunk(chunkName, config, "css")),
	];
	// 以上获取到了默认的和自定义的所有css列表，接下来进行排序
	if (cssOrderPriority) {
		const priority =
			typeof cssOrderPriority === "function"
				? cssOrderPriority({ chunkName })
				: cssOrderPriority;
		combineOrder.sort((a, b) => {
			// 没有显示指定的路由优先级统一为 0
			return (priority[b] || 0) - (priority[a] || 0);
		});
	}
	return combineOrder;
};
export const getAsyncJsChunk = async (
	ctx: ISSRContext,
	chunkName: string,
	config: IConfig,
): Promise<string[]> => {
	const { extraJsOrder, jsOrderPriority } = config;
	const combineOrder = [
		...nomalrizeOrder(extraJsOrder, ctx),
		...(await addAsyncChunk(chunkName, config, "js")),
	];
	if (jsOrderPriority) {
		const priority =
			typeof jsOrderPriority === "function"
				? jsOrderPriority({ chunkName })
				: jsOrderPriority;
		combineOrder.sort((a, b) => {
			// 没有显示指定的路由优先级统一为 0
			return (priority[b] || 0) - (priority[a] || 0);
		});
	}
	return combineOrder;
};

export const getUserScriptVue = (options: {
	script: UserConfig["customeHeadScript"];
	ctx: ISSRContext;
	position: "header" | "footer";
	staticConfig: UserConfig;
}) => {
	const { script, ctx, position, staticConfig } = options;
	const defaultScriptArr = getScriptArr(script, ctx);
	const staticScript =
		position === "header"
			? staticConfig.customeHeadScript
			: staticConfig.customeFooterScript;
	const staticScriptArr = getScriptArr(staticScript, ctx);
	return defaultScriptArr.concat(staticScriptArr);
};

export const getScriptArr = (
	script: UserConfig["customeHeadScript"],
	ctx: ISSRContext,
) => {
	return Array.isArray(script) ? script : (script?.(ctx) ?? []);
};
/**
 * @description: 处理需要内联的css，inlineCssContent存放所有内联的css内容，cssInjectOrder存放普通的css文件名
 * @param {array} dynamicCssOrder 需要加载的css文件名列表
 * @return {*}
 */
export const getInlineCss = async ({
	dynamicCssOrder,
	config,
}: {
	dynamicCssOrder: string[];
	config: UserConfig;
}) => {
	const { cssInline } = config;
	const cwd = getCwd();

	const { cssInlineOrder, cssInjectOrder } =
		cssInline === "all"
			? {
					cssInlineOrder: dynamicCssOrder,
					cssInjectOrder: [],
				}
			: dynamicCssOrder.reduce(
					(pre, curr) => ({
						cssInlineOrder: cssInline?.includes(curr)
							? [...pre.cssInlineOrder, curr]
							: pre.cssInlineOrder,
						cssInjectOrder: !cssInline?.includes(curr)
							? [...pre.cssInjectOrder, curr]
							: pre.cssInjectOrder,
					}),
					{
						cssInlineOrder: [] as string[],
						cssInjectOrder: [] as string[],
					},
				);
	const inlineCssContent = (
		await Promise.all(
			cssInlineOrder
				.filter(Boolean)
				.map((css) =>
					promises.readFile(
						isAbsolute(css!) && !css!.startsWith("/client")
							? css!
							: join(cwd, "./build", css!),
					),
				),
		)
	).map((item) => item.toString());

	return [inlineCssContent, cssInjectOrder];
};

/**
 * @description: 获取manifest
 * @param {IConfig} config
 * @param {*} Promise
 * @param {*} string
 * @return {*}
 */
export const getManifest = async (
	config: IConfig,
): Promise<Record<string, string[]>> => {
	const { isDev, dynamicFile } = config;
	let manifest = {};
	if (dynamicFile.configFile ?? !isDev) {
		manifest = require(dynamicFile.assetManifest);
	}
	return manifest;
};

export const getInlineCssVNode = (arr: string[]) =>
	arr.map((item) =>
		h("style", {
			innerHTML: item,
		}),
	);

export const getVNode = (arr: Script) =>
	arr.map((item) =>
		h(
			item.tagName ?? "script",
			Object.assign({}, item.describe, {
				innerHTML: item.content,
			}),
		),
	);
