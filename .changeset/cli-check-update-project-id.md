---
"onlineornot": patch
---

fix: Remove the `--project-id` flag from check update commands

The API rejects `project_id` on check updates, so the flag always failed. Use `onlineornot checks move` (or `resources move`) to change a check's project.
