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
const addAsyncChunk = async (
	webpackChunkName: string,
	config: IConfig,
	type: "css" | "js",
) => {
	const arr = [];
	const asyncChunkMap = await readAsyncChunk(config);
	for (const key in asyncChunkMap) {
		if (
			asyncChunkMap[key].includes(webpackChunkName) ||
			asyncChunkMap[key].includes("client-entry")
		) {
			arr.push(`${key}.${type}`);
		}
	}
	return arr;
};

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

export const getAsyncCssChunk = async (
	ctx: ISSRContext,
	webpackChunkName: string,
	config: IConfig,
): Promise<string[]> => {
	const { cssOrder, extraCssOrder, cssOrderPriority } = config;
	const combineOrder = cssOrder.concat([
		...nomalrizeOrder(extraCssOrder, ctx),
		...(await addAsyncChunk(webpackChunkName, config, "css")),
		`${webpackChunkName}.css`,
	]);
	if (cssOrderPriority) {
		const priority =
			typeof cssOrderPriority === "function"
				? cssOrderPriority({ chunkName: webpackChunkName })
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
	webpackChunkName: string,
	config: IConfig,
): Promise<string[]> => {
	const { jsOrder, extraJsOrder, jsOrderPriority } = config;
	const combineOrder = jsOrder.concat([
		...nomalrizeOrder(extraJsOrder, ctx),
		...(await addAsyncChunk(webpackChunkName, config, "js")),
	]);
	if (jsOrderPriority) {
		const priority =
			typeof jsOrderPriority === "function"
				? jsOrderPriority({ chunkName: webpackChunkName })
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
export const getInlineCss = async ({
	dynamicCssOrder,
	manifest,
	config,
}: {
	dynamicCssOrder: string[];
	manifest: Record<string, string | undefined>;
	config: UserConfig;
}) => {
	console.log(
		"%c Line:174 🍤 manifest",
		"color:#fff;background:#465975",
		manifest,
	);
	console.log(
		"%c Line:173 🍓 dynamicCssOrder",
		"color:#fff;background:#2eafb0",
		dynamicCssOrder,
	);
	const { cssInline } = config;
	console.log(
		"%c Line:177 🍬 cssInline",
		"color:#fff;background:#93c0a4",
		cssInline,
	);
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
				.map((css) => manifest[css])
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

export const getManifest = async (
	config: IConfig,
): Promise<Record<string, string | undefined>> => {
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
