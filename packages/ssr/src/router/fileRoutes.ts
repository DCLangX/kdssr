import { promises as fs } from "fs";
import { join, resolve } from "path";
import { ParseFeRouteItem } from "./types";
// import { writeRoutes, transformManualRoutes } from "./cwd";
import {
	loadConfig,
	getPagesDir,
	getFeDir,
	accessFile,
	getCwd,
} from "../utils";
import { transformManualRoutes } from "./manaualRoutes";
// 处理文件路由

const parseFeRoutes = async () => {
	// 根据目录结构生成前端路由表
	const dir = getPagesDir();
	const { dynamic, routerPriority, routerOptimize } = loadConfig();
	const pathRecord = [""]; // 路径记录
	const route: ParseFeRouteItem = {} as any;
	let arr = await renderRoutes(dir, pathRecord, route);
	if (routerPriority) {
		// 路由优先级排序
		arr.sort((a, b) => {
			// 没有显示指定的路由优先级统一为 0
			return (
				(routerPriority[b.path] || 0) - (routerPriority[a.path] || 0)
			);
		});
	}

	if (routerOptimize) {
		// 路由过滤
		if (routerOptimize.include && routerOptimize.exclude) {
			throw new Error("include and exclude cannot exist synchronal");
		}
		if (routerOptimize.include) {
			arr = arr.filter((route) =>
				routerOptimize?.include?.includes(route.path),
			);
		}
		if (routerOptimize.exclude) {
			arr = arr.filter(
				(route) => !routerOptimize?.exclude?.includes(route.path),
			);
		}
	}
	// 以上文件路由处理完毕，接下来转成字符串，并替换成异步加载组件的写法，然后写入文件
	const layoutPath = "@/components/layout/index";
	const AppPath = "@/components/layout/App";
	const layoutFetch = await accessFile(
		join(getFeDir(), "./components/layout/fetch.ts"),
	);
	const re = /"chunkName":("(.+?)")/g;
	let routes = `
      // The file is provisional which will be overwritten when restart
      export const FeRoutes = ${JSON.stringify(arr)} 
      export { default as Layout } from "${layoutPath}"
      export { default as App } from "${AppPath}"
      ${layoutFetch ? 'export { default as layoutFetch } from "@/components/layout/fetch"' : ""}
      `;
	routes = routes.replace(/"component":("(.+?)")/g, (global, m1, m2) => {
		const chunkName = re.exec(routes)[2];
		if (dynamic) {
			return `"component": function dynamicComponent () {
          return import(/* chunkTypeName: "${chunkName}" */ '${m2.replace(/\^/g, '"')}')
        }
        `;
		} else {
			return `"component": import('${m2.replace(/\^/g, '"')}')`;
		}
	});
	re.lastIndex = 0;
	routes = routes.replace(/"fetch":("(.+?)")/g, (global, m1, m2) => {
		const chunkName = re.exec(routes)[2];
		return `"fetch": () => import(/* chunkTypeName: "${chunkName}-fetch" */ '${m2.replace(/\^/g, '"')}')`;
	});
	await writeRoutes(routes, "ssr-declare-routes.js");
	await transformManualRoutes();
};

const renderRoutes = async (
	pageDir: string,
	pathRecord: string[],
	route: ParseFeRouteItem,
): Promise<ParseFeRouteItem[]> => {
	let arr: ParseFeRouteItem[] = []; //最终输出的路由数组
	const pagesFolders = await fs.readdir(pageDir);
	const prefixPath = pathRecord.join("/"); //用于递归读取时将父路径拼到前面
	const aliasPath = `@/pages${prefixPath}`;
	const routeArr: ParseFeRouteItem[] = [];
	const fetchExactMatch = pagesFolders.filter((p) => p.includes("fetch"));
	for (const pageFiles of pagesFolders) {
		const abFolder = join(pageDir, pageFiles);
		const isDirectory = (await fs.stat(abFolder)).isDirectory();
		if (isDirectory) {
			// 如果是文件夹则递归下去, 记录路径
			pathRecord.push(pageFiles);
			const childArr = await renderRoutes(
				abFolder,
				pathRecord,
				Object.assign({}, route),
			);
			pathRecord.pop(); // 回溯
			arr = arr.concat(childArr);
		} else {
			// 遍历一个文件夹下面的所有文件
			if (
				!pageFiles.includes("render") ||
				(!pageFiles.endsWith(".vue") &&
					!pageFiles.endsWith(".tsx") &&
					!pageFiles.endsWith(".ts") &&
					!pageFiles.endsWith(".js") &&
					!pageFiles.endsWith(".jsx"))
			) {
				continue;
			}
			// 拿到具体的文件
			if (pageFiles.includes("render$")) {
				/* /news/:id */
				route.path = `${prefixPath}/:${getDynamicParam(pageFiles)}`;
				route.component = `${aliasPath}/${pageFiles}`;
				let chunkName = pathRecord.join("-");
				if (chunkName.startsWith("-")) {
					chunkName = chunkName.replace("-", "");
				}
				route.chunkName = `${chunkName}-${getDynamicParam(pageFiles)
					.replace(/\/:\??/g, "-")
					.replace("?", "-optional")
					.replace("*", "-all")}`;
			} else if (pageFiles.includes("render")) {
				/* /news */
				route.path = `${prefixPath}`;
				route.component = `${aliasPath}/${pageFiles}`;
				let chunkName = pathRecord.join("-");
				if (chunkName.startsWith("-")) {
					chunkName = chunkName.replace("-", "");
				}
				route.chunkName = chunkName;
			}

			if (fetchExactMatch.length >= 2) {
				// fetch文件数量 >=2 启用完全匹配策略 render$id => fetch$id, render => fetch
				const fetchPageFiles = `${pageFiles.replace("render", "fetch").split(".")[0]}.ts`;
				if (fetchExactMatch.includes(fetchPageFiles)) {
					route.fetch = `${aliasPath}/${fetchPageFiles}`;
				}
			} else if (fetchExactMatch.includes("fetch.ts")) {
				// 单 fetch 文件的情况 所有类型的 render 都对应该 fetch
				route.fetch = `${aliasPath}/fetch.ts`;
			}
			route.name = route.chunkName;
			routeArr.push({ ...route });
		}
	}
	routeArr.forEach((r) => {
		if (r.path?.includes("index")) {
			// /index 映射为 /
			if (r.path.split("/").length >= 3) {
				r.path = r.path.replace("/index", "");
			} else {
				r.path = r.path.replace("index", "");
			}
		}

		r.path && arr.push(r);
	});

	return arr;
};

const writeRoutes = async (routes: string, name?: string) => {
	const cwd = getCwd();
	await fs.writeFile(
		resolve(cwd, `./build/${name ?? "ssr-declare-routes"}`),
		routes,
	);
};

const getDynamicParam = (url: string) => {
	return url
		.split("$")
		.filter((r) => r !== "render" && r !== "")
		.map((r) =>
			r
				.replace(/\.[\s\S]+/, "")
				.replace("#", "?")
				.replace("&", "*"),
		)
		.join("/:");
};

export { parseFeRoutes };
