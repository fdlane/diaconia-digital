import { describe, expect, it } from "vitest";
import {
  labels,
  createMediaUploadInputSchema,
  createMeetingInputSchema,
  formatDisplayDate,
  getProfileInitials,
} from "./index";

describe("shared validation", () => {
  it("accepts a valid offline meeting payload", () => {
    const parsed = createMeetingInputSchema.parse({
      id: "2e249c51-14ea-4c5a-85fa-3f7adcd8359a",
      groupId: "e69a495f-b594-4985-9a72-6683bb427bbf",
      scheduledStartAt: "2026-05-12T14:30:00.000Z",
      occurredAt: "2026-05-12T14:40:00.000Z",
      latitude: -25.5167,
      longitude: -54.6167,
      locationName: "Salon comunitario",
      locationSource: "device",
      attendance: [
        {
          userId: "8ba2f986-78c1-433b-9a87-a9cb73b7878b",
          status: "present",
        },
      ],
      prayerRequests: [
        {
          id: "f9362339-880f-4f2b-a676-51aee1594c20",
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

  it("keeps Spanish and English mobile labels aligned without legacy meeting copy", () => {
    expect(Object.keys(labels.es).sort()).toEqual(Object.keys(labels.en).sort());
    const oldEnglishMeetingWord = ["ses", "sion"].join("");
    const oldSpanishMeetingWord = ["se", "sion"].join("");
    expect(JSON.stringify(labels.es).toLocaleLowerCase()).not.toContain(oldSpanishMeetingWord);
    expect(JSON.stringify(labels.en).toLocaleLowerCase()).not.toContain(oldEnglishMeetingWord);
  });
});
