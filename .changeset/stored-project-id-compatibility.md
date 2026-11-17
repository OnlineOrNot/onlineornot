---
"@onlineornot/api": minor
---

feature: Regenerate the SDK and treat resource IDs as opaque strings

Update the pinned API schema and generated operations. Remove resource-ID length, pattern and encoding checks from optional Zod and Valibot validators while retaining string types, declared nullability and collection limits. Leave resource-ID validation to the API. Protocol-specific trace and span ID validation is unchanged.

Preserve trace attribute, resource and scope maps, including nested arrays and null values, when using the optional Valibot validators.
