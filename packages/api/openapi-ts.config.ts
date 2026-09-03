import { defineConfig } from "@hey-api/openapi-ts";

const input = process.env.ONLINEORNOT_OPENAPI_PATH;
if (!input) {
	throw new Error("ONLINEORNOT_OPENAPI_PATH must point to a verified schema");
}

export default defineConfig({
	input,
	output: {
		clean: true,
		path: "./src/generated",
	},
	plugins: ["@hey-api/typescript", "@hey-api/sdk", "@hey-api/client-fetch"],
});
