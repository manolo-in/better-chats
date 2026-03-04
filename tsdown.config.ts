import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: {
			sourcemap: false,
		},
	},
	{
		entry: ["src/type.ts"],
		dts: {
			sourcemap: false,
		},
	},
	{
		entry: ["src/storage/index.ts"],
		format: ["cjs", "esm"],
		dts: {
			sourcemap: false,
		},
	},
	{
		entry: ["src/client/index.ts"],
		format: ["cjs", "esm"],
		dts: {
			sourcemap: false,
		},
	},
]);
