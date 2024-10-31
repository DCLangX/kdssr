import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Readable } from "stream";
import { render } from "kdssr";

import { ApiDetailService } from "./detail.service.js";

@Controller("/")
export class DetailController {
	constructor(private readonly apiDeatilservice: ApiDetailService) {}

	@Get("/detail/:id")
	async handlerDetail(
		@Req() req: Request,
		@Res() res: Response,
	): Promise<any> {
		try {
			const ctx = {
				request: req,
				response: res,
				apiDeatilservice: this.apiDeatilservice,
			};
			const stream = await render<Readable>(ctx, {
				stream: true,
			});
			stream.pipe(res, { end: false });
			stream.on("end", () => {
				res.end();
			});
		} catch (error) {
			console.log(error);
			res.status(500).send(error);
		}
	}
}
