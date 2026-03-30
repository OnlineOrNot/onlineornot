---
"onlineornot": patch
---

fix: minimise roundtrips for list commands

This PR ensures all list endpoints now request 100 items per page instead of the API default, reducing the number of API calls needed for large datasets.
