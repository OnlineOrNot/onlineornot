---
"@onlineornot/api": minor
---

feature: Add domain expiry alerts to check operations

Refresh the SDK from api-schemas `19198be6b59807ee95b5ddb827c10ad3a7141ff7`. Uptime, browser, TCP, DNS and generic check create and update bodies accept `domain_expiry_alerts`. Expanded check responses include `domain_expiry_alerts` and a read-only `domain_expiry` summary, exported as the `DomainExpiry` type (with `zDomainExpiry` and `vDomainExpiry` validators). `domain_expiry` is `null` when alerts are off.

The optional Zod validators now accept RFC 3339 numeric offsets (such as `+01:00`) in every `date-time` field, not only `Z`, matching the OpenAPI format and the Valibot validators. Timestamps without a timezone are still rejected.
