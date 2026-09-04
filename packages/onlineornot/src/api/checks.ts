import {
	createCheck as sdkCreateCheck,
	deleteCheck as sdkDeleteCheck,
	getCheck as sdkGetCheck,
	listChecks as sdkListChecks,
	updateCheck as sdkUpdateCheck,
} from "@onlineornot/api";

import type {
	Check,
	CheckListItem,
	CreateCheckParams,
	UpdateCheckParams,
} from "../checks/types";
import { ParseError } from "../parse";
import { getTokenAsync } from "../user";
import {
	getApiConfig,
	unwrapApiEnvelope,
	unwrapApiResult,
} from "./infrastructure";

const CHECKS_RESOURCE = "/checks";
const PAGE_SIZE = 100;

export async function listChecks(): Promise<CheckListItem[]> {
	const config = await authenticatedConfig();
	const checks: CheckListItem[] = [];
	let page = 1;

	while (true) {
		const response = unwrapApiEnvelope(
			await sdkListChecks({
				...config,
				query: {
					page: String(page),
					per_page: String(PAGE_SIZE),
				},
			}),
			CHECKS_RESOURCE,
		);
		checks.push(...response.result);

		if (
			checks.length >= response.result_info.total_count ||
			response.result.length === 0
		) {
			return checks;
		}
		page += 1;
	}
}

export async function createCheck(params: CreateCheckParams): Promise<Check> {
	const result = await sdkCreateCheck({
		...(await authenticatedConfig()),
		body: params,
	});
	return unwrapApiResult(result, CHECKS_RESOURCE);
}

export async function getCheck(checkId: string): Promise<Check> {
	const result = await sdkGetCheck({
		...(await authenticatedConfig()),
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
		...(await authenticatedConfig()),
		body: params,
		path: { check_id: checkId },
	});
	return unwrapApiResult(result, `${CHECKS_RESOURCE}/${checkId}`);
}

export async function deleteCheck(checkId: string): Promise<void> {
	const result = await sdkDeleteCheck({
		...(await authenticatedConfig()),
		path: { check_id: checkId },
	});
	unwrapApiResult(result, `${CHECKS_RESOURCE}/${checkId}`);
}

async function authenticatedConfig() {
	const { apiToken } = await getTokenAsync();
	return getApiConfig(apiToken);
}
