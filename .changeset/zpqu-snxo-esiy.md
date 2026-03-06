---
"onlineornot": minor
---

Add `checks update` command and display all API fields in check output

- Add new `checks update <id>` command with all API options (test-interval, timeout, headers, regions, alerts, etc.)
- Update `checks create`, `checks view`, and `checks update` to display all fields returned by the API
- Fix Check type to use snake_case matching actual API response format
- Add CheckListItem type for list endpoint which returns fewer fields
