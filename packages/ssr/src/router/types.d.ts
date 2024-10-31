import type { VNode, RendererNode, RendererElement } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import type { ISSRContext } from "../plugin-nest/types";
export interface ParseFeRouteItem {
	path: string;
	fetch?: string;
	component?: string;
	chunkName: string;
	name: string;
}

export interface RoutesType {
	Layout: VNode;
	App: VNode;
	layoutFetch?: (params: Params, ctx?: ISSRContext) => Promise<any>;
	FeRoutes: IFeRouteItem[];
}

export type IFeRouteItem = ESMFeRouteItem<{
	fetch?: ESMFetch;
}>;

export interface Params<U = {}> {
	router: RouteLocationNormalizedLoaded;
	ctx?: ISSRContext<U>;
	pinia: Pinia;
}
export type Fetch = (params: Params, ctx?: ISSRContext) => Promise<any>;

export type ESMFetch = () => Promise<{
	default: Fetch;
}>;

export type Fetch = (params: Params, ctx?: ISSRContext) => Promise<any>;

export interface VueRouterOptions {
	base?: string;
}
