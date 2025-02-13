import { type Arguments } from "yargs";

export interface SpinnerMessage {
	message: "start" | "stop";
}
export type Argv = Arguments<{
	test?: boolean;
	noclean?: boolean;
	showArgs?: boolean;
	analyze?: boolean;
	html?: boolean;
	port?: string | number;
	legacy?: boolean;
	react?: boolean;
	vue?: boolean;
	vue3?: boolean;
	web?: boolean;
	api?: boolean;
	ssg?: boolean;
	ssl?: boolean;
	optimize?: boolean;
	bc?: boolean;
	bcp?: string;
	sourcemap?: string;
	viteMode?: string;
}>;
