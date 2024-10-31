import { Argv } from "../cli/types";
import { sep } from "node:path";

export const normalizePath = (path: string, prefix: string) => {
	// 移除 prefix 保证 path 跟路由表能够正确匹配
	const res = normalizeStartPath(path.replace(prefix, ""));
	return res;
};

export const normalizeStartPath = (path: string) => {
	if (path.startsWith("//")) {
		path = path.replace("//", "/");
	}
	if (!path.startsWith("/")) {
		path = `/${path}`;
	}
	return path;
};
export const normalizeEndPath = (path: string) => {
	if (!path.endsWith("/")) {
		path = `${path}/`;
	}
	return path;
};

export const getNormalizeArgv = (
	argv: Argv,
	options: {
		singleDash?: string[];
		doubleDash?: string[];
	},
) => {
	const { singleDash, doubleDash } = options;
	let normalizeArgv = "";
	for (const key in argv) {
		const val = argv[key];
		if (singleDash?.includes(key)) {
			normalizeArgv += `-${key} ${typeof val === "boolean" ? "" : val}`;
		} else if (doubleDash?.includes(key)) {
			normalizeArgv += `--${key} ${typeof val === "boolean" ? "" : val}`;
		}
		normalizeArgv += " ";
	}
	if (argv.showArgs) {
		console.log(normalizeArgv);
	}
	return normalizeArgv;
};

export const normalizePosixPath = (value: string): string => {
	return sep === "\\" ? value.replace(/\\/g, "/") : value;
};
