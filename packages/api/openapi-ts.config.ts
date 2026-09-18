import {
	defineConfig,
	type OpenApi,
	type OpenApiSchemaObject,
} from "@hey-api/openapi-ts";

const input = process.env.ONLINEORNOT_OPENAPI_PATH;
if (!input) {
	throw new Error("ONLINEORNOT_OPENAPI_PATH must point to a verified schema");
}

type Schema = OpenApiSchemaObject.V3_0_X | OpenApiSchemaObject.V3_1_X;

const isOpenApi31 = (
	spec: OpenApi.V3_0_X | OpenApi.V3_1_X,
): spec is OpenApi.V3_1_X => spec.openapi.startsWith("3.1");

const removeRequiredPropertyDefaults = (schema: Schema): void => {
	if (!schema.required || !schema.properties) return;
	for (const propertyName of schema.required) {
		const property = schema.properties[propertyName];
		// Validator defaults make inputs optional, even when OpenAPI marks them required.
		if (property && property !== true && !("$ref" in property)) {
			delete property.default;
		}
	}
};

export default defineConfig({
	input,
	parser: {
		patch: (spec) => {
			if ("swagger" in spec) return;
			if (!isOpenApi31(spec)) {
				throw new Error("The pinned schema must use OpenAPI 3.1");
			}

			for (const schema of Object.values(spec.components?.schemas ?? {})) {
				if (!("$ref" in schema)) removeRequiredPropertyDefaults(schema);
			}

			for (const pathItem of Object.values(spec.paths ?? {})) {
				if (!pathItem || "$ref" in pathItem) continue;
				const operations = [
					pathItem.get,
					pathItem.put,
					pathItem.post,
					pathItem.delete,
					pathItem.options,
					pathItem.head,
					pathItem.patch,
					pathItem.trace,
				];
				for (const operation of operations) {
					if (!operation) continue;
					for (const statusCode of Object.keys(operation.responses ?? {})) {
						const response = operation.responses?.[statusCode];
						if (!response || "$ref" in response) continue;
						for (const mediaTypeName of Object.keys(response.content ?? {})) {
							const schema = response.content?.[mediaTypeName]?.schema;
							if (schema && schema !== true && !("$ref" in schema)) {
								removeRequiredPropertyDefaults(schema);
							}
						}
					}
				}
			}
		},
	},
	output: {
		clean: true,
		path: "./src/generated",
	},
	plugins: [
		"@hey-api/typescript",
		"@hey-api/sdk",
		"@hey-api/client-fetch",
		{
			name: "zod",
			compatibilityVersion: 4,
			includeInEntry: false,
		},
		{
			name: "valibot",
			includeInEntry: false,
		},
	],
});
