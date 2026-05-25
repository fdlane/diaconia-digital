export const zeroIntegrationNotes = {
  upstreamDatabase: process.env.ZERO_UPSTREAM_DB,
  queryUrl: process.env.ZERO_QUERY_URL,
  mutateUrl: process.env.ZERO_MUTATE_URL,
  tables: [
    "users",
    "groups",
    "group_memberships",
    "meetings",
    "meeting_attendance",
    "prayer_requests",
    "media_assets",
  ],
};
