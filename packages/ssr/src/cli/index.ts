#!/usr/bin/env node --experimental-specifier-resolution=node
// import { resolve } from "path";
// import { fork } from "child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Argv } from "./types";
import { logInfo, getDirname, transformConfig, logGreen } from "../utils";
import { handleEnv } from "./preprocess";
import { cleanOutDir } from "./clean";
import { parseFeRoutes } from "../router/fileRoutes";
import { spinnerProcess as spinner } from "./spinner";
// const __dirname = getDirname(import.meta.url);
// const spinnerProcess = fork(resolve(__dirname, "./spinner")); // 单独创建子进程跑 spinner 否则会被后续的 同步代码 block 导致 loading 暂停""“”"（）()
import { clientPlugin } from "../plugin-vue3/index";
import { serverPlugin } from "../plugin-nest/index";
// const spinner = {
// 	start: () =>
// 		spinnerProcess.send({
// 			message: "start",
// 		}),
// 	stop: () =>
// 		spinnerProcess.send({
// 			message: "stop",
// 		}),
// };
const cliDesc = {
	web: {
		desc: "only start client plugin",
	},
	api: {
		desc: "only start server plugin",
	},
};
console.log(
	"%c Line:58 🍐 process.argv",
	"color:#fff;background:#4fff4B",
	process.argv,
);
const startFunc = async (argv: Argv) => {
	spinner.start();
	await cleanOutDir(argv);
	process.env.NODE_ENV = "development";
	// const { parseFeRoutes, transformConfig, logInfo } = await import(
	// 	"ssr-common-utils"
	// );
	await transformConfig();
	// if (argv.vite) {
	logInfo("Vite 场景本地开发样式闪烁为正常现象请忽略，生产环境无此问题");
	// }
	// const watcher = await createWatcher();
	await handleEnv(argv);
	await parseFeRoutes();
	await startOrBuild(argv, "start");
	spinner.finish();
	// await onWatcher(watcher);
};
const buildFunc = async (argv: Argv) => {
	spinner.start();
	await cleanOutDir(argv);
	process.env.NODE_ENV = "production";
	await transformConfig();
	await handleEnv(argv);
	await parseFeRoutes();
	await startOrBuild(argv, "build");
	spinner.finish();
};
const startOrBuild = async (argv: Argv, type: "start" | "build") => {
	if (argv.ssg) {
		logGreen("Using ssg for generate static html file");
	}
	if (!argv.api) {
		const client = clientPlugin();
		await client?.[type]?.().catch((err) => {
			console.log(
				"%c Line:68 🌽 err",
				"color:#fff;background:#465975",
				err,
			);
		});
	}
	if (!argv.web) {
		const server = serverPlugin();
		await server?.[type]?.(argv).catch((err) => {
			console.log(
				"%c Line:68 🌽 err",
				"color:#fff;background:#465975",
				err,
			);
		});
	}
	if (type === "build") {
		// await generateHtml();
		// await ssg(argv);
	}
};
yargs(hideBin(process.argv))
	.command(
		"start",
		"Start Server",
		(yargs) =>
			yargs.options({
				bundleConfig: {
					type: "boolean",
					alias: "bc",
					desc: "bundle config.ts dependencies module by esbuild",
				},
				bundleConfigPlatform: {
					type: "boolean",
					alias: "bcp",
					desc: "esbuild bundle platform",
				},
				vite: {
					desc: "Start application by vite",
				},
				viteMode: {
					desc: "same like vite start --mode",
				},
				port: {
					type: "string",
					desc: "Setting application server port, default is 3000",
				},
				nominify: {
					type: "boolean",
					desc: "Disable minify output file content for debug",
				},
				...cliDesc,
			}),
		async (argv: Argv) => {
			console.log(
				"%c Line:95 🍅 argv",
				"color:#fff;background:#ed9ec7",
				argv,
			);
			if (argv.bc) {
				process.env.BUNDLECONFIG = "1";
			}
			if (argv.bcp) {
				process.env.BUNDLECONFIGPLATFORM = argv.bcp;
			}
			await startFunc(argv);
		},
	)
	.command(
		"build",
		"Build application by webpack or vite",
		(yargs) =>
			yargs.options({
				bundleConfig: {
					alias: "bc",
					desc: "bundle config.ts dependencies module by esbuild",
				},
				bundleConfigPlatform: {
					alias: "bcp",
					desc: "esbuild bundle platform",
				},
				vite: {
					desc: "Build application by vite",
				},
				viteMode: {
					desc: "same like vite build --mode",
				},
				legacy: {
					desc: "Close default rollup manulChunks setting in vite mode",
				},
				html: {
					desc: "Build application as a single html",
				},
				ssg: {
					desc: "Build with Static Site Generation (Pre Render)",
				},
				sourcemap: {
					desc: "Set type of generate sourcemap by build --sourcemap xxx",
				},
				nominify: {
					desc: "Disable minify output file content for debug",
				},
				...cliDesc,
			}),
		async (argv: Argv) => {
			// const { logWarning } = await import("ssr-common-utils");
			// if (argv.vite) {
			// 	logWarning(`ssr build by vite is beta now, if you find some bugs, please submit an issue on https://github.com/zhangyuang/ssr/issues or you can use ssr build --vite --legacy which will close manualChunks
			// to get a stable bundle result but maybe some performance loss
			// `);
			// }
			if (argv.bc) {
				process.env.BUNDLECONFIG = "1";
			}
			if (argv.bcp) {
				process.env.BUNDLECONFIGPLATFORM = argv.bcp;
			}
			await buildFunc(argv);
		},
	)
	.command(
		"deploy",
		"Deploy function to aliyun cloud or tencent cloud",
		(yargs) =>
			yargs.options({
				tencent: {
					desc: "deploy application to tencent clound",
				},
			}),
		async (argv: Argv) => {
			// await deployFunc(argv);
		},
	)
	.command(
		"update",
		"check dependencies version is latest",
		{},
		async (argv: Argv) => {
			spinner.start();
			// const { update } = await import("./update");
			// await update();
			spinner.stop();
		},
	)
	.demandCommand(1, "You need at least one command before moving on")
	.version()
	.alias("h", "help")
	.alias("v", "version")
	.fail((msg, err) => {
		if (err) {
			console.log(err);
			spinner.stop();
			process.exit(1);
		}
		console.log(msg);
	})
	.parse();
