---
"onlineornot": minor
---

feature: Add `--domain-expiry-alerts` to check create and update commands

`checks http|dns|tcp create` and `update` accept `--domain-expiry-alerts` and `--no-domain-expiry-alerts`. When alerts are on, the check's alert recipients get an email 30, 14, 7 and 1 day before the target's registered domain expires, and again if it expires. Updates send the field only when you pass the flag. Check output includes `domain_expiry_alerts` and the `domain_expiry` summary. If the target has no registered domain, the API's validation error is printed. Browser checks run scripts, so `checks browser` commands do not offer the flag.
