import type { Request, Response } from "express";

export interface proxyOptions {
	express?: boolean;
}
export type ISSRContext<T = {}> = ISSRNestContext<T>;

export type ISSRNestContext<T = {}> = ExpressContext & T;

export interface ExpressContext {
	request: Request;
	response: Response;
}

export interface Vue3RenderRes {
	html: string;
	teleportsContext: {
		teleports?: Record<string, string> | undefined;
	};
}

export interface PipeableStream {
	abort: () => void;
	pipe: <Writable extends NodeJS.WritableStream>(
		destination: Writable,
	) => Writable;
}
