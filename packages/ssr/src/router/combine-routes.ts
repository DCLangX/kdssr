// import { createRequire } from "node:module";
import { RoutesType } from "./types";
// import { getCwd } from "../utils";
// import { resolve } from "node:path";
// import { pathToFileURL } from "node:url";
// @ts-ignore
import * as DeclareRoutes from "_build/ssr-declare-routes";
// @ts-ignore
import * as ManualRoutes from "_build/ssr-manual-routes";
// const newRequire = createRequire(import.meta.url);

const updateChildPath = (
	routes: RoutesType["FeRoutes"],
	parentpath: string | null,
) => {
	routes.forEach((route) => {
		const { path } = route;
		if (parentpath) {
			route.childPath = path.startsWith("/")
				? `${parentpath}${path}`
				: `${parentpath}/${path}`;
		}
		if (route.children) {
			updateChildPath(route.children, path);
		}
	});
};

export const combineRoutes = (
	declareRoutes?: any,
	manualRoutes?: any,
): RoutesType => {
	// declareRoutes =
	// 	declareRoutes ||
	// 	(await import(
	// 		pathToFileURL(resolve(getCwd(), "./build/ssr-declare-routes.js"))
	// 			.href
	// 	));
	// console.log(
	// 	"%c Line:11 🍐 declareRoutes",
	// 	"color:#fff;background:#93c0a4",
	// 	declareRoutes,
	// );
	// manualRoutes =
	// 	manualRoutes ||
	// 	(await import(
	// 		pathToFileURL(resolve(getCwd(), "./build/ssr-manual-routes.js"))
	// 			.href
	// 	));
	const declareRoutesType = declareRoutes;
	const manualRoutesType = manualRoutes;
	const Routes = {
		...declareRoutesType,
		...manualRoutesType,
	};
	if (manualRoutesType.FeRoutes) {
		// 声明式路由覆盖约定式路由同名path
		const combineRoutes = declareRoutesType.FeRoutes.map(
			(route) =>
				manualRoutesType.FeRoutes.find((e) => e.path === route.path) ??
				route,
		);
		manualRoutesType.FeRoutes.forEach((route) => {
			// 补充声明式路由新增的配置
			const found = combineRoutes.find((e) => e.path === route.path);
			if (!found) {
				combineRoutes.push(route);
			}
		});
		updateChildPath(combineRoutes, null);
		Routes.FeRoutes = combineRoutes;
	}
	return Routes;
};

const Routes = combineRoutes(DeclareRoutes, ManualRoutes) as RoutesType;

export { Routes };
