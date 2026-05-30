import { describe, expect, it } from "vitest";
import { toZeroMutationCalls } from "./offlineMutations";

describe("offline Zero mutation adapter", () => {
  it("expands one meeting mutation into meeting, attendance, and prayer mutator calls", () => {
    const calls = toZeroMutationCalls({
      type: "meeting.upsert",
      meeting: {
        id: "019e606b-ce98-7134-b1d1-958703c36595",
        groupId: "019e606b-ce98-7134-b1d1-958703c36596",
        scheduledStartAt: "2026-01-01T00:00:00.000Z",
        occurredAt: "2026-01-01T00:00:00.000Z",
        status: "completed",
        notes: "offline",
        followUpCategory: "none",
        followUpNotes: "",
        attendance: { "019e606b-ce98-7134-b1d1-958703c36597": "present" },
        prayerRequests: [{ id: "019e606b-ce98-7134-b1d1-958703c36598", request: "Health" }],
        meetingPhotos: [],
        syncStatus: "pending",
      },
    });

    expect(calls.map((call) => `${call.namespace}.${call.method}`)).toEqual([
      "meetings.upsert",
      "meetingAttendance.upsert",
      "prayerRequests.upsert",
    ]);
  });
});
