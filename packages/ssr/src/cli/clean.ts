import { pathToFileURL } from "url";
import { resolve } from "path";
import { promises } from "fs";
import type { Argv } from "./types";
import { accessFile, getCwd } from "../utils";

export const cleanOutDir = async (argv: Argv) => {
	const cwd = getCwd();
	const staticConfigPath = resolve(cwd, "./build/staticConfig.js");
	if (!(await accessFile(resolve(cwd, "./build")))) {
		await promises.mkdir(resolve(cwd, "./build"));
	}
	const buildDir = await promises.readdir(resolve(cwd, "./build"));
	if (argv.noclean) return;
	for (const f of buildDir) {
		const fpath = resolve(cwd, `./build/${f}`);
		if (fpath !== staticConfigPath) {
			await promises.rm(fpath, { recursive: true, force: true });
		}
	}
	// clean dist folder
	const tsconfigExist = await accessFile(resolve(cwd, "./tsconfig.json"));
	if (tsconfigExist && process.env.CLEAN !== "false") {
		try {
			const tsconfig = await import(
				pathToFileURL(resolve(cwd, "./tsconfig.json")).href,
				{ with: { type: "json" } }
			);
			const outDir = tsconfig.default.compilerOptions.outDir;
			await promises.rm(resolve(cwd, outDir), {
				recursive: true,
				force: true,
			});
		} catch (error) {
			// 有可能 json 文件存在注释导致 require 失败，这里 catch 一下
			console.log("检测到当前目录 tsconfig.json 文件可能存在语法错误");
		}
	}
};
