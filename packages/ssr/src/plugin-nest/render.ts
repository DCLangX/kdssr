import { Readable, Stream } from "stream";
import { getDirname, loadConfig } from "../utils";
import type { ISSRContext, ISSRNestContext, Vue3RenderRes } from "./types";
import type { UserConfig, IConfig } from "../utils/types";
import type { ViteDevServer } from "vite";
import { createRequire } from "node:module";
import * as cheerio from "cheerio";
import { resolve, join } from "node:path";
import { accessFile, getCwd } from "../utils";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);

const defaultConfig = loadConfig();

// const sf = judgeServerFramework();
// const f = judgeFramework();
// const viteServerEntry = getViteServerEntry();
type RenderRes = string | Readable | Vue3RenderRes;

const setHeader = (ctx: ISSRContext) => {
	// for express
	if (!(ctx as ISSRNestContext).response.headersSent) {
		(ctx as ISSRNestContext).response.setHeader(
			"Content-type",
			"text/html;charset=utf-8",
		);
	}
};
const getCustomScript = (
	script: UserConfig["customeHeadScript"],
	ctx: ISSRContext,
) => {
	return Array.isArray(script) ? script : (script?.(ctx) ?? []);
};

function render(
	ctx: ISSRContext,
	options?: UserConfig & { stream: true },
): Promise<Readable>;
// function render(
// 	ctx: ISSRContext,
// 	options?: UserConfig & { stream: false },
// ): Promise<string>;
function render<T = string>(ctx: ISSRContext, options?: UserConfig): Promise<T>;

/**
 * @description: nestjs渲染页面的入口函数
 * @param {ISSRContext} ctx
 * @param {UserConfig} options
 * @return {*}
 */
async function render(ctx: ISSRContext, options?: UserConfig) {
	const mergeConfig: IConfig = {
		...defaultConfig,
		...(options?.dynamicFile?.configFile
			? (require(options.dynamicFile.configFile) as any).userConfig
			: {}),
	};
	// console.log(
	// 	"%c Line:54 🍏 mergeConfig",
	// 	"color:#fff;background:#3f7cff",
	// 	mergeConfig,
	// );

	const config: IConfig = Object.assign({}, mergeConfig, options);
	// support combine dynamic customeHeadScript when call render
	const { customeHeadScript, customeFooterScript } = mergeConfig;
	config.customeHeadScript = getCustomScript(customeHeadScript, ctx).concat(
		getCustomScript(options?.customeHeadScript, ctx),
	);
	config.customeFooterScript = getCustomScript(
		customeFooterScript,
		ctx,
	).concat(getCustomScript(options?.customeFooterScript, ctx));

	setHeader(ctx);

	const serverRes: RenderRes = await viteRender(ctx, config);
	if (serverRes instanceof Stream) {
		return serverRes;
	} else {
		let { html, teleportsContext } = serverRes as Vue3RenderRes;
		if (teleportsContext.teleports) {
			const { teleports } = teleportsContext;
			const $ = cheerio.load(html);
			for (const target in teleports) {
				const content = teleports[target];
				$(target).append(content);
			}
			html = $.html();
		}
		return `<!DOCTYPE html>${html}`;
	}
}

let viteServer: ViteDevServer | boolean = false;

async function viteRender(ctx: ISSRContext, config: IConfig) {
	const { isDev, dynamicFile } = config;
	let serverRes;
	if (isDev) {
		// 开发模式使用vite实时渲染，这里的vite服务器仅用作服务端首屏渲染功能，静态文件实际是由中间件那里的viteServer提供的
		const __dirname = getDirname(import.meta.url);
		const { createServer } = await import("vite");
		viteServer = !viteServer
			? await createServer({
					server: { middlewareMode: true },
					appType: "custom",
					define: {
						__isBrowser__: false,
					},
				})
			: viteServer;
		const { serverRender } = await (
			viteServer as ViteDevServer
		).ssrLoadModule(resolve(__dirname, "./server-entry.mjs"));
		serverRes = await serverRender(ctx, config);
	} else {
		// 生产模式使用构建完成的server bundle渲染
		const cwd = getCwd();

		const { serverRender } = await import(
			pathToFileURL(join(cwd, "./build/server/Page.server.js")).href
		);
		const serverRes = await serverRender(ctx, config);
		return serverRes;
	}
	return serverRes;
}

export { render };
