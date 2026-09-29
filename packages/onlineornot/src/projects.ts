import {
	createProject,
	deleteProject,
	getProject,
	listProjects,
	updateProject,
} from "./api/projects";
import { logger } from "./logger";
import type { CommonYargsArgv } from "./yargs-types";

function outputOptions(yargs: CommonYargsArgv) {
	return yargs.option("json", {
		describe: "Return output as JSON",
		type: "boolean",
		default: false,
	});
}

function idOptions(yargs: CommonYargsArgv) {
	return outputOptions(yargs).positional("id", {
		describe: "Encoded project ID (not its name)",
		type: "string",
		demandOption: true,
	});
}

export function projects(yargs: CommonYargsArgv) {
	return yargs
		.command(
			"list",
			"List projects (candidate API)",
			outputOptions,
			async (args) => {
				const result = await listProjects();
				if (args.json) logger.log(JSON.stringify(result, null, 2));
				else
					logger.table(
						result.map((item) => ({
							"Project ID": item.id,
							Name: item.name,
							Default: String(item.is_default),
						})),
					);
			},
		)
		.command("view <id>", "View a project", idOptions, async (args) => {
			const result = await getProject(args.id);
			if (args.json) logger.log(JSON.stringify(result, null, 2));
			else
				logger.table([
					{
						"Project ID": result.id,
						Name: result.name,
						Default: String(result.is_default),
						Created: result.created_at,
						Updated: result.updated_at,
					},
				]);
		})
		.command(
			"create <name>",
			"Create a project",
			(args) =>
				outputOptions(args).positional("name", {
					describe: "Project display name",
					type: "string",
					demandOption: true,
				}),
			async (args) => {
				const result = await createProject(args.name);
				logger.log(
					args.json
						? JSON.stringify(result, null, 2)
						: `Created project ${result.id}: ${result.name}`,
				);
			},
		)
		.command(
			"update <id>",
			"Rename a project",
			(args) =>
				idOptions(args).option("name", {
					describe: "New display name",
					type: "string",
					demandOption: true,
				}),
			async (args) => {
				const result = await updateProject(args.id, args.name);
				logger.log(
					args.json
						? JSON.stringify(result, null, 2)
						: `Updated project ${result.id}: ${result.name}`,
				);
			},
		)
		.command(
			"delete <id>",
			"Delete an empty non-Default project",
			idOptions,
			async (args) => {
				const result = await deleteProject(args.id);
				logger.log(
					args.json
						? JSON.stringify(result, null, 2)
						: `Deleted project ${result.id}`,
				);
			},
		);
}
