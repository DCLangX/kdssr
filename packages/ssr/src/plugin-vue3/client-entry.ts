import { h, createSSRApp, createApp, reactive, renderSlot } from "vue";
// import { Store } from 'vuex'
import { RouteLocationNormalizedLoaded } from "vue-router";
// import { setPinia, setApp } from "./client-store";
import { findRoute } from "../router/findRoute";
import { createPinia, Pinia } from "pinia";
import { createRouter } from "../router/create";

import { Routes } from "../router/combine-routes";

import type { ESMFetch } from "./types";
import type { IFeRouteItem } from "../router/types";

declare let window: any;

const { FeRoutes, App, layoutFetch } = Routes;

let hasRender = false;
async function getAsyncCombineData(
	fetch: ESMFetch | undefined,
	router: RouteLocationNormalizedLoaded,
	pinia: Pinia,
) {
	const layoutFetchData = layoutFetch
		? await layoutFetch({ router, pinia })
		: {};
	let fetchData = {};

	if (fetch) {
		const fetchFn = await fetch();
		fetchData = await fetchFn.default({ router, pinia });
	}
	return Object.assign({}, layoutFetchData ?? {}, fetchData ?? {});
}

const clientRender = () => {
	// const store = createStore()
	const router = createRouter({
		base: window.prefix,
		hashRouter: window.hashRouter,
	});
	const pinia = createPinia();
	// setStore(store)
	// setPinia(pinia);

	const create = window.__USE_SSR__ ? createSSRApp : createApp;

	// if (window.__INITIAL_DATA__) {
	//   store.replaceState(window.__INITIAL_DATA__)
	// }
	if (window.__INITIAL_PINIA_DATA__) {
		pinia.state.value = window.__INITIAL_PINIA_DATA__;
	}

	const asyncData = reactive({
		value: window.__INITIAL_PINIA_DATA__ ?? {},
	});
	const reactiveFetchData = reactive({
		value: window.__INITIAL_PINIA_DATA__ ?? {},
	});
	const fetchData = window.__INITIAL_PINIA_DATA__ ?? {}; // will be remove at next major version

	const app = create({
		render() {
			return renderSlot(this.$slots, "default", {}, () => [
				h(App, {
					asyncData,
					fetchData,
					reactiveFetchData,
				}),
			]);
		},
	});
	// app.use(store)
	app.use(router);
	app.use(pinia);
	// setApp(app);
	router.beforeResolve(async (to, from, next) => {
		if (hasRender || !window.__USE_SSR__) {
			// 找到要进入的组件并提前执行 fetch 函数
			const { fetch } = findRoute<IFeRouteItem>(FeRoutes, to.path);
			const combineAysncData = await getAsyncCombineData(
				fetch,
				to,
				pinia,
			);
			to.matched?.forEach((item) => {
				item.props.default = Object.assign(
					{},
					item.props.default ?? {},
					{
						fetchData: combineAysncData,
					},
				);
			});
			reactiveFetchData.value = combineAysncData;
			asyncData.value = Object.assign(asyncData.value, combineAysncData);
		}
		hasRender = true;
		next();
	});
	return {
		app,
		pinia,
		router,
		mount: async () => {
			await router.isReady();
			app.mount(window.ssrDevInfo.rootId ?? "#app", !!window.__USE_SSR__);
		}, // judge ssr/csr
	};

	// if (!window.__USE_VITE__) {
	// 	(module as any)?.hot?.accept?.(); // webpack hmr for vue jsx
	// }
};

// clientRender();
export default clientRender;
