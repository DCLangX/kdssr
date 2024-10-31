import { viteStart, viteBuild } from "./vite";
export function clientPlugin() {
	return {
		name: "plugin-vue3",
		start: async () => {
			await viteStart();
		},
		build: async () => {
			await viteBuild();
		},
	};
}

export * from "./vite";
