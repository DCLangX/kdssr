// export default ssrManifestPlugin;
import { parse } from "@babel/parser";
import traverseDefault from "@babel/traverse";
import type {
	OutputChunk,
	OutputBundle,
	OutputOptions,
	OutputAsset,
} from "rollup";

const traverse = traverseDefault.default;
interface ViteMetadata {
	importedCss: Set<string>;
	importedAssets: Set<string>;
	importedModules: Set<string>;
}

interface CustomOutputChunk extends OutputChunk {
	viteMetadata: ViteMetadata;
	imports: string[];
	isDynamicEntry: boolean;
	modules: Record<string, any>;
}
function routeAssetsPlugin(options = {}) {
	const {
		routeFile = "ssr-declare-routes.js",
		manifestFile = "assets-manifest.json",
		entryFile = "client-entry.ts", // 添加入口文件配置
	} = options;

	const routeAssets = new Map();
	let bundle: OutputBundle | undefined;
	let entryDeps = new Set(); // 存储入口文件的依赖

	// 收集chunks的依赖，会递归收集依赖的依赖，第一次传入的是路由的component或fetch组件的chunk
	function collectDependencies(
		chunk: OutputAsset | OutputChunk,
		seenChunks: Set<string> = new Set(),
		seenModules: Set<string> = new Set(),
	): Set<string> {
		if (!chunk || seenChunks.has(chunk.fileName)) return new Set();
		seenChunks.add(chunk.fileName);

		const assets = new Set([chunk.fileName]);

		// 收集组件CSS
		if (chunk.viteMetadata?.importedCss) {
			chunk.viteMetadata.importedCss.forEach((css) => assets.add(css));
		}

		// 收集组件静态导入的依赖
		if (chunk.imports) {
			chunk.imports.forEach((importFile) => {
				// 遍历后找到这个依赖的条目
				const importedChunk = Object.values(bundle).find(
					(c) => c.fileName === importFile,
				);

				if (importedChunk) {
					// 递归查找，将这个依赖的依赖收集进来
					const deps = collectDependencies(
						importedChunk,
						seenChunks,
						seenModules,
					);
					deps.forEach((dep) => assets.add(dep));
				}
			});
		}

		// 查找组件里打包进来的模块
		if (chunk.modules) {
			Object.keys(chunk.modules).forEach((moduleId) => {
				if (seenModules.has(moduleId)) return;
				seenModules.add(moduleId);

				// 查找所有同样打包进这个模块的 chunk
				Object.values(bundle).forEach((otherChunk) => {
					if (otherChunk.type === "chunk" && otherChunk.modules) {
						const hasModule = moduleId in otherChunk.modules;
						const isDynamicImport = otherChunk.isDynamicEntry;
						const isEntry = otherChunk.isEntry;

						if (
							(hasModule && (isDynamicImport || isEntry)) ||
							otherChunk.imports?.includes(moduleId)
						) {
							// 如果这个同样打包进这个模块的 chunk，是属于动态导入的或者就是入口文件，那么就再递归收集一下这个chunk的依赖
							const deps = collectDependencies(
								otherChunk,
								seenChunks,
								seenModules,
							);
							deps.forEach((dep) => assets.add(dep));
						}
					}
				});
			});
		}

		// 收集共享的依赖模块
		// if (chunk.viteMetadata?.importedModules) {
		// 	chunk.viteMetadata.importedModules.forEach((mod) => {
		// 		Object.values(bundle).forEach((otherChunk) => {
		// 			if (
		// 				otherChunk.type === "chunk" &&
		// 				otherChunk.modules &&
		// 				Object.keys(otherChunk.modules).includes(mod)
		// 			) {
		// 				const deps = collectDependencies(
		// 					otherChunk,
		// 					seenChunks,
		// 					seenModules,
		// 				);
		// 				deps.forEach((dep) => assets.add(dep));
		// 			}
		// 		});
		// 	});
		// }

		return assets;
	}

	// 添加收集入口文件依赖的函数
	function collectEntryDependencies(
		entryChunk,
		seenChunks = new Set(),
		seenModules = new Set(),
	) {
		if (!entryChunk) return new Set();

		const assets = new Set([entryChunk.fileName]);

		// 收集CSS
		if (entryChunk.viteMetadata?.importedCss) {
			entryChunk.viteMetadata.importedCss.forEach((css) =>
				assets.add(css),
			);
		}

		// 只收集静态导入的依赖，不包含动态导入
		if (entryChunk.imports) {
			entryChunk.imports.forEach((importFile) => {
				if (seenChunks.has(importFile)) return;
				seenChunks.add(importFile);

				const importedChunk = Object.values(bundle).find(
					(c) => c.fileName === importFile,
				);
				if (importedChunk && !importedChunk.isDynamicEntry) {
					const deps = collectEntryDependencies(
						importedChunk,
						seenChunks,
						seenModules,
					);
					deps.forEach((dep) => assets.add(dep));
				}
			});
		}

		// 收集直接依赖的模块
		if (entryChunk.modules) {
			Object.keys(entryChunk.modules).forEach((moduleId) => {
				if (seenModules.has(moduleId)) return;
				seenModules.add(moduleId);

				Object.values(bundle).forEach((chunk) => {
					if (
						chunk.type === "chunk" &&
						chunk.modules &&
						moduleId in chunk.modules &&
						!chunk.isDynamicEntry
					) {
						const deps = collectEntryDependencies(
							chunk,
							seenChunks,
							seenModules,
						);
						deps.forEach((dep) => assets.add(dep));
					}
				});
			});
		}

		return assets;
	}

	return {
		name: "route-assets",

		buildStart() {
			routeAssets.clear();
			entryDeps.clear();
		},

		async transform(code, id) {
			if (!id.endsWith(routeFile)) return null;

			console.log("Processing route file:", id);

			const ast = parse(code, {
				sourceType: "module",
				plugins: ["dynamicImport"],
			});

			const routes = [];

			traverse(ast, {
				ExportNamedDeclaration(path) {
					if (
						path.node.declaration?.declarations?.[0]?.id?.name ===
						"FeRoutes"
					) {
						const routesArray =
							path.node.declaration.declarations[0].init;
						if (routesArray.type === "ArrayExpression") {
							routesArray.elements.forEach((element) => {
								if (element.type === "ObjectExpression") {
									const routeInfo = {};

									element.properties.forEach((prop) => {
										const key =
											prop.key.value || prop.key.name;

										if (
											key === "chunkName" ||
											key === "name"
										) {
											routeInfo.name = prop.value.value;
										}

										// 处理组件和fetch导入
										if (
											key === "component" ||
											key === "fetch"
										) {
											try {
												const arrowFunc = prop.value;
												if (
													arrowFunc.body?.callee
														?.type === "Import"
												) {
													const importArgs =
														arrowFunc.body
															.arguments[0];
													if (
														importArgs.leadingComments
													) {
														const chunkTypeComment =
															importArgs.leadingComments.find(
																(comment) =>
																	comment.value.includes(
																		"chunkTypeName",
																	),
															);
														if (chunkTypeComment) {
															routeInfo[
																`${key}ChunkType`
															] =
																chunkTypeComment.value.match(
																	/chunkTypeName:\s*"([^"]+)"/,
																)?.[1];
														}
													}
													routeInfo[key] =
														importArgs.value;
													console.log(
														`Found ${key} import:`,
														routeInfo[key],
													);
												}
											} catch (err) {
												console.error(
													`Error parsing ${key}:`,
													err,
												);
											}
										}
									});

									if (
										routeInfo.name &&
										(routeInfo.component || routeInfo.fetch)
									) {
										routes.push(routeInfo);
									}
								}
							});
						}
					}
				},
			});
			console.log("Found routes:", routes);

			routes.forEach((route) => {
				routeAssets.set(route.name, {
					component: route.component,
					fetch: route.fetch,
					componentChunkType: route.componentChunkType,
					fetchChunkType: route.fetchChunkType,
					assets: new Set(),
				});
			});

			return null;
		},

		async generateBundle(options: OutputOptions, bundleInfo: OutputBundle) {
			bundle = bundleInfo;
			console.log("Processing chunks:", Object.keys(bundle).length);
			// 首先收集入口文件的依赖
			const entryChunk = Object.values(bundle).find(
				(chunk) =>
					chunk.type === "chunk" &&
					chunk.isEntry &&
					chunk.facadeModuleId?.endsWith(entryFile),
			);

			if (entryChunk) {
				console.log("Found entry chunk:", entryChunk.fileName);
				entryDeps = collectEntryDependencies(entryChunk);
				console.log("Entry dependencies:", Array.from(entryDeps));
			}

			// 收集路由依赖
			for (const [routeName, routeInfo] of routeAssets) {
				console.log(`\nCollecting dependencies for route ${routeName}`);
				const routeSpecificDeps = new Set(); // 存储路由特定的依赖

				// 分别收集组件和fetch的依赖
				for (const chunkId in bundle) {
					const chunk = bundle[chunkId];
					if (chunk.type !== "chunk") continue;

					const matchComponent = () => {
						if (!routeInfo.component) return false;
						const normalizedComponent = routeInfo.component.replace(
							"@/",
							"",
						);
						return (
							(routeInfo.componentChunkType &&
								(chunk.name === routeInfo.componentChunkType ||
									chunkId.includes(
										routeInfo.componentChunkType,
									))) ||
							(chunk.modules &&
								Object.keys(chunk.modules).some((mod) =>
									mod
										.replace(/\\/g, "/")
										.includes(normalizedComponent),
								))
						);
					};

					const matchFetch = () => {
						if (!routeInfo.fetch) return false;
						const normalizedFetch = routeInfo.fetch.replace(
							"@/",
							"",
						);
						return (
							(routeInfo.fetchChunkType &&
								(chunk.name === routeInfo.fetchChunkType ||
									chunkId.includes(
										routeInfo.fetchChunkType,
									))) ||
							(chunk.modules &&
								Object.keys(chunk.modules).some((mod) =>
									mod
										.replace(/\\/g, "/")
										.includes(normalizedFetch),
								))
						);
					};

					if (matchComponent() || matchFetch()) {
						console.log(`Found matching chunk: ${chunk.fileName}`);
						const deps = collectDependencies(
							chunk,
							new Set(),
							new Set(),
						);
						deps.forEach((dep) => routeSpecificDeps.add(dep));
					}
				}

				// 先添加入口依赖，再添加路由特定依赖
				routeInfo.assets = new Set([
					...Array.from(entryDeps), // 入口依赖放在前面
					...Array.from(routeSpecificDeps), // 路由特定依赖放在后面
				]);
			}

			// 生成最终的 manifest，保持依赖顺序
			const manifest = {};
			for (const [routeName, routeInfo] of routeAssets) {
				manifest[routeName] = Array.from(routeInfo.assets).map(
					(item) => "/" + item,
				);
				console.log(
					`\nRoute "${routeName}" dependencies:`,
					manifest[routeName],
				);
			}

			console.log("\nFinal manifest:", JSON.stringify(manifest, null, 2));

			this.emitFile({
				type: "asset",
				fileName: manifestFile,
				source: JSON.stringify(manifest, null, 2),
			});
		},
	};
}

export default routeAssetsPlugin;
