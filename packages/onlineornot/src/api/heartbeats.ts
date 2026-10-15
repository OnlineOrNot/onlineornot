import {
	listHeartbeats as sdkListHeartbeats,
	moveHeartbeat as sdkMoveHeartbeat,
} from "@onlineornot/api";

import { getAuthenticatedApiConfig } from "./authenticated";
import { unwrapApiEnvelope, unwrapApiResult } from "./infrastructure";
import { paginateAllPages } from "./pagination";

export async function listHeartbeats(projectId?: string) {
	const config = await getAuthenticatedApiConfig();
	return paginateAllPages(async (page, perPage) => {
		const response = unwrapApiEnvelope(
			await sdkListHeartbeats({
				...config,
				query: { page, per_page: perPage, project_id: projectId },
			}),
			"/heartbeats",
		);
		return {
			items: response.result,
			totalItems: response.result_info.total_count,
		};
	});
}
export async function moveHeartbeat(heartbeatId: string, projectId: string) {
	return unwrapApiResult(
		await sdkMoveHeartbeat({
			...(await getAuthenticatedApiConfig()),
			path: { heartbeat_id: heartbeatId },
			body: { project_id: projectId },
		}),
		`/heartbeats/${heartbeatId}/move`,
	);
}
