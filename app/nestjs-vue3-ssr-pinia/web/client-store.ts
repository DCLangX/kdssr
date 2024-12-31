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

export const setPinia = (pinia: Pinia) => {
	piniaCache.set(pinia);
};
export const usePinia = () => {
	return piniaCache.get();
};

export const useCtx = () => {
	console.warn("useCtx can only be used on the server side");
	return {};
};

export const setApp = (app: App) => {
	appCache.set(app);
};
export const useApp = () => {
	return appCache.get();
};
