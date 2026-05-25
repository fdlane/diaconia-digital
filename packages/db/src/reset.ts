import { createDatabaseClient } from "./client";
import { seedDatabase } from "./seed";
import {
  auditEvents,
  groupMemberships,
  groups,
  invitations,
  mediaAssets,
  meetingAttendance,
  meetings,
  prayerRequests,
  users,
} from "./schema";

const { db, pool } = createDatabaseClient();

try {
  await db.delete(auditEvents);
  await db.delete(mediaAssets);
  await db.delete(meetingAttendance);
  await db.delete(prayerRequests);
  await db.delete(invitations);
  await db.delete(groupMemberships);
  await db.delete(meetings);
  await db.delete(groups);
  await db.delete(users);

  console.log("Cleared Diaconia demo data.");
  await seedDatabase(db);
} finally {
  await pool.end();
}
