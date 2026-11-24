---
"@onlineornot/api": minor
---

feature: Add Teams and organisation access settings operations

Refresh the SDK from the latest API schema. New operations manage teams (`listTeams`, `createTeam`, `getTeam`, `updateTeam`, `deleteTeam`), team membership (`listTeamMembers`, `setTeamMember`, `removeTeamMember`, `joinTeam`, `leaveTeam`), join requests (`listTeamJoinRequests`, `approveTeamJoinRequest`, `deleteTeamJoinRequest`), and team–project links (`listTeamProjects`, `listProjectTeams`, `addProjectTeam`, `removeProjectTeam`). `getOrganisationAccessSettings` reads the organisation's open-membership setting and the caller's capabilities. API token grants accept the new `TEAMS` scope.
