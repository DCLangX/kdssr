import type { ISSRNestContext } from "../plugin-nest/types";
export type Script = {
	tagName?: string;
	describe?:
		| object
		| {
				attrs: object;
		  };
	content?: string;
}[];

export interface IConfig {
	rootId: string;
	cwd: string;
	alias?: Record<string, string>;
	isDev: boolean;
	dynamic: boolean; //是否开启代码分割，默认开启, Vite 模式下必须开启
	publicPath: string;
	useHash: boolean;
	host: string;
	fePort: number;
	serverPort: number;
	chunkName: string;
	getOutput: () => {
		clientOutPut: string;
		serverOutPut: string;
	};
	cssInline?: "all" | string[];
	assetsDir?: string;
	proxy?: any;
	cssOrder: string[];
	jsOrder: string[];
	extraJsOrder?: ((ctx: ISSRContext) => string[]) | string[] | undefined;
	extraCssOrder?: ((ctx: ISSRContext) => string[]) | string[] | undefined;
	jsOrderPriority?:
		| Record<string, number>
		| ((params: { chunkName: string }) => Record<string, number>);
	cssOrderPriority?:
		| Record<string, number>
		| ((params: { chunkName: string }) => Record<string, number>);
	css?: () => {
		loaderOptions?: {
			cssOptions?: any;
			less?: {
				/**
				 * transfer options to less
				 */
				lessOptions?: any;
				/**
				 * The following options  options only take effect in webpack
				 */
				additionalData?: string | Function;
				sourceMap?: boolean;
				webpackImporter?: boolean;
				implementation?: object;
			};
			/**
			 * only take effect in webpack
			 */
			sass?: any;
			/**
			 * only take effect in vite
			 */
			scss?: any;
			postcss?: {
				options?: Exclude<CSSOptions["postcss"], string>;
				plugins?: PostCssPlugin[];
			};
		};
	};
	moduleFileExtensions: string[];
	whiteList: Array<RegExp | string>;
	cloudIDE?: boolean;
	prefix: string;
	clientPrefix?: string;
	mode: "ssr" | "csr";
	stream: boolean;
	bigpipe?: boolean;
	customeHeadScript?: ((ctx: ISSRNestContext) => Script) | Script;
	customeFooterScript?: ((ctx: ISSRNestContext) => Script) | Script;
	locale?: {
		enable: boolean;
	};
	ssrVueLoaderOptions?: any;
	csrVueLoaderOptions?: any;
	corejs?: boolean;
	corejsOptions?: object;
	https: boolean | object;
	babelExtraModule?: RegExp[];
	routerPriority?: Record<string, number>; //针对同一前端 path 可对应多个路由时控制约定式路由优先级例如 /foo, 可以同时匹配 /:page /foo
	routerOptimize?: {
		include?: string[];
		exclude?: string[];
	};
	parallelFetch?: boolean;
	nestStartTips?: string;
	manifestPath: string;
	proxyKey: string[];
	vue3ServerEntry: string;
	vue3ClientEntry: string;
	optimize: boolean;
	onError?: (e: any) => null | string;
	onReady?: () => any;
	viteConfig?: () => {
		common?: {
			// 双端通用配置
			extraPlugin?: PluginOption | PluginOption[];
			server?: ServerOptions;
		};
		client?: {
			/**
			 * 默认装载的插件定义 options, vue3 场景是 @vitejs/plugin-vue, react 场景是 @vitejs/plugin-react
			 */
			defaultPluginOptions?: any;
			extraPlugin?: PluginOption | PluginOption[];
			otherConfig?: ViteConfig;
			processPlugin?: (plugins: PluginOption[]) => PluginOption[];
		};
		server?: {
			externals?: string[];
			defaultPluginOptions?: any;
			extraPlugin?: PluginOption | PluginOption[];
			otherConfig?: ViteConfig;
			processPlugin?: (plugins: PluginOption[]) => PluginOption[];
		};
	};
	hmr?: {
		host?: string;
		port?: number;
	};
	define?: {
		base?: Record<string, string>;
		client?: Record<string, string>;
		server?: Record<string, string>;
	};
	babelOptions?: RollupBabelInputPluginOptions & {
		include?: RegExp[];
	};
	hashRouter?: boolean;
	htmlTemplate?: string;
	writeDebounceTime: number;
	dynamicFile: {
		serverBundle: string;
		asyncChunkMap: string;
		assetManifest: string;
		configFile?: string;
	};
	staticConfigPath: string;
	framework?: string;
	/**
	 * react场景设置默认的stream缓冲区大小默认为 16kb，当页面体积过大超过限制时会渲染失败，单位byte,(1024*1024 = 1mb)
	 */
	streamHighWaterMark?: number;
	asyncGlobalData?: Record<string, any>;
}

export type UserConfig = Partial<IConfig>;
