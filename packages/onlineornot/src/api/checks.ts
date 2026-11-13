import {
	createCheck as sdkCreateCheck,
	listChecks as sdkListChecks,
} from "@onlineornot/api";
import type {
	CheckInput,
	CheckListItem,
	ExpandedCheck,
} from "@onlineornot/api";

import { getTokenAsync } from "../user";
import {
	getApiConfig,
	unwrapApiEnvelope,
	unwrapApiResult,
} from "./infrastructure";
import { paginateAllPages } from "./pagination";

const CHECKS_RESOURCE = "/checks";

export async function listChecks(): Promise<CheckListItem[]> {
	const config = await authenticatedConfig();
	return paginateAllPages(async (page, pageSize) => {
		const response = unwrapApiEnvelope(
			await sdkListChecks({
				...config,
				query: {
					page,
					per_page: pageSize,
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

export async function createCheck(params: CheckInput): Promise<ExpandedCheck> {
	const result = await sdkCreateCheck({
		...(await authenticatedConfig()),
		body: params,
	});
	return unwrapApiResult(result, CHECKS_RESOURCE);
}

async function authenticatedConfig() {
	const { apiToken } = await getTokenAsync();
	return getApiConfig(apiToken);
}
