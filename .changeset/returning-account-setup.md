---
"onlineornot": patch
---

FIX: Skip first-check creation for accounts that already have uptime checks

Check the authenticated account before prompting for a URL or resuming saved setup state, including accounts with only DNS or TCP checks. Returning users see the command to list checks instead of creating an unwanted check. Explicit `setup --url` requests still work, without incorrectly describing an additional check as the first.
