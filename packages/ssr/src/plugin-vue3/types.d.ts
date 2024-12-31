import type { VNode, RendererNode, RendererElement } from "vue";

export interface vue3AppParams {
	rootId: string;
	combineAysncData: any;
	layoutFetchData: any;
	asyncData: any;
	manifest: Record<string, string[]>;
	isCsr: boolean;
	jsInject: VNode<RendererNode, RendererElement, Record<string, any>>[];
	cssInject: VNode<RendererNode, RendererElement, Record<string, any>>[];
	inlineCssOrder: string[];
}

export type ESMFetch = () => Promise<{
	default: Fetch;
}>;

export interface IWindow {
	__USE_SSR__?: boolean;
	__INITIAL_PINIA_DATA__?: any;
	STORE_CONTEXT?: any;
	__USE_VITE__?: boolean;
	prefix?: string;
	clientPrefix?: string;
	microApp?: any;
	hashRouter: boolean;
	ssrDevInfo: {
		manifest: Record<string, string>;
		rootId: string;
		fePort?: number;
		https?: boolean;
	};
}
