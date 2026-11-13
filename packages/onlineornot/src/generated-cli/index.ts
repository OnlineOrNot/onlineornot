import { registerCommandCatalog } from "../command-runtime/command-catalog";
import type { CommonYargsArgv } from "../yargs-types";
import catalog from "./catalog.json";
import { command as createBrowserCheck } from "./createBrowserCheck";
import { command as createDnsCheck } from "./createDnsCheck";
import { command as createEnvironmentVariable } from "./createEnvironmentVariable";
import { command as createHeartbeat } from "./createHeartbeat";
import { command as createMaintenanceWindow } from "./createMaintenanceWindow";
import { command as createProject } from "./createProject";
import { command as createStatusPage } from "./createStatusPage";
import { command as createStatusPageComponent } from "./createStatusPageComponent";
import { command as createStatusPageComponentGroup } from "./createStatusPageComponentGroup";
import { command as createStatusPageIncident } from "./createStatusPageIncident";
import { command as createStatusPageIncidentUpdate } from "./createStatusPageIncidentUpdate";
import { command as createStatusPageScheduledMaintenance } from "./createStatusPageScheduledMaintenance";
import { command as createStatusPageSubscriber } from "./createStatusPageSubscriber";
import { command as createTcpCheck } from "./createTcpCheck";
import { command as createToken } from "./createToken";
import { command as createUptimeCheck } from "./createUptimeCheck";
import { command as createWebhook } from "./createWebhook";
import { command as deleteCheck } from "./deleteCheck";
import { command as deleteEnvironmentVariable } from "./deleteEnvironmentVariable";
import { command as deleteHeartbeat } from "./deleteHeartbeat";
import { command as deleteMaintenanceWindow } from "./deleteMaintenanceWindow";
import { command as deleteProject } from "./deleteProject";
import { command as deleteStatusPage } from "./deleteStatusPage";
import { command as deleteStatusPageComponent } from "./deleteStatusPageComponent";
import { command as deleteStatusPageComponentGroup } from "./deleteStatusPageComponentGroup";
import { command as deleteStatusPageIncident } from "./deleteStatusPageIncident";
import { command as deleteStatusPageIncidentUpdate } from "./deleteStatusPageIncidentUpdate";
import { command as deleteStatusPageScheduledMaintenance } from "./deleteStatusPageScheduledMaintenance";
import { command as deleteStatusPageSubscriber } from "./deleteStatusPageSubscriber";
import { command as deleteToken } from "./deleteToken";
import { command as deleteWebhook } from "./deleteWebhook";
import { command as getCheck } from "./getCheck";
import { command as getEnvironmentVariable } from "./getEnvironmentVariable";
import { command as getHeartbeat } from "./getHeartbeat";
import { command as getMaintenanceWindow } from "./getMaintenanceWindow";
import { command as getProject } from "./getProject";
import { command as getStatusPage } from "./getStatusPage";
import { command as getStatusPageComponent } from "./getStatusPageComponent";
import { command as getStatusPageComponentGroup } from "./getStatusPageComponentGroup";
import { command as getStatusPageIncident } from "./getStatusPageIncident";
import { command as getStatusPageIncidentUpdate } from "./getStatusPageIncidentUpdate";
import { command as getStatusPageScheduledMaintenance } from "./getStatusPageScheduledMaintenance";
import { command as getStatusPageSummary } from "./getStatusPageSummary";
import { command as getToken } from "./getToken";
import { command as getWebhook } from "./getWebhook";
import { command as getWebhookDelivery } from "./getWebhookDelivery";
import { command as getWebhookDeliveryActivity } from "./getWebhookDeliveryActivity";
import { command as getWebhookDeliverySummary } from "./getWebhookDeliverySummary";
import { command as listAuditLogs } from "./listAuditLogs";
import { command as listBrowserCheckIncidents } from "./listBrowserCheckIncidents";
import { command as listBrowserCheckResults } from "./listBrowserCheckResults";
import { command as listChecks } from "./listChecks";
import { command as listDnsCheckIncidents } from "./listDnsCheckIncidents";
import { command as listDnsCheckResults } from "./listDnsCheckResults";
import { command as listEnvironmentVariables } from "./listEnvironmentVariables";
import { command as listHeartbeats } from "./listHeartbeats";
import { command as listMaintenanceWindows } from "./listMaintenanceWindows";
import { command as listProjects } from "./listProjects";
import { command as listStatusPageComponentGroups } from "./listStatusPageComponentGroups";
import { command as listStatusPageComponents } from "./listStatusPageComponents";
import { command as listStatusPageIncidents } from "./listStatusPageIncidents";
import { command as listStatusPageIncidentUpdates } from "./listStatusPageIncidentUpdates";
import { command as listStatusPages } from "./listStatusPages";
import { command as listStatusPageSubscribers } from "./listStatusPageSubscribers";
import { command as listTcpCheckIncidents } from "./listTcpCheckIncidents";
import { command as listTcpCheckResults } from "./listTcpCheckResults";
import { command as listTokens } from "./listTokens";
import { command as listUptimeCheckIncidents } from "./listUptimeCheckIncidents";
import { command as listUptimeCheckResults } from "./listUptimeCheckResults";
import { command as listWebhookDeliveries } from "./listWebhookDeliveries";
import { command as listWebhooks } from "./listWebhooks";
import { command as moveCheck } from "./moveCheck";
import { command as moveEnvironmentVariable } from "./moveEnvironmentVariable";
import { command as moveHeartbeat } from "./moveHeartbeat";
import { command as moveMaintenanceWindow } from "./moveMaintenanceWindow";
import { command as moveResources } from "./moveResources";
import { command as moveWebhook } from "./moveWebhook";
import { command as updateBrowserCheck } from "./updateBrowserCheck";
import { command as updateDnsCheck } from "./updateDnsCheck";
import { command as updateEnvironmentVariable } from "./updateEnvironmentVariable";
import { command as updateHeartbeat } from "./updateHeartbeat";
import { command as updateMaintenanceWindow } from "./updateMaintenanceWindow";
import { command as updateProject } from "./updateProject";
import { command as updateStatusPage } from "./updateStatusPage";
import { command as updateStatusPageComponent } from "./updateStatusPageComponent";
import { command as updateStatusPageComponentGroup } from "./updateStatusPageComponentGroup";
import { command as updateStatusPageComponentGroupSortOrder } from "./updateStatusPageComponentGroupSortOrder";
import { command as updateStatusPageComponentSortOrder } from "./updateStatusPageComponentSortOrder";
import { command as updateStatusPageGroupComponentSortOrder } from "./updateStatusPageGroupComponentSortOrder";
import { command as updateStatusPageIncident } from "./updateStatusPageIncident";
import { command as updateStatusPageIncidentUpdate } from "./updateStatusPageIncidentUpdate";
import { command as updateStatusPageScheduledMaintenance } from "./updateStatusPageScheduledMaintenance";
import { command as updateTcpCheck } from "./updateTcpCheck";
import { command as updateUptimeCheck } from "./updateUptimeCheck";
import { command as updateWebhook } from "./updateWebhook";

export function registerGeneratedCommands(parser: CommonYargsArgv) {
	parser.command(
		"audit-logs",
		"Manage audit-logs",
		(group1) => {
			group1.command(listAuditLogs);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"checks",
		"Manage checks",
		(group1) => {
			group1.command(deleteCheck);
			group1.command(getCheck);
			group1.command(listChecks);
			group1.command(moveCheck);
			group1.command(
				"browser",
				"Manage browser",
				(group2) => {
					group2.command(createBrowserCheck);
					group2.command(listBrowserCheckIncidents);
					group2.command(listBrowserCheckResults);
					group2.command(updateBrowserCheck);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"dns",
				"Manage dns",
				(group2) => {
					group2.command(createDnsCheck);
					group2.command(listDnsCheckIncidents);
					group2.command(listDnsCheckResults);
					group2.command(updateDnsCheck);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"http",
				"Manage http",
				(group2) => {
					group2.command(createUptimeCheck);
					group2.command(listUptimeCheckIncidents);
					group2.command(listUptimeCheckResults);
					group2.command(updateUptimeCheck);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"tcp",
				"Manage tcp",
				(group2) => {
					group2.command(createTcpCheck);
					group2.command(listTcpCheckIncidents);
					group2.command(listTcpCheckResults);
					group2.command(updateTcpCheck);
					return group2.demandCommand(1);
				},
				() => {},
			);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		["env", "environment-variables"],
		"Manage env",
		(group1) => {
			group1.command(createEnvironmentVariable);
			group1.command(deleteEnvironmentVariable);
			group1.command(getEnvironmentVariable);
			group1.command(listEnvironmentVariables);
			group1.command(moveEnvironmentVariable);
			group1.command(updateEnvironmentVariable);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"heartbeats",
		"Manage heartbeats",
		(group1) => {
			group1.command(createHeartbeat);
			group1.command(deleteHeartbeat);
			group1.command(getHeartbeat);
			group1.command(listHeartbeats);
			group1.command(moveHeartbeat);
			group1.command(updateHeartbeat);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		["maintenance", "maintenance-windows"],
		"Manage maintenance",
		(group1) => {
			group1.command(createMaintenanceWindow);
			group1.command(deleteMaintenanceWindow);
			group1.command(getMaintenanceWindow);
			group1.command(listMaintenanceWindows);
			group1.command(moveMaintenanceWindow);
			group1.command(updateMaintenanceWindow);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"projects",
		"Manage projects",
		(group1) => {
			group1.command(createProject);
			group1.command(deleteProject);
			group1.command(getProject);
			group1.command(listProjects);
			group1.command(updateProject);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"resources",
		"Manage resources",
		(group1) => {
			group1.command(moveResources);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"status-pages",
		"Manage status-pages",
		(group1) => {
			group1.command(createStatusPage);
			group1.command(deleteStatusPage);
			group1.command(getStatusPage);
			group1.command(listStatusPages);
			group1.command(getStatusPageSummary);
			group1.command(updateStatusPage);
			group1.command(
				"components",
				"Manage components",
				(group2) => {
					group2.command(createStatusPageComponent);
					group2.command(deleteStatusPageComponent);
					group2.command(getStatusPageComponent);
					group2.command(listStatusPageComponents);
					group2.command(updateStatusPageComponentSortOrder);
					group2.command(updateStatusPageComponent);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"groups",
				"Manage groups",
				(group2) => {
					group2.command(createStatusPageComponentGroup);
					group2.command(deleteStatusPageComponentGroup);
					group2.command(getStatusPageComponentGroup);
					group2.command(listStatusPageComponentGroups);
					group2.command(updateStatusPageGroupComponentSortOrder);
					group2.command(updateStatusPageComponentGroupSortOrder);
					group2.command(updateStatusPageComponentGroup);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"incidents",
				"Manage incidents",
				(group2) => {
					group2.command(createStatusPageIncident);
					group2.command(deleteStatusPageIncident);
					group2.command(getStatusPageIncident);
					group2.command(listStatusPageIncidents);
					group2.command(updateStatusPageIncident);
					group2.command(
						"updates",
						"Manage updates",
						(group3) => {
							group3.command(createStatusPageIncidentUpdate);
							group3.command(deleteStatusPageIncidentUpdate);
							group3.command(getStatusPageIncidentUpdate);
							group3.command(listStatusPageIncidentUpdates);
							group3.command(updateStatusPageIncidentUpdate);
							return group3.demandCommand(1);
						},
						() => {},
					);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"scheduled-maintenance",
				"Manage scheduled-maintenance",
				(group2) => {
					group2.command(createStatusPageScheduledMaintenance);
					group2.command(deleteStatusPageScheduledMaintenance);
					group2.command(getStatusPageScheduledMaintenance);
					group2.command(updateStatusPageScheduledMaintenance);
					return group2.demandCommand(1);
				},
				() => {},
			);
			group1.command(
				"subscribers",
				"Manage subscribers",
				(group2) => {
					group2.command(createStatusPageSubscriber);
					group2.command(deleteStatusPageSubscriber);
					group2.command(listStatusPageSubscribers);
					return group2.demandCommand(1);
				},
				() => {},
			);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"tokens",
		"Manage tokens",
		(group1) => {
			group1.command(createToken);
			group1.command(deleteToken);
			group1.command(getToken);
			group1.command(listTokens);
			return group1.demandCommand(1);
		},
		() => {},
	);
	parser.command(
		"webhooks",
		"Manage webhooks",
		(group1) => {
			group1.command(createWebhook);
			group1.command(deleteWebhook);
			group1.command(getWebhook);
			group1.command(listWebhooks);
			group1.command(moveWebhook);
			group1.command(updateWebhook);
			group1.command(
				"deliveries",
				"Manage deliveries",
				(group2) => {
					group2.command(getWebhookDeliveryActivity);
					group2.command(getWebhookDelivery);
					group2.command(listWebhookDeliveries);
					group2.command(getWebhookDeliverySummary);
					return group2.demandCommand(1);
				},
				() => {},
			);
			return group1.demandCommand(1);
		},
		() => {},
	);
	registerCommandCatalog(parser, catalog);
}
