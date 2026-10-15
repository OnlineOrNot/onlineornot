import {
	createCheck as sdkCreateCheck,
	deleteCheck as sdkDeleteCheck,
	getCheck as sdkGetCheck,
	listChecks as sdkListChecks,
	moveCheck as sdkMoveCheck,
	updateCheck as sdkUpdateCheck,
} from "@onlineornot/api";

import type {
	Check,
	CheckListItem,
	CreateCheckParams,
	UpdateCheckParams,
} from "../checks/types";
import { ParseError } from "../parse";
import { getAuthenticatedApiConfig } from "./authenticated";
import { unwrapApiEnvelope, unwrapApiResult } from "./infrastructure";
import { paginateAllPages } from "./pagination";

const CHECKS_RESOURCE = "/checks";

export async function listChecks(projectId?: string): Promise<CheckListItem[]> {
	const config = await getAuthenticatedApiConfig();
	return paginateAllPages(async (page, pageSize) => {
		const response = unwrapApiEnvelope(
			await sdkListChecks({
				...config,
				query: {
					page,
					per_page: pageSize,
					project_id: projectId,
				},
			}),
			CHECKS_RESOURCE,
		);
		return {
			items: response.result,
			totalItems: response.result_info.total_count,
		};
	});
}

export async function createCheck(params: CreateCheckParams): Promise<Check> {
	const result = await sdkCreateCheck({
		...(await getAuthenticatedApiConfig()),
		body: params,
	});
	return unwrapApiResult(result, CHECKS_RESOURCE);
}

export async function getCheck(checkId: string): Promise<Check> {
	const result = await sdkGetCheck({
		...(await getAuthenticatedApiConfig()),
		path: { check_id: checkId },
	});

	const check = unwrapApiResult(result, `${CHECKS_RESOURCE}/${checkId}`);
	if (check.check_type !== "UPTIME" && check.check_type !== "BROWSER") {
		throw new ParseError({
			text: `Check type ${check.check_type} is not supported by this command.`,
		});
	}

	// SAFETY: The generated API discriminant above establishes that this is one
	// of the check variants rendered by the CLI's uptime/browser check command.
	return check as Check;
}

export async function updateCheck(
	checkId: string,
	params: UpdateCheckParams,
): Promise<Check> {
	const result = await sdkUpdateCheck({
		...(await getAuthenticatedApiConfig()),
		body: params,
		path: { check_id: checkId },
	});
	return unwrapApiResult(result, `${CHECKS_RESOURCE}/${checkId}`);
}

export async function deleteCheck(checkId: string): Promise<void> {
	const result = await sdkDeleteCheck({
		...(await getAuthenticatedApiConfig()),
		path: { check_id: checkId },
	});
	unwrapApiResult(result, `${CHECKS_RESOURCE}/${checkId}`);
}

export async function moveCheck(checkId: string, projectId: string) {
	return unwrapApiResult(
		await sdkMoveCheck({
			...(await getAuthenticatedApiConfig()),
			path: { check_id: checkId },
			body: { project_id: projectId },
		}),
		`${CHECKS_RESOURCE}/${checkId}/move`,
	);
}
