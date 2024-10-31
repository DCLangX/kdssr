import { Module } from "@nestjs/common";
import { ApiController } from "./api.controller.js";
import { DetailController } from "./detail.controller.js";
import { ApiDetailService } from "./detail.service.js";

@Module({
	imports: [],
	controllers: [DetailController, ApiController],
	providers: [ApiDetailService],
})
export class DetailModule {}
