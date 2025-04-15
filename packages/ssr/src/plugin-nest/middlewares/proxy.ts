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
		const { createServer } = await import("vite");
		// 开发模式下这里的vite服务器仅用作静态文件的构建和托管，首屏渲染内容实际是由后续viteRender那里的另一个的vite服务器生成的
		const viteServer = await createServer({
			server: { middlewareMode: true },
			appType: "custom",
			define: {
				__isBrowser__: true,
			},
		});
		proxyMiddlewaresArr.push(viteServer.middlewares);
	}

	return proxyMiddlewaresArr;
};

export { getDevProxyMiddlewaresArr };
