import { Argv } from "./types";
import { loadConfig } from "../utils";

export const handleEnv = async (argv: Argv) => {
	const { https, isDev } = loadConfig();
	process.env.BUILD_TOOL = "vite";
	process.env.OPTIMIZE = "0";
	if (argv.ssg) {
		process.env.SSG = "1";
	}
	if (isDev) {
		process.env.GENERATE_SOURCEMAP = "source-map";
	}
	if (argv.sourcemap) {
		if (argv.sourcemap.includes?.("source-map")) {
			process.env.GENERATE_SOURCEMAP = argv.sourcemap;
		} else if (!isDev) {
			process.env.GENERATE_SOURCEMAP = "source-map";
		}
	}
	if (argv.analyze) {
		process.env.GENERATE_ANALYSIS = "1";
	}
	if (argv.html) {
		process.env.SPA = "1";
	}
	if (argv.viteMode) {
		process.env.VITEMODE = argv.viteMode;
	}
	process.env.SERVER_PORT = argv.port ? String(argv.port) : "3000";
	if (!!https && isDev) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	}
};
