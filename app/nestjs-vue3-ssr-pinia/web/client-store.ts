import type { ISSRContext } from "kdssr";
import type { Pinia } from "pinia";
import type { App } from "vue";

const piniaCache = {
	val: {
		pinia: {} as Pinia,
	},
	set: function (pinia: Pinia) {
		this.val.pinia = pinia;
	},
	get: function () {
		return this.val.pinia;
	},
};

const appCache = {
	val: {
		app: {} as App,
	},
	set: function (app: App) {
		this.val.app = app;
	},
	get: function () {
		return this.val.app;
	},
};

const ctxCache = {
	val: {
		ctx: {} as ISSRContext,
	},
	set: function (ctx: ISSRContext) {
		this.val.ctx = ctx;
	},
	get: function () {
		return this.val.ctx;
	},
};

export const setPinia = (pinia: Pinia) => {
	piniaCache.set(pinia);
};
export const usePinia = () => {
	return piniaCache.get();
};

export const setCtx = (ctx: ISSRContext) => {
	ctxCache.set(ctx);
};
export const useCtx = () => {
	if (__isBrowser__) {
		console.warn("useCtx can only be used on the server side");
		return {} as any;
	} else {
		return ctxCache.get();
	}
};

export const setApp = (app: App) => {
	appCache.set(app);
};
export const useApp = () => {
	return appCache.get();
};
