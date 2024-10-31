import { accessSync, promises } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "./config";
import { normalizeEndPath } from "./normalize";

export const accessFile = async (file: string) => {
	const result = await promises
		.access(file)
		.then(() => true)
		.catch(() => false);
	return result;
};

export const accessFileSync = (file: string) => {
	let res = true;
	try {
		accessSync(file);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (error) {
		res = false;
	}
	return res;
};

export const getCwd = () => {
	return resolve(process.cwd(), process.env.APP_ROOT ?? "");
};

export const getFeDir = () => {
	return resolve(getCwd(), process.env.FE_ROOT ?? "web");
};

export function getDirname(url: string) {
	// 获取当前文件的绝对路径，url为import.meta.url，需要动态传入
	const __filename = fileURLToPath(url);
	const __dirname = dirname(__filename);
	return __dirname;
}

export const getPagesDir = () => {
	return resolve(getFeDir(), "pages");
};

export const getOutputPublicPath = () => {
	// return /client/
	const { publicPath, isDev } = loadConfig();
	const path = normalizeEndPath(publicPath);
	return isDev ? path : `${path}client/`;
};

export const getImageOutputPath = () => {
	const { publicPath, isDev, assetsDir } = loadConfig();
	const imagePath = `${assetsDir}/images`;
	const normalizePath = normalizeEndPath(publicPath);
	return {
		publicPath: isDev
			? `${normalizePath}${imagePath}`
			: `${normalizePath}client/${imagePath}`,
		imagePath,
	};
};
