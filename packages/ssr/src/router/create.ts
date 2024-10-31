// import { h } from "vue";
import {
	createRouter as create,
	createWebHistory,
	createMemoryHistory,
	createWebHashHistory,
} from "vue-router";
import { Routes } from "./combine-routes";
import type { RoutesType, VueRouterOptions } from "./types";
// import type { Script } from "../utils/types";

const { FeRoutes } = Routes as RoutesType;
declare const __isBrowser__: boolean;
export function createRouter(
	options: VueRouterOptions & { hashRouter?: boolean } = {},
) {
	const base = options.base ?? "/";
	const { hashRouter } = options;
	return create({
		history: __isBrowser__
			? hashRouter
				? createWebHashHistory(base)
				: createWebHistory(base)
			: createMemoryHistory(),
		routes: FeRoutes as any,
	});
}

// export const getInlineCssVNode = (arr: string[]) =>
// 	arr.map((item) =>
// 		h("style", {
// 			innerHTML: item,
// 		}),
// 	);

// export const getVNode = (arr: Script) =>
// 	arr.map((item) =>
// 		h(
// 			item.tagName ?? "script",
// 			Object.assign({}, item.describe, {
// 				innerHTML: item.content,
// 			}),
// 		),
// 	);
