import type { UserConfig } from "kdssr";

const userConfig: UserConfig = {
	isVite: true,
	viteConfig() {
		return {
			server: {
				otherConfig: {
					build: {
						sourcemap: true,
					},
				},
			},
			client: {
				otherConfig: {
					build: {
						sourcemap: true,
					},
				},
			},
		};
	},
};

export { userConfig };
