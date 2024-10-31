import { getCwd, getFeDir, accessFile } from "../utils";
import { resolve } from "path";
import { promises } from "fs";
// 处理手动路由
export const transformManualRoutes = async () => {
	const cwd = getCwd();
	const declaretiveRoutes = await accessFile(
		resolve(getFeDir(), "./route.ts"),
	); // 是否存在自定义路由
	if (!declaretiveRoutes) {
		await promises.writeFile(
			resolve(cwd, "./build/ssr-manual-routes.js"),
			"",
		);
		return;
	}
	const { transform } = await import("esbuild");
	const fileContent = (
		await promises.readFile(resolve(getFeDir(), "./route.ts"))
	).toString();
	const { code } = await transform(fileContent, {
		loader: "ts",
		format: "esm",
		keepNames: true,
	});
	const serializeCode = code.replace(/(import\([\s\S]*?\))/g, (match) => {
		return match.replace(/\s/g, "");
	});
	await promises.writeFile(
		resolve(cwd, "./build/ssr-manual-routes.js"),
		serializeCode,
	);
};
