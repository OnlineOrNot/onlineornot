---
"onlineornot": patch
---

fix: Exit cleanly after browser login completes

Close leftover OAuth callback connections, including unused browser preconnections, without dropping the browser redirect. Repeated cleanup calls now wait for the same shutdown to finish, preventing the CLI from hanging after a successful login.
