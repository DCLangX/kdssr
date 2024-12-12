// @ts-nocheck
import { pathToRegexp } from "path-to-regexp";

const cache = {};
const cacheLimit = 10000;
let cacheCount = 0;

/**
 * @description: 将一个路径字符串转换成正则表达式对象
 * @param {*} path
 * @param {*} options
 * @return {*}
 */
function compilePath(path, options) {
	const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
	const pathCache = cache[cacheKey] || (cache[cacheKey] = {});

	if (pathCache[path]) return pathCache[path];

	const keys = [];
	const result = pathToRegexp(path, keys, options);
	// pathToRegexp 函数会将路径中的参数（如 :id）转换为正则表达式，并提取参数名存储在 keys 数组中
	// const [regexp, keys] = result;
	// console.log(regexp); // path = '/user/:id'，输出: /user(?:\/([^\/]+?))
	// console.log(keys);   // path = '/user/:id'，输出: [{ name: 'id', prefix: '/', delimiter: '/', optional: false, repeat: false }]

	if (cacheCount < cacheLimit) {
		pathCache[path] = result;
		cacheCount++;
	}

	return result;
}

/**
 * @description: 检测路径匹配的函数
 * @param {*} pathname 要匹配的路径字符串，例如 "/about"
 * @param {*} options 前端路由条目对象，如果是一个字符串或字符串数组，此时会被转换成 { path: options } 的形式
 * @return {Object} 返回一个对象，包含匹配结果的相关信息
 */
function matchPath(pathname, options = {}) {
	if (typeof options === "string" || Array.isArray(options)) {
		options = { path: options };
	}

	const {
		path, // 目前仅有path被用到，其余均为无效参数
		exact = false, //表示是否需要精确匹配整个路径
		strict = false, //表示是否在路径末尾需要严格匹配
		sensitive = false,
		childPath,
	} = options;

	const paths = [].concat(childPath || path);
	// 所有文件路由在前面已经被处理成顶层对象，使用完整路径的path，所以原则上只有手动写的才会有childPath
	return paths.reduce((matched, path) => {
		if (!path && path !== "") return null;
		if (matched) return matched;

		const { regexp, keys } = compilePath(path, {
			end: exact,
			strict,
			sensitive,
		});

		const match = regexp.exec(pathname);

		if (!match) return null;

		const [url, ...values] = match;
		const isExact = pathname === url;

		if (exact && !isExact) return null;

		return {
			path, // 用于匹配的路径
			url: path === "/" && url === "" ? "/" : url, // URL的匹配部分
			isExact, // 是否完全匹配
			params: keys.reduce((memo, key, index) => {
				memo[key.name] = values[index];
				return memo;
			}, {}),
		};
	}, null);
}

function findRoute<
	T extends { path: string; childPath?: string; children?: [] },
>(Routes: T[], path: string): T {
	// 根据请求的path来匹配到对应的Component
	const p = path.includes("?") ? path.split("?")[0] : path;
	// 取出path问号前的字符串
	const route = Routes.find((route) => {
		return route.children
			? findRoute(route.children, p)
			: matchPath(p, route)?.isExact;
	});
	return route ?? {};
}

const checkRoute = ({
	routeItem,
	path,
}: {
	routeItem?: { path: string };
	path: string;
}) => {
	if (!routeItem?.path) {
		throw new Error(`
      With Path: ${path} search component failed
      If you create new folder or component file, please restart server by npm start
      `);
	}
};

export { findRoute, checkRoute };
