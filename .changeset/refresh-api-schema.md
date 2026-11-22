---
"@onlineornot/api": minor
---

feature: Refresh the SDK from the latest API schema

Expose span usage and pay-as-you-go budget fields in log usage responses, and include user agents in audit log entries.

The SDK no longer accepts request fields the API always rejects. `project_id` is removed from check, heartbeat, maintenance window, webhook and environment variable update bodies; use the move operations to change a resource's project.
