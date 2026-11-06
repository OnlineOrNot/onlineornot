---
"@onlineornot/api": minor
---

feature: Regenerate the SDK with multi-project list filters and project name conflicts.

List queries for checks, heartbeats, webhooks, environment variables, and maintenance windows now accept either a single project ID or up to 100 project IDs as a string array, including `unassigned`. Arrays are sent as repeated `project_id` parameters; existing single-string filters continue to work. Project creation and updates expose the documented `project_name_taken` HTTP 409 error response.

The schema snapshot also adds `exportOtlpLogs` and `getLogUsage` operations and status code assertion types.
