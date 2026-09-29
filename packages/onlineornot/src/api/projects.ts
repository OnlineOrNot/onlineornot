import {
	createProject as sdkCreateProject,
	deleteProject as sdkDeleteProject,
	getProject as sdkGetProject,
	listProjects as sdkListProjects,
	updateProject as sdkUpdateProject,
	moveCheck as sdkMoveCheck,
	moveHeartbeat as sdkMoveHeartbeat,
} from "@onlineornot/api";

import { getTokenAsync } from "../user";
import {
	getApiConfig,
	unwrapApiEnvelope,
	unwrapApiResult,
} from "./infrastructure";
import { paginateAllPages } from "./pagination";

async function authenticatedConfig() {
	const { apiToken } = await getTokenAsync();
	return getApiConfig(apiToken);
}

export async function listProjects() {
	const config = await authenticatedConfig();
	return paginateAllPages(async (page, per_page) => {
		const envelope = unwrapApiEnvelope(
			await sdkListProjects({ ...config, query: { page, per_page } }),
			"/projects",
		);
		return {
			items: envelope.result,
			totalItems: envelope.result_info.total_count,
		};
	});
}

export async function createProject(name: string) {
	return unwrapApiResult(
		await sdkCreateProject({
			...(await authenticatedConfig()),
			body: { name },
		}),
		"/projects",
	);
}

export async function getProject(projectId: string) {
	return unwrapApiResult(
		await sdkGetProject({
			...(await authenticatedConfig()),
			path: { project_id: projectId },
		}),
		`/projects/${projectId}`,
	);
}

export async function updateProject(projectId: string, name: string) {
	return unwrapApiResult(
		await sdkUpdateProject({
			...(await authenticatedConfig()),
			path: { project_id: projectId },
			body: { name },
		}),
		`/projects/${projectId}`,
	);
}

export async function deleteProject(projectId: string) {
	return unwrapApiResult(
		await sdkDeleteProject({
			...(await authenticatedConfig()),
			path: { project_id: projectId },
		}),
		`/projects/${projectId}`,
	);
}

// A move is a single server transaction. Never synthesize PATCHes, activation,
// variable copying, compensation or client retries around this operation.
export async function moveCheck(checkId: string, projectId: string) {
	return unwrapApiResult(
		await sdkMoveCheck({
			...(await authenticatedConfig()),
			path: { check_id: checkId },
			body: { project_id: projectId },
		}),
		`/checks/${checkId}/move`,
	);
}

export async function moveHeartbeat(heartbeatId: string, projectId: string) {
	return unwrapApiResult(
		await sdkMoveHeartbeat({
			...(await authenticatedConfig()),
			path: { heartbeat_id: heartbeatId },
			body: { project_id: projectId },
		}),
		`/heartbeats/${heartbeatId}/move`,
	);
}
