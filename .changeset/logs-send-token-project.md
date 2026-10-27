---
"@onlineornot/api": patch
---

feature: support log sending permissions and token project assignments.

Regenerate the SDK from the published API schema. Token operations and optional validators support LOGS:SEND alongside other explicit grants, with project metadata for sending credentials.

Preserve grant validation and inferred grant types in all optional Valibot token schemas, including invalid scope/permission rejection.
