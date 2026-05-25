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

const adminId = "55faf062-c862-4449-85a8-a97e14886b1d";
const dewayneAdminId = "e4c237c0-ef29-4da1-9d16-3bad8b45892c";
const kelsieAdminId = "dee633cf-f57d-47d1-94c0-0bb321dcaecf";
const facilitatorId = "87bb00ed-6a12-451d-93b5-77ab36bded73";
const chaplainId = "fc96a375-777c-4613-8d35-f2b0e9bd2d25";
const mariaId = "48e2e5fb-c82e-47e9-b1ca-37eaf17123c1";
const anaId = "2d61cf91-f83d-4be9-9d85-476d099a4a43";
const rosaId = "f4e90aa1-c43e-4f3d-b42a-c537a49148fc";
const firstGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
const secondGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";
const completedMeetingId = "2e249c51-14ea-4c5a-85fa-3f7adcd8359a";
const scheduledMeetingId = "4925327e-0845-4f2d-b1d5-d7293f911111";

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
      phone: "+595000000001",
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
      phone: "+595000000002",
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
      email: "maria.gonzalez@diaconia.local",
      tokenHash: tokenHash("demo-maria-invite"),
      expiresAt,
      invitedByUserId: adminId,
    },
    {
      userId: anaId,
      email: "ana.martinez@diaconia.local",
      tokenHash: tokenHash("demo-ana-invite"),
      expiresAt,
      invitedByUserId: adminId,
    },
    {
      userId: rosaId,
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
