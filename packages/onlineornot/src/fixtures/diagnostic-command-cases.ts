import type { resourceCommandCases } from "./resource-command-cases";

export const diagnosticCommandCases: typeof resourceCommandCases = [
	{
		operationId: "listWebhookDeliveries",
		args: ["webhooks", "deliveries", "list", "webhook1234"],
		method: "GET",
		url: "/v1/webhooks/webhook1234/deliveries",
		body: null,
		public: false,
	},
	{
		operationId: "getWebhookDelivery",
		args: ["webhooks", "deliveries", "get", "webhook1234", "attempt1234"],
		method: "GET",
		url: "/v1/webhooks/webhook1234/deliveries/attempt1234",
		body: null,
		public: false,
	},
	{
		operationId: "getWebhookDeliveryActivity",
		args: ["webhooks", "deliveries", "activity", "webhook1234"],
		method: "GET",
		url: "/v1/webhooks/webhook1234/delivery-activity",
		body: null,
		public: false,
	},
	{
		operationId: "getWebhookDeliverySummary",
		args: ["webhooks", "deliveries", "summary", "--webhook-ids", "webhook1234"],
		method: "GET",
		url: "/v1/webhooks/delivery-summary?webhook_ids=webhook1234",
		body: null,
		public: false,
	},
	{
		operationId: "listAuditLogs",
		args: ["audit-logs", "list"],
		method: "GET",
		url: "/v1/audit_logs",
		body: null,
		public: false,
	},
	{
		operationId: "moveResources",
		args: [
			"resources",
			"move",
			"--body",
			'{"project_id":"project1234567890","resources":[{"kind":"check","id":"check1234"},{"kind":"heartbeat","id":"heartbeat1234"}]}',
			"--force",
		],
		method: "POST",
		url: "/v1/resources/move",
		body: {
			project_id: "project1234567890",
			resources: [
				{ kind: "check", id: "check1234" },
				{ kind: "heartbeat", id: "heartbeat1234" },
			],
		},
		public: false,
	},
];
