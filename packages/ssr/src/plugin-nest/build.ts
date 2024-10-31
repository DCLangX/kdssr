import { resolve } from "path";
import shell from "shelljs";
import type { Argv } from "../cli/types";
import { getCwd, getNormalizeArgv } from "../utils";
const { exec } = shell;

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
		const cwd = getCwd();
		// spinner.start();
		// argv.b = argv.b || "swc";
		const normalizeArgv = getNormalizeArgv(argv, {
			singleDash,
			doubleDash,
		});

		const { stdout, stderr } = exec(
			`${resolve(cwd, "./node_modules/.bin/nest")} build  ${normalizeArgv}`,
			{
				async: true,
				silent: true,
				env: { ...process.env, FORCE_COLOR: "1" },
			},
		);
		stdout?.on("data", function (data) {
			console.log(data);
		});
		stdout?.on("end", () => {
			// spinner.stop();
			resol();
		});
		stderr?.on("data", function (data) {
			if (!data.includes("has been deprecated")) {
				console.error(`error: ${data}`);
			}
			// spinner.stop();
		});
	});

export { build };
