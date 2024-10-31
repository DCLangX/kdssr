import { Module } from "@nestjs/common";
import { DetailModule } from "./modules/detail-page/detail.module.js";
import { indexModule } from "./modules/index-page/index.module.js";

@Module({
	imports: [DetailModule, indexModule],
})
export class AppModule {}
