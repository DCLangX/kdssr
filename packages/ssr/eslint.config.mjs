import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginPrettierRecommendedConfigs from "eslint-plugin-prettier/recommended";
import eslintPluginJsonc from "eslint-plugin-jsonc";
export default tseslint.config(
	{
		// config with just ignores is the replacement for `.eslintignore`
		ignores: ["**/build/**", "**/dist/**"],
	},

	// recommended eslint config
	eslint.configs.recommended,

	...tseslint.configs.recommended,

	// strict: a superset of recommended that includes more opinionated rules which may also catch bugs.
	// ...tseslint.configs.strict,

	// recommended Json config
	...eslintPluginJsonc.configs["flat/prettier"],

	// // stylistic: additional rules that enforce consistent styling without significantly catching bugs or changing logic.
	// ...tseslint.configs.stylistic,
	// Turns off all rules that are unnecessary or might conflict with Prettier.
	pluginPrettierRecommendedConfigs,
	{
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-expressions": "warn",
		},
	},
);
