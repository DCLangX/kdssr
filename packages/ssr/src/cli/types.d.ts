import { type Arguments } from "yargs";

export interface SpinnerMessage {
	message: "start" | "stop";
}
export type Argv = Arguments<{
	noclean?: boolean;
	showArgs?: boolean;
	// analyze?: boolean;
	html?: boolean;
	port?: string | number;
	web?: boolean;
	api?: boolean;
	// ssg?: boolean;
	ssl?: boolean;
	// optimize?: boolean;
	// bc?: boolean;
	// bcp?: string;
	// sourcemap?: string;
	viteMode?: string;
}>;
