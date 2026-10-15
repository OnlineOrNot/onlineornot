import type { Project } from "@onlineornot/api";

import {
	createProject,
	deleteProject,
	getProject,
	listProjects,
	updateProject,
} from "../api/projects";
import { logger } from "../logger";
import type { CommonYargsArgv } from "../yargs-types";

function output(
	result: Project | Pick<Project, "id"> | Project[],
	json: boolean,
) {
	if (json) logger.log(JSON.stringify(result, null, 2));
	else {
		const rows = Array.isArray(result) ? result : [result];
		logger.table(
			rows.map((project) => ({
				ID: project.id,
				Name: "name" in project ? project.name : "-",
				Default: "is_default" in project ? String(project.is_default) : "-",
			})),
		);
	}
}
function jsonOptions(yargs: CommonYargsArgv) {
	return yargs.option("json", {
		describe: "Return output as JSON",
		type: "boolean",
		default: false,
	});
}
function identityOptions(yargs: CommonYargsArgv) {
	return jsonOptions(yargs).positional("id", {
		describe: "Encoded project ID, not its name",
		type: "string",
		demandOption: true,
	});
}
export function projects(yargs: CommonYargsArgv) {
	return yargs
		.command("list", "List all projects", jsonOptions, async (args) =>
			output(await listProjects(), args.json),
		)
		.command(
			"create <name>",
			"Create a project",
			(args) =>
				jsonOptions(args).positional("name", {
					type: "string",
					demandOption: true,
				}),
			async (args) => output(await createProject(args.name), args.json),
		)
		.command("view <id>", "View a project", identityOptions, async (args) =>
			output(await getProject(args.id), args.json),
		)
		.command(
			"update <id>",
			"Rename a project",
			(args) =>
				identityOptions(args).option("name", {
					type: "string",
					demandOption: true,
					describe: "New display name",
				}),
			async (args) =>
				output(await updateProject(args.id, args.name), args.json),
		)
		.command(
			"delete <id>",
			"Delete an empty non-Default project",
			identityOptions,
			async (args) => output(await deleteProject(args.id), args.json),
		);
}
