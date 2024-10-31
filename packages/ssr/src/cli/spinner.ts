import ora from "ora";
import { SpinnerMessage } from "./types";

const spinner = ora("Starting\n");

process.on("message", (data: SpinnerMessage) => {
	const { message } = data;
	if (message === "start") {
		spinner.start();
	} else {
		spinner.stop();
		process.exit();
	}
});

export const spinnerProcess = {
	start: () => {
		spinner.start();
	},
	finish: () => {
		spinner.succeed("Success");
	},
	stop: () => {
		spinner.stop();
	},
};
