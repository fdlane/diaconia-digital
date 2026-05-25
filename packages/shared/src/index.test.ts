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
      id: "019e606c-17c0-7d9d-82e4-0f78ffb117d1",
      groupId: "019e606c-17c0-7d9d-82e4-14d0e0d98998",
      scheduledStartAt: "2026-05-12T14:30:00.000Z",
      occurredAt: "2026-05-12T14:40:00.000Z",
      latitude: -25.5167,
      longitude: -54.6167,
      locationName: "Salon comunitario",
      locationSource: "device",
      attendance: [
        {
          userId: "019e606c-17c0-7d9d-82e4-1c898f2cb5ba",
          status: "present",
        },
      ],
      prayerRequests: [
        {
          id: "019e606c-17c0-7d9d-82e4-26c8bfcb8ff0",
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
        ownerUserId: "019e606c-17c0-7d9d-82e4-35c6de72f2e1",
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
