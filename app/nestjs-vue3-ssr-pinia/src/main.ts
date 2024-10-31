import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { initialSSRDevProxy, loadConfig, getCwd } from "kdssr";

import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	await initialSSRDevProxy(app, {
		express: true,
	});
	app.useStaticAssets(join(getCwd(), "./build"));
	app.useStaticAssets(join(getCwd(), "./build/client"));
	app.useStaticAssets(join(getCwd(), "./public"));
	const { serverPort } = loadConfig();
	await app.listen(serverPort);
}

bootstrap().catch((err) => {
	console.log("%c Line:21 🍊 err", "color:#fff;background:#2eafb0", err);
	process.exit(1);
});
