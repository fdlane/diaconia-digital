import { describe, expect, it } from "vitest";
import {
  createMediaUploadInputSchema,
  createSessionInputSchema,
  formatDisplayDate,
  getProfileInitials,
} from "./index";

describe("shared validation", () => {
  it("accepts a valid offline session payload", () => {
    const parsed = createSessionInputSchema.parse({
      id: "2e249c51-14ea-4c5a-85fa-3f7adcd8359a",
      groupId: "e69a495f-b594-4985-9a72-6683bb427bbf",
      heldAt: "2026-05-12T14:30:00.000Z",
      attendance: [
        {
          attendeeId: "8ba2f986-78c1-433b-9a87-a9cb73b7878b",
          status: "present",
        },
      ],
      prayerRequests: [
        {
          id: "f9362339-880f-4f2b-a676-51aee1594c20",
          attendeeId: "8ba2f986-78c1-433b-9a87-a9cb73b7878b",
          requesterName: "María González",
          request: "Pray for her new business inventory purchase.",
        },
      ],
    });

    expect(parsed.followUpCategory).toBe("none");
    expect(parsed.prayerRequests).toHaveLength(1);
  });

  it("limits uploaded images to known image types", () => {
    expect(() =>
      createMediaUploadInputSchema.parse({
        type: "meeting_photo",
        contentType: "application/pdf",
        byteSize: 1024,
      }),
    ).toThrow();
  });

  it("rejects media type associations that contradict the upload type", () => {
    expect(() =>
      createMediaUploadInputSchema.parse({
        type: "meeting_photo",
        contentType: "image/jpeg",
        byteSize: 1024,
        ownerUserId: "55faf062-c862-4449-85a8-a97e14886b1d",
      }),
    ).toThrow();
  });

  it("formats dates for Paraguay Spanish by default", () => {
    expect(formatDisplayDate("2026-05-12T14:30:00.000Z")).toContain("2026");
  });

  it("builds compact profile initials from names or email", () => {
    expect(getProfileInitials("María González", null)).toBe("MG");
    expect(getProfileInitials("", "facilitator@example.com")).toBe("F");
  });
});
