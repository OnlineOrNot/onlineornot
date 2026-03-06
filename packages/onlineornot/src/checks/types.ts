// API response types - these match the snake_case format returned by the API
// Based on ExpandedCheckModel from @onlineornot/shared-types

export type CheckStatus =
	| "UP"
	| "DOWN"
	| "PENDING"
	| "PAUSED"
	| "MUTED"
	| "MAINTENANCE"
	| "RECOVERING"
	| "VERIFYING";

export interface Assertion {
	type: "JSON_BODY" | "TEXT_BODY" | "RESPONSE_HEADERS" | "HTML_BODY";
	property: string;
	comparison:
		| "EQUALS"
		| "NOT_EQUALS"
		| "GREATER_THAN"
		| "LESS_THAN"
		| "NULL"
		| "NOT_NULL"
		| "EMPTY"
		| "NOT_EMPTY"
		| "CONTAINS"
		| "NOT_CONTAINS"
		| "FALSE"
		| "TRUE";
	expected: string;
}

/**
 * Full check response from GET/POST/PATCH endpoints
 * All fields match the actual API response format
 */
export interface Check {
	// Core fields (always present)
	id: string;
	name: string;
	url: string;
	status: CheckStatus;
	check_type: "UPTIME" | "BROWSER";

	// Nullable fields (can be null)
	last_queued: string | null;
	headers: Record<string, string> | null;
	text_to_search_for: string | null;
	webhook: string | null;
	webhook_type: string | null;
	version: "NODE20_PLAYWRIGHT" | "CLOUDFLARE" | null;
	body: string | null;
	assertions: Assertion[] | null;
	auth_username: string | null;
	auth_password: string | null;

	// Required fields with values
	test_interval: number;
	timeout: number;
	reminder_alert_interval_minutes: number;
	confirmation_period_seconds: number;
	recovery_period_seconds: number;
	alert_priority: "LOW" | "HIGH";
	method: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
	follow_redirects: boolean;
	verify_ssl: boolean;

	// Alert arrays (always present, can be empty)
	test_regions: string[];
	user_alerts: string[];
	slack_alerts: string[];
	discord_alerts: string[];
	incident_io_alerts: string[];
	microsoft_teams_alerts: string[];
	oncall_alerts: string[];
	webhook_alerts: string[];
}

/**
 * Basic check info returned from list endpoint
 */
export interface CheckListItem {
	id: string;
	name: string;
	url: string;
	status: CheckStatus;
	check_type: "UPTIME" | "BROWSER";
	last_queued: string | null;
}

export type CheckRegion =
	| "aws:us-east-1"
	| "aws:us-west-1"
	| "aws:eu-central-1"
	| "aws:ap-south-1"
	| "aws:ap-southeast-2"
	| "aws:ap-northeast-1";

export const VALID_REGIONS: CheckRegion[] = [
	"aws:us-east-1",
	"aws:us-west-1",
	"aws:eu-central-1",
	"aws:ap-south-1",
	"aws:ap-southeast-2",
	"aws:ap-northeast-1",
];

export const VALID_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;

// Request body types - these use snake_case for API requests
export interface CreateCheckParams {
	name: string;
	url: string;
	text_to_search_for?: string;
	test_interval?: number;
	reminder_alert_interval_minutes?: number;
	test_regions?: string[];
	user_alerts?: string[];
	slack_alerts?: string[];
	discord_alerts?: string[];
	incident_io_alerts?: string[];
	microsoft_teams_alerts?: string[];
	webhook_alerts?: string[];
	oncall_alerts?: string[];
	confirmation_period_seconds?: number;
	recovery_period_seconds?: number;
	timeout?: number;
	type?: "UPTIME_CHECK" | "BROWSER_CHECK";
	alert_priority?: "LOW" | "HIGH";
	headers?: Record<string, string>;
	method?: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: string;
	follow_redirects?: boolean;
	assertions?: Assertion[];
	verify_ssl?: boolean;
	auth_username?: string;
	auth_password?: string;
	version?: "NODE20_PLAYWRIGHT";
}

export interface UpdateCheckParams extends Partial<CreateCheckParams> {
	paused?: boolean;
	muted?: boolean;
}
