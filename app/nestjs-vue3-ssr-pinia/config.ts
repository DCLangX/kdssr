import type { UserConfig } from "kdssr";

const userConfig: UserConfig = {
	customeHeadScript: (ctx) => [
		{
			tagName: "script",
			inline: true,
			describe: {
				type: "text/javascript",
				src: "/web/utils/rem.ts",
			},
			content: "",
		},
	],
};

export { userConfig };
