import { h, createSSRApp, renderSlot, VNode } from "vue";
import { logGreen, normalizePath } from "../utils";
import type { ISSRContext } from "./types";
import type { IConfig } from "../utils/types";
import { createPinia } from "pinia";
import { serialize } from "ssr-serialize-javascript";
import { renderToNodeStream, renderToString } from "vue/server-renderer";
import { Routes } from "../router/combine-routes";
import { createRouter } from "../router/create";
import { IFeRouteItem } from "../router/types";
import { checkRoute, findRoute } from "../router/findRoute";
import {
	getManifest,
	getAsyncCssChunk,
	getAsyncJsChunk,
	getUserScriptVue,
	splitPageInfo,
	getInlineCss,
	getInlineCssVNode,
	getVNode,
} from "./runtime";
import { localStorageWrapper, appLocalStoreageWrapper } from "./server-store";
import { getStaticConfig } from "../utils/config";
import type { vue3AppParams } from "../plugin-vue3/types";

const { FeRoutes, App, layoutFetch, Layout } = Routes;
const staticConfig = getStaticConfig();

/**
 * @description: 执行服务端渲染逻辑
 * @param {ISSRContext} ctx
 * @param {IConfig} config
 * @return {*}
 */
const serverRender = async (
	ctx: ISSRContext<{ modules: any }>,
	config: IConfig,
) => {
	const {
		mode,
		customeHeadScript,
		customeFooterScript,
		parallelFetch,
		prefix,
		isDev,
		clientPrefix,
		stream,
		fePort,
		https,
		rootId,
		bigpipe,
		hashRouter,
	} = config;
	const router = createRouter();
	const pinia = createPinia();
	const rawPath = ctx.request.path ?? ctx.request.url;
	const [path, url] = [
		normalizePath(rawPath, prefix),
		normalizePath(ctx.request.url, prefix),
	];
	const routeItem = findRoute<IFeRouteItem>(FeRoutes, path);
	checkRoute({ routeItem, path });

	const getApp = ({
		combineAysncData,
		layoutFetchData,
		asyncData,
		manifest,
		isCsr,
		jsInject,
		cssInject,
		inlineCssOrder,
		rootId,
	}: vue3AppParams) => {
		const app = createSSRApp({
			render: function () {
				const ssrDevInfo = {
					manifest: isDev ? manifest : "",
					rootId,
					fePort: isDev ? fePort : "",
					https: isDev ? https : "",
				};
				const innerHTML = splitPageInfo({
					"window.__USE_SSR__": !isCsr,
					"window.__INITIAL_PINIA_DATA__": isCsr
						? {}
						: serialize(pinia.state.value),
					"window.__USE_VITE__": true,
					"window.prefix": `"${prefix}"`,
					"window.clientPrefix": `"${clientPrefix ?? ""}"`,
					"window.ssrDevInfo": JSON.stringify(ssrDevInfo),
					"window.hashRouter": Boolean(hashRouter),
				});
				const initialData = h("script", { innerHTML });
				const children = bigpipe
					? ""
					: h(App, {
							ctx,
							config,
							asyncData,
							fetchData: combineAysncData,
							reactiveFetchData: { value: combineAysncData },
							ssrApp: app,
						});
				const customeHeadScriptArr: VNode[] = getVNode(
					getUserScriptVue({
						script: customeHeadScript,
						ctx,
						position: "header",
						staticConfig,
					}),
				).concat(getInlineCssVNode(inlineCssOrder));
				const customeFooterScriptArr: VNode[] = getVNode(
					getUserScriptVue({
						script: customeFooterScript,
						ctx,
						position: "footer",
						staticConfig,
					}),
				);
				return h(
					Layout,
					{
						ctx,
						config,
						asyncData,
						fetchData: layoutFetchData,
						reactiveFetchData: { value: layoutFetchData },
					},
					{
						customeHeadScript: () => customeHeadScriptArr,

						customeFooterScript: () => customeFooterScriptArr,

						children: () => children,

						initialData: () => initialData,

						cssInject: () => cssInject,

						jsInject: () => jsInject,

						injectHeader: () => [customeHeadScriptArr, cssInject],

						content: () => [
							h(
								"div",
								{
									id: rootId.replace("#", ""),
								},
								renderSlot(this.$slots, "default", {}, () => [
									children,
								]),
							),
							initialData,
							customeFooterScriptArr,
							jsInject,
						],
					},
				);
			},
		});
		return app;
	};

	const fn = async () => {
		const { fetch, chunkName } = routeItem;
		const dynamicCssOrder = await getAsyncCssChunk(ctx, chunkName, config);
		console.log(
			"%c Line:166 🥒 dynamicCssOrder",
			"color:#fff;background:#33a5ff",
			dynamicCssOrder,
		);
		console.log(
			"%c Line:171 🥪 ctx.modules",
			"color:#fff;background:#ffdd4d",
			ctx.modules,
		);
		const dynamicJsOrder = await getAsyncJsChunk(ctx, chunkName, config);
		const manifest = await getManifest(config);
		const [inlineCssOrder, extraCssOrder] = await getInlineCss({
			dynamicCssOrder,
			manifest,
			config,
		});
		console.log(
			"%c Line:182 🍊 inlineCssOrder",
			"color:#fff;background:#42b983",
			inlineCssOrder,
		);
		console.log(
			"%c Line:182 🍕 extraCssOrder",
			"color:#fff;background:#3f7cff",
			extraCssOrder,
		);
		const isCsr = !!(mode === "csr" || ctx.request.query?.csr);

		const cssInject = (
			isDev
				? [
						h("script", {
							type: "module",
							src: "/@vite/client",
						}),
					]
				: extraCssOrder
						.map((css) => manifest[css])
						.filter(Boolean)
						.map((css) =>
							h("link", {
								rel: "stylesheet",
								href: css,
							}),
						)
		).concat(
			isDev
				? []
				: dynamicJsOrder
						.map((js) => manifest[js])
						.filter(Boolean)
						.map((js) =>
							h("link", {
								href: js,
								as: "script",
								rel: "modulepreload",
							}),
						),
		);
		console.log(
			"%c Line:197 🌰 cssInject",
			"color:#fff;background:#b03734",
			cssInject,
		);

		const jsInject = isDev
			? [
					h("script", {
						type: "module",
						src: "/node_modules/kdssr/dist/plugin-vue3/client-entry.mjs",
					}),
				]
			: dynamicJsOrder
					.map((js) => manifest[js])
					.filter(Boolean)
					.map((js) =>
						h("script", {
							src: js,
							type: "module",
						}),
					);
		let [layoutFetchData, fetchData] = [{}, {}];
		if (!isCsr && !bigpipe) {
			// not fetch when generate <head>
			router.push(url);
			await router.isReady();
			const currentFetch = fetch ? (await fetch()).default : null;
			const { value } = router.currentRoute;
			const lF = layoutFetch
				? layoutFetch({ router: value, ctx, pinia }, ctx)
				: Promise.resolve({});
			const CF = currentFetch
				? currentFetch({ router: value, ctx, pinia }, ctx)
				: Promise.resolve({});
			[layoutFetchData, fetchData] = parallelFetch
				? await Promise.all([lF, CF])
				: [await lF, await CF];
		} else {
			logGreen(`Current path ${path} use csr render mode`);
		}
		const combineAysncData = Object.assign(
			{},
			layoutFetchData ?? {},
			fetchData ?? {},
		);

		const asyncData = {
			value: combineAysncData,
		};

		const app = getApp({
			asyncData,
			layoutFetchData,
			combineAysncData,
			manifest,
			jsInject,
			cssInject,
			isCsr,
			inlineCssOrder,
			rootId,
		});
		app.config.errorHandler =
			app.config.errorHandler ??
			((e) => {
				throw e;
			});
		app.use(router);
		app.use(pinia);

		const res = await appLocalStoreageWrapper.run(
			{
				app,
			},
			async () => {
				if (stream) {
					return renderToNodeStream(app, ctx);
				} else {
					const teleportsContext: {
						teleports?: Record<string, string>;
					} = {};
					const html = await renderToString(app, teleportsContext);
					return {
						html,
						teleportsContext,
					};
				}
			},
		);
		return res;
	};
	const res = await localStorageWrapper.run(
		// 将本次请求的上下文的pinia实例和ctx实例存到AsyncLocalStorage中，以便在后续的异步操作中可以随时访问到
		{
			pinia,
			ctx,
		},
		fn,
	);
	return res;
};

export { serverRender, Routes };
