import { createHash } from "node:crypto";
import { createDatabase } from "./client";
import {
  groupMemberships,
  groups,
  invitations,
  meetingAttendance,
  meetings,
  prayerRequests,
  users,
} from "./schema";

const db = createDatabase();

const adminId = "019e606b-ce98-7134-b1d1-958703c36595";
const dewayneAdminId = "019e606b-ce9a-7217-a2af-a9729b4d1107";
const kelsieAdminId = "019e606b-ce9a-7217-a2af-ae7ac4769a81";
const facilitatorId = "019e606b-ce9a-7217-a2af-b3aff656a78b";
const chaplainId = "019e606b-ce9a-7217-a2af-b6db0b3fa660";
const mariaId = "019e606b-ce9a-7217-a2af-bb021acfe955";
const anaId = "019e606b-ce9a-7217-a2af-bd89eb528287";
const rosaId = "019e606b-ce9a-7217-a2af-c16b10a2e4f0";
const firstGroupId = "019e606b-ce9a-7217-a2af-c8c18b19c27e";
const secondGroupId = "019e606b-ce9a-7217-a2af-cd113443806a";
const completedMeetingId = "019e606b-ce9a-7217-a2af-d099fc127b08";
const scheduledMeetingId = "019e606b-ce9a-7217-a2af-d54756e0158f";

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const now = new Date();
const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);

await db
  .insert(users)
  .values([
    {
      id: adminId,
      authProvider: "clerk",
      authSubject: "local-dev-user",
      displayName: "Administradora Demo",
      email: "dev@diaconia.local",
      phone: "+595000000000",
      role: "admin",
      status: "active",
      invitedAt: now,
      activatedAt: now,
    },
    {
      id: dewayneAdminId,
      authProvider: "clerk",
      authSubject: "local-dewayne-lane",
      displayName: "F. DeWayne Lane",
      email: "dewayne.lane@diaconia.local",
      phone: "+18653350788",
      role: "admin",
      status: "active",
      invitedAt: now,
      activatedAt: now,
    },
    {
      id: kelsieAdminId,
      authProvider: "clerk",
      authSubject: "local-kelsie-jeon",
      displayName: "Kelsie Jeon",
      email: "kelsie.jeon@diaconia.local",
      phone: "+595975241834",
      role: "admin",
      status: "active",
      invitedAt: now,
      activatedAt: now,
    },
    {
      id: facilitatorId,
      authProvider: "clerk",
      authSubject: "local-facilitator-user",
      displayName: "Facilitadora Demo",
      email: "facilitadora@diaconia.local",
      phone: "+595981000000",
      role: "facilitator",
      status: "active",
      invitedAt: now,
      activatedAt: now,
    },
    {
      id: chaplainId,
      authProvider: "clerk",
      authSubject: "local-chaplain-user",
      displayName: "Capellan Demo",
      email: "capellan@diaconia.local",
      phone: "+595982000000",
      role: "chaplain",
      status: "active",
      invitedAt: now,
      activatedAt: now,
    },
    {
      id: mariaId,
      authProvider: "clerk",
      displayName: "Maria Gonzalez",
      email: "maria.gonzalez@diaconia.local",
      phone: "+595981000001",
      role: "member",
      status: "invited",
      invitedAt: now,
    },
    {
      id: anaId,
      authProvider: "clerk",
      displayName: "Ana Martinez",
      email: "ana.martinez@diaconia.local",
      phone: "+595981000002",
      role: "member",
      status: "invited",
      invitedAt: now,
    },
    {
      id: rosaId,
      authProvider: "clerk",
      displayName: "Rosa Benitez",
      email: "rosa.benitez@diaconia.local",
      phone: "+595981000003",
      role: "member",
      status: "invited",
      invitedAt: now,
    },
  ])
  .onConflictDoNothing();

await db
  .insert(invitations)
  .values([
    {
      userId: mariaId,
      phone: "+595981000001",
      email: "maria.gonzalez@diaconia.local",
      tokenHash: tokenHash("demo-maria-invite"),
      expiresAt,
      invitedByUserId: adminId,
    },
    {
      userId: anaId,
      phone: "+595981000002",
      email: "ana.martinez@diaconia.local",
      tokenHash: tokenHash("demo-ana-invite"),
      expiresAt,
      invitedByUserId: adminId,
    },
    {
      userId: rosaId,
      phone: "+595981000003",
      email: "rosa.benitez@diaconia.local",
      tokenHash: tokenHash("demo-rosa-invite"),
      expiresAt,
      invitedByUserId: adminId,
    },
  ])
  .onConflictDoNothing();

await db
  .insert(groups)
  .values([
    {
      id: firstGroupId,
      name: "Grupo Mujeres Emprendedoras",
      community: "Caaguazu",
      facilitatorId,
      chaplainUserId: chaplainId,
    },
    {
      id: secondGroupId,
      name: "Comite San Miguel",
      community: "Itapua",
      facilitatorId,
      chaplainUserId: chaplainId,
    },
  ])
  .onConflictDoNothing();

await db
  .insert(groupMemberships)
  .values([
    { groupId: firstGroupId, userId: facilitatorId },
    { groupId: firstGroupId, userId: mariaId, position: "president" },
    { groupId: firstGroupId, userId: anaId, position: "secretary" },
    { groupId: secondGroupId, userId: facilitatorId },
    { groupId: secondGroupId, userId: rosaId, position: "treasurer" },
  ])
  .onConflictDoNothing();

await db
  .insert(meetings)
  .values([
    {
      id: completedMeetingId,
      groupId: firstGroupId,
      facilitatorId,
      chaplainUserId: chaplainId,
      scheduledStartAt: new Date("2026-05-12T14:30:00.000Z"),
      occurredAt: new Date("2026-05-12T14:40:00.000Z"),
      status: "completed",
      latitude: "-25.4646",
      longitude: "-56.0139",
      locationName: "Salon comunitario",
      address: "Caaguazu, Paraguay",
      locationCapturedAt: new Date("2026-05-12T14:35:00.000Z"),
      locationSource: "device",
      notes: "Reunion enfocada en seguimiento de emprendimientos.",
      followUpCategory: "training",
      followUpNotes: "Coordinar capacitacion de costos.",
      submittedAt: new Date("2026-05-12T16:00:00.000Z"),
      completedAt: new Date("2026-05-12T16:00:00.000Z"),
    },
    {
      id: scheduledMeetingId,
      groupId: secondGroupId,
      facilitatorId,
      chaplainUserId: chaplainId,
      scheduledStartAt: new Date("2026-06-02T14:30:00.000Z"),
      status: "scheduled",
      latitude: "-27.3306",
      longitude: "-55.8667",
      locationName: "Capilla San Miguel",
      address: "Itapua, Paraguay",
      locationSource: "manual",
    },
  ])
  .onConflictDoNothing();

await db
  .insert(meetingAttendance)
  .values([
    { meetingId: completedMeetingId, userId: facilitatorId, status: "present" },
    { meetingId: completedMeetingId, userId: mariaId, status: "present" },
    { meetingId: completedMeetingId, userId: anaId, status: "excused" },
  ])
  .onConflictDoNothing();

await db
  .insert(prayerRequests)
  .values([
    {
      meetingId: completedMeetingId,
      request: "Orar por sabiduria en las decisiones del grupo.",
    },
    {
      meetingId: completedMeetingId,
      request: "Orar por salud y fortaleza para las familias.",
    },
  ])
  .onConflictDoNothing();

console.log("Seeded Diaconia greenfield demo data.");
