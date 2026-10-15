import {
	createProject as sdkCreateProject,
	deleteProject as sdkDeleteProject,
	getProject as sdkGetProject,
	listProjects as sdkListProjects,
	updateProject as sdkUpdateProject,
} from "@onlineornot/api";

import { getAuthenticatedApiConfig } from "./authenticated";
import { unwrapApiEnvelope, unwrapApiResult } from "./infrastructure";
import { paginateAllPages } from "./pagination";

export async function listProjects() {
	const config = await getAuthenticatedApiConfig();
	return paginateAllPages(async (page, perPage) => {
		const response = unwrapApiEnvelope(
			await sdkListProjects({ ...config, query: { page, per_page: perPage } }),
			"/projects",
		);
		return {
			items: response.result,
			totalItems: response.result_info.total_count,
		};
	});
}
export async function createProject(name: string) {
	return unwrapApiResult(
		await sdkCreateProject({
			...(await getAuthenticatedApiConfig()),
			body: { name },
		}),
		"/projects",
	);
}
export async function getProject(projectId: string) {
	return unwrapApiResult(
		await sdkGetProject({
			...(await getAuthenticatedApiConfig()),
			path: { project_id: projectId },
		}),
		`/projects/${projectId}`,
	);
}
export async function updateProject(projectId: string, name: string) {
	return unwrapApiResult(
		await sdkUpdateProject({
			...(await getAuthenticatedApiConfig()),
			path: { project_id: projectId },
			body: { name },
		}),
		`/projects/${projectId}`,
	);
}
export async function deleteProject(projectId: string) {
	return unwrapApiResult(
		await sdkDeleteProject({
			...(await getAuthenticatedApiConfig()),
			path: { project_id: projectId },
		}),
		`/projects/${projectId}`,
	);
}
