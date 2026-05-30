import { describe, expect, it } from "vitest";
import {
  bootstrapSnapshot,
  createMembershipFromMember,
  createUserFromMember,
  enqueueMutation,
  markPendingMutationsSynced,
  selectLocalMembers,
  toLocalMeeting,
} from "./offlineStore";

describe("offline store", () => {
  it("denormalizes active group members from users and memberships", () => {
    const snapshot = bootstrapSnapshot({
      users: [
        { id: "019e606b-ce98-7134-b1d1-958703c36595", displayName: "Ana", phone: "+595", role: "member", status: "active", token: "" },
        { id: "019e606b-ce98-7134-b1d1-958703c36596", displayName: "Beto", phone: "+595", role: "member", status: "disabled", token: "" },
      ],
      groups: [{ id: "019e606b-ce98-7134-b1d1-958703c36597", name: "Grupo", community: "Paraguay", active: true }],
      memberships: [
        { id: "019e606b-ce98-7134-b1d1-958703c36598", groupId: "019e606b-ce98-7134-b1d1-958703c36597", userId: "019e606b-ce98-7134-b1d1-958703c36595", active: true, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "019e606b-ce98-7134-b1d1-958703c36599", groupId: "019e606b-ce98-7134-b1d1-958703c36597", userId: "019e606b-ce98-7134-b1d1-958703c36596", active: true, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });

    expect(selectLocalMembers(snapshot, "019e606b-ce98-7134-b1d1-958703c36597")).toEqual([
      expect.objectContaining({ displayName: "Ana" }),
    ]);
  });

  it("queues entity mutations while applying them locally immediately", () => {
    const now = "2026-01-01T00:00:00.000Z";
    const member = { id: "019e606b-ce98-7134-b1d1-958703c36595", groupId: "019e606b-ce98-7134-b1d1-958703c36597", displayName: "Ana", phone: "+595", role: "member" as const };
    let snapshot = bootstrapSnapshot({ users: [], groups: [{ id: member.groupId, name: "Grupo", community: "Paraguay", active: true }], memberships: [] });

    snapshot = enqueueMutation(snapshot, { type: "user.upsert", user: createUserFromMember(member, now) });
    snapshot = enqueueMutation(snapshot, { type: "membership.upsert", membership: createMembershipFromMember(member, now, "019e606b-ce98-7134-b1d1-958703c36599") });

    expect(selectLocalMembers(snapshot, member.groupId)).toHaveLength(1);
    expect(snapshot.pendingMutations).toHaveLength(2);
  });

  it("models meeting drafts as offline-first pending mutations", () => {
    const meeting = toLocalMeeting({
      id: "019e606b-ce98-7134-b1d1-958703c36595",
      groupId: "019e606b-ce98-7134-b1d1-958703c36597",
      facilitatorId: "019e606b-ce98-7134-b1d1-958703c36596",
      scheduledStartAt: "2026-01-01T00:00:00.000Z",
      occurredAt: "2026-01-01T00:00:00.000Z",
      status: "completed",
      notes: "offline",
      followUpCategory: "none",
      followUpNotes: "",
      attendance: {},
      prayerRequests: [],
      meetingPhotos: [],
    });
    const snapshot = enqueueMutation(bootstrapSnapshot({ users: [], groups: [], memberships: [] }), { type: "meeting.upsert", meeting });

    expect(snapshot.meetings[0]?.syncStatus).toBe("pending");
    expect(markPendingMutationsSynced(snapshot).pendingMutations).toHaveLength(0);
  });
});
