// import { resolve } from "path";
import { spawn } from "child_process";
// import shell from "shelljs";
import type { Argv } from "../cli/types";
import { getCwd, getNormalizeArgv } from "../utils";
// const { exec } = shell;

// const spinner = require("ora")("Building");
const singleDash = ["c", "p", "w", "h", "b"];
const doubleDash = [
	"config",
	"path",
	"watch",
	"watchAssets",
	"webpack",
	"webpackPath",
	"tsc",
	"help",
	"builder",
];
const build = async (argv: Argv) =>
	new Promise<void>((resol, reject) => {
		// const cwd = getCwd();
		// spinner.start();
		// argv.b = argv.b || "swc";
		const normalizeArgv = getNormalizeArgv(argv, {
			singleDash,
			doubleDash,
		});

		// const { stdout, stderr } = exec(
		// 	`${resolve(cwd, "./node_modules/.bin/nest")} build  ${normalizeArgv}`,
		// 	{
		// 		async: true,
		// 		silent: true,
		// 		env: { ...process.env, FORCE_COLOR: "1" },
		// 	},
		// );
		// stdout?.on("data", function (data) {
		// 	console.log(data);
		// });
		// stdout?.on("end", () => {
		// 	// spinner.stop();
		// 	resol();
		// });
		// stderr?.on("data", function (data) {
		// 	if (!data.includes("has been deprecated")) {
		// 		console.error(`error: ${data}`);
		// 	}
		// 	// spinner.stop();
		// });
		const nestProcess = spawn("pnpm", ["nest", "build", normalizeArgv], {
			env: { ...process.env, FORCE_COLOR: "1" },
		});
		nestProcess.stdout.on("data", (data) => {
			const message = data.toString();
			console.log(message);
		});

		nestProcess.stderr.on("data", (data) => {
			const message = data.toString();
			if (
				message.includes("DeprecationWarning") ||
				message.includes("has been deprecated") ||
				message.includes(
					"reflect-metadata doesn't appear to be written in CJS",
				) ||
				message.includes("Successfully compiled")
			) {
				console.log(message);
			} else {
				console.error(`error: ${message}`);
			}
		});

		nestProcess.on("close", () => {
			resol();
		});
	});

export { build };
