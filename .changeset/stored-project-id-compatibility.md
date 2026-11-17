---
"@onlineornot/api": minor
---

feature: Regenerate the SDK and accept 12-character project IDs

Update the pinned API schema and generated operations. Accept stored 12-character project NanoIDs, including numeric-only NanoIDs, in project paths, request bodies and responses while continuing to accept existing project IDs. This SDK can ship before the API begins returning stored IDs.

Accept these project IDs in log and trace search filters. Preserve trace attribute, resource and scope maps, including nested arrays and null values, when using the optional Valibot validators.
