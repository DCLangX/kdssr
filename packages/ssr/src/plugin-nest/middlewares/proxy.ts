// import { createProxyMiddleware } from "http-proxy-middleware";
import { loadConfig } from "../../utils";
// import { createServer } from "vite";
const getDevProxyMiddlewaresArr = async () => {
	const { proxy, isDev } = loadConfig();
	const proxyMiddlewaresArr: any[] = [];

	// function registerProxy(proxy: any) {
	// 	for (const path in proxy) {
	// 		const options = proxy[path];
	// 		const middleware = createProxyMiddleware(path, options);
	// 		proxyMiddlewaresArr.push(middleware);
	// 	}
	// }
	// proxy && registerProxy(proxy);

	if (isDev) {
		// 本地开发请求走 vite 接管 前端文件夹请求
		const { createServer } = await import("vite");

		const viteServer = await createServer({
			server: { middlewareMode: true },
			appType: "custom",
		});
		proxyMiddlewaresArr.push(viteServer.middlewares);
	}

	return proxyMiddlewaresArr;
};

export { getDevProxyMiddlewaresArr };
