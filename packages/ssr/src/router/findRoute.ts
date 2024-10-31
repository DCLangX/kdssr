// @ts-nocheck
import { pathToRegexp } from "path-to-regexp";

const cache = {};
const cacheLimit = 10000;
let cacheCount = 0;

function compilePath(path, options) {
	console.log("%c Line:9 🍔 path", "color:#fff;background:#4fff4B", path);
	const cacheKey = `${options.end}${options.strict}${options.sensitive}`;
	const pathCache = cache[cacheKey] || (cache[cacheKey] = {});

	if (pathCache[path]) return pathCache[path];

	const keys = [];
	const result = pathToRegexp(path, keys, options);
	// const result = { regexp, keys };

	if (cacheCount < cacheLimit) {
		pathCache[path] = result;
		cacheCount++;
	}

	return result;
}

function matchPath(pathname, options = {}) {
	if (typeof options === "string" || Array.isArray(options)) {
		options = { path: options };
	}

	const {
		path,
		exact = false,
		strict = false,
		sensitive = false,
		childPath,
	} = options;

	const paths = [].concat(childPath || path);

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
			path, // the path used to match
			url: path === "/" && url === "" ? "/" : url, // the matched portion of the URL
			isExact, // whether or not we matched exactly
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
