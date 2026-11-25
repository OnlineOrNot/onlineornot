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

const isResourceId = (name: string): boolean =>
	(name === "id" || name === "ids" || /_ids?$/.test(name)) &&
	!["trace_id", "span_id", "parent_span_id"].includes(name);

const removeResourceIdConstraints = (
	schema: Schema,
	resourceId = false,
): void => {
	if (
		resourceId &&
		(schema.type === "string" ||
			(Array.isArray(schema.type) && schema.type.includes("string")))
	) {
		delete schema.minLength;
		delete schema.maxLength;
		delete schema.pattern;
		delete schema.format;
	}
	for (const [name, property] of Object.entries(schema.properties ?? {})) {
		if (property !== true && !("$ref" in property))
			removeResourceIdConstraints(property, isResourceId(name));
	}
	for (const child of [
		...(schema.allOf ?? []),
		...(schema.anyOf ?? []),
		...(schema.oneOf ?? []),
	]) {
		if (!("$ref" in child)) removeResourceIdConstraints(child, resourceId);
	}
	if (schema.items && !Array.isArray(schema.items) && !("$ref" in schema.items))
		removeResourceIdConstraints(schema.items, resourceId);
};

type Property = NonNullable<Schema["properties"]>[string];

const isForbidden = (property: Property): boolean => {
	if (property === true || "$ref" in property) return false;
	const not = property.not;
	return not !== undefined && !("$ref" in not) && Object.keys(not).length === 0;
};

// The API reserves unreleased request fields with `not: {}`. The generator
// would otherwise emit them as optional unknown inputs, so remove them.
const removeForbiddenProperties = (schema: Schema): void => {
	for (const [name, property] of Object.entries(schema.properties ?? {})) {
		if (isForbidden(property)) {
			delete schema.properties?.[name];
			schema.required = schema.required?.filter((key) => key !== name);
		} else if (property !== true && !("$ref" in property)) {
			removeForbiddenProperties(property);
		}
	}
	for (const child of [
		...(schema.allOf ?? []),
		...(schema.anyOf ?? []),
		...(schema.oneOf ?? []),
	]) {
		if (!("$ref" in child)) removeForbiddenProperties(child);
	}
	if (schema.items && !Array.isArray(schema.items) && !("$ref" in schema.items))
		removeForbiddenProperties(schema.items);
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
				if (!("$ref" in schema)) {
					removeRequiredPropertyDefaults(schema);
					removeResourceIdConstraints(schema);
					removeForbiddenProperties(schema);
				}
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
					for (const parameter of [
						...(pathItem.parameters ?? []),
						...(operation.parameters ?? []),
					]) {
						if ("$ref" in parameter || !isResourceId(parameter.name)) continue;
						const schema = parameter.schema;
						if (schema && schema !== true && !("$ref" in schema))
							removeResourceIdConstraints(schema, true);
					}
					const requestBody = operation.requestBody;
					if (requestBody && !("$ref" in requestBody))
						for (const mediaTypeName of Object.keys(
							requestBody.content ?? {},
						)) {
							const schema = requestBody.content?.[mediaTypeName]?.schema;
							if (schema && schema !== true && !("$ref" in schema)) {
								removeResourceIdConstraints(schema);
								removeForbiddenProperties(schema);
							}
						}
					for (const statusCode of Object.keys(operation.responses ?? {})) {
						const response = operation.responses?.[statusCode];
						if (!response || "$ref" in response) continue;
						for (const mediaTypeName of Object.keys(response.content ?? {})) {
							const schema = response.content?.[mediaTypeName]?.schema;
							if (schema && schema !== true && !("$ref" in schema)) {
								removeRequiredPropertyDefaults(schema);
								removeResourceIdConstraints(schema);
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
			// OpenAPI date-time is RFC 3339, which allows numeric offsets as well as Z.
			dates: { offset: true },
			includeInEntry: false,
		},
		{
			name: "valibot",
			includeInEntry: false,
			$resolvers: {
				object: (ctx) => {
					const additionalProperties = ctx.schema.additionalProperties;
					if (!additionalProperties || additionalProperties.type === "never")
						return;
					const value = ctx.walk(additionalProperties, ctx);
					ctx._childResults.push(value);
					const validator = ctx.pipes.toNode(
						ctx.applyModifiers(value).pipes,
						ctx.plugin,
					);
					const properties = ctx.nodes.shape(ctx);
					const object = properties.isEmpty
						? ctx
								.$(ctx.plugin.imports.v)
								.attr("record")
								.call(
									ctx.$(ctx.plugin.imports.v).attr("string").call(),
									validator,
								)
						: ctx
								.$(ctx.plugin.imports.v)
								.attr("objectWithRest")
								.call(properties, validator);
					return ctx
						.$(ctx.plugin.imports.v)
						.attr("pipe")
						.call(
							ctx
								.$(ctx.plugin.imports.v)
								.attr("custom")
								.call(
									ctx.$.func()
										.param("value")
										.do(
											ctx.$.return(
												ctx.$.not(
													ctx.$("Array").attr("isArray").call(ctx.$("value")),
												),
											),
										),
								),
							object,
						);
				},
				array: (ctx) => {
					if (!ctx.schema.items || ctx.schema.items.length < 2) return;
					const element = ctx.walk(
						{
							items: ctx.schema.items,
							logicalOperator: ctx.schema.logicalOperator ?? "or",
						},
						ctx,
					);
					ctx.pipes.push(
						ctx.pipes.current,
						ctx
							.$(ctx.plugin.imports.v)
							.attr("array")
							.call(
								ctx.pipes.toNode(ctx.applyModifiers(element).pipes, ctx.plugin),
							),
					);
					const length = ctx.nodes.length(ctx);
					if (length) ctx.pipes.push(ctx.pipes.current, length);
					else {
						ctx.pipes.push(ctx.pipes.current, ctx.nodes.minLength(ctx));
						ctx.pipes.push(ctx.pipes.current, ctx.nodes.maxLength(ctx));
					}
					return ctx.pipes.current;
				},
			},
		},
	],
});
