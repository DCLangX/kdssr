import {
	createRouter as create,
	createWebHistory,
	createMemoryHistory,
	createWebHashHistory,
} from "vue-router";
import { Routes } from "./combine-routes";
import type { RoutesType, VueRouterOptions } from "./types";

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
			: createMemoryHistory(base),
		routes: FeRoutes as any,
	});
}
