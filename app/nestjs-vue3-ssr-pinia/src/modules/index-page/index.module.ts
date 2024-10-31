import { Module } from "@nestjs/common";
import { AppController } from "./index.controller.js";
import { ApiController } from "./api.controller.js";
import { ApiService } from "./index.service.js";

@Module({
	imports: [],
	controllers: [AppController, ApiController],
	providers: [ApiService],
})
export class indexModule {}
