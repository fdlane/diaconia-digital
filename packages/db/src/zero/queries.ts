import type { AnyQuery, ReadonlyJSONValue } from "@rocicorp/zero";
import type { ZeroAuthContext } from "./context.js";
import { zql } from "./schema.js";

type ZeroQueryFactory = (context: ZeroAuthContext, args: readonly ReadonlyJSONValue[]) => AnyQuery;

function stringArg(args: readonly ReadonlyJSONValue[], index: number) {
  const value = args[index];
  return typeof value === "string" ? value : null;
}

function assignedGroups(context: ZeroAuthContext) {
  if (context.role === "admin") {
    return zql.groups.orderBy("name", "asc").limit(250);
  }

  return zql.groups
    .where(({ cmp, exists, or }) =>
      or(
        cmp("facilitatorId", context.userId),
        cmp("chaplainUserId", context.userId),
        exists("memberships", (query) =>
          query.where("userId", context.userId).where("active", true),
        ),
      ),
    )
    .orderBy("name", "asc")
    .limit(250);
}

function assignedGroupMemberships(context: ZeroAuthContext) {
  if (context.role === "admin") {
    return zql.group_memberships.where("active", true).limit(1000);
  }

  return zql.group_memberships
    .where("active", true)
    .whereExists("group", (query) =>
      query.where(({ cmp, exists, or }) =>
        or(
          cmp("facilitatorId", context.userId),
          cmp("chaplainUserId", context.userId),
          exists("memberships", (membershipQuery) =>
            membershipQuery.where("userId", context.userId).where("active", true),
          ),
        ),
      ),
    )
    .limit(1000);
}

function assignedUsers(context: ZeroAuthContext) {
  if (context.role === "admin") {
    return zql.users.orderBy("displayName", "asc").limit(1000);
  }

  return zql.users
    .where("status", "active")
    .whereExists("groupMemberships", (query) =>
      query.where("active", true).whereExists("group", (groupQuery) =>
        groupQuery.where(({ cmp, exists, or }) =>
          or(
            cmp("facilitatorId", context.userId),
            cmp("chaplainUserId", context.userId),
            exists("memberships", (membershipQuery) =>
              membershipQuery.where("userId", context.userId).where("active", true),
            ),
          ),
        ),
      ),
    )
    .orderBy("displayName", "asc")
    .limit(1000);
}

function assignedMeetings(context: ZeroAuthContext) {
  if (context.role === "admin") {
    return zql.meetings.orderBy("scheduledStartAt", "desc").limit(500);
  }

  return zql.meetings
    .where(({ cmp, exists, or }) =>
      or(
        cmp("facilitatorId", context.userId),
        cmp("chaplainUserId", context.userId),
        exists("group", (groupQuery) =>
          groupQuery.whereExists("memberships", (membershipQuery) =>
            membershipQuery.where("userId", context.userId).where("active", true),
          ),
        ),
      ),
    )
    .orderBy("scheduledStartAt", "desc")
    .limit(500);
}

function meetingAttendanceRows(context: ZeroAuthContext, args: readonly ReadonlyJSONValue[]) {
  const meetingId = stringArg(args, 0);
  const query = meetingId ? zql.meeting_attendance.where("meetingId", meetingId) : zql.meeting_attendance;

  if (context.role === "admin") {
    return query.limit(1000);
  }

  return query
    .whereExists("meeting", (meetingQuery) =>
      meetingQuery.where(({ cmp, exists, or }) =>
        or(
          cmp("facilitatorId", context.userId),
          cmp("chaplainUserId", context.userId),
          exists("group", (groupQuery) =>
            groupQuery.whereExists("memberships", (membershipQuery) =>
              membershipQuery.where("userId", context.userId).where("active", true),
            ),
          ),
        ),
      ),
    )
    .limit(1000);
}

function prayerRequestRows(context: ZeroAuthContext, args: readonly ReadonlyJSONValue[]) {
  const meetingId = stringArg(args, 0);
  const query = meetingId ? zql.prayer_requests.where("meetingId", meetingId) : zql.prayer_requests;

  if (context.role === "admin") {
    return query.limit(1000);
  }

  return query
    .whereExists("meeting", (meetingQuery) =>
      meetingQuery.where(({ cmp, exists, or }) =>
        or(
          cmp("facilitatorId", context.userId),
          cmp("chaplainUserId", context.userId),
          exists("group", (groupQuery) =>
            groupQuery.whereExists("memberships", (membershipQuery) =>
              membershipQuery.where("userId", context.userId).where("active", true),
            ),
          ),
        ),
      ),
    )
    .limit(1000);
}

function mediaAssetRows(context: ZeroAuthContext, args: readonly ReadonlyJSONValue[]) {
  const meetingId = stringArg(args, 0);
  const query = meetingId ? zql.media_assets.where("meetingId", meetingId) : zql.media_assets;

  if (context.role === "admin") {
    return query.limit(1000);
  }

  return query
    .whereExists("meeting", (meetingQuery) =>
      meetingQuery.where(({ cmp, exists, or }) =>
        or(
          cmp("facilitatorId", context.userId),
          cmp("chaplainUserId", context.userId),
          exists("group", (groupQuery) =>
            groupQuery.whereExists("memberships", (membershipQuery) =>
              membershipQuery.where("userId", context.userId).where("active", true),
            ),
          ),
        ),
      ),
    )
    .limit(1000);
}

export const zeroQueries: Record<string, ZeroQueryFactory> = {
  "mobile.groups": (context) => assignedGroups(context),
  "mobile.groupMemberships": (context) => assignedGroupMemberships(context),
  "mobile.users": (context) => assignedUsers(context),
  "mobile.meetings": (context) => assignedMeetings(context),
  "mobile.meetingAttendance": (context, args) => meetingAttendanceRows(context, args),
  "mobile.prayerRequests": (context, args) => prayerRequestRows(context, args),
  "mobile.mediaAssets": (context, args) => mediaAssetRows(context, args),
};
