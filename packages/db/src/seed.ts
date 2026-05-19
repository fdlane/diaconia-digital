import { createDatabase } from "./client";
import { attendees, groups, users } from "./schema";

const db = createDatabase();

const facilitatorId = "55faf062-c862-4449-85a8-a97e14886b1d";
const firstGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
const secondGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";

await db
  .insert(users)
  .values({
    id: facilitatorId,
    cognitoSub: "local-dev-user",
    displayName: "Facilitadora Demo",
    email: "dev@diaconia.local",
    phone: "+595000000000",
    role: "admin",
  })
  .onConflictDoNothing();

await db
  .insert(groups)
  .values([
    {
      id: firstGroupId,
      name: "Grupo Mujeres Emprendedoras",
      community: "Caaguazu",
      facilitatorId,
    },
    {
      id: secondGroupId,
      name: "Comite San Miguel",
      community: "Itapua",
      facilitatorId,
    },
  ])
  .onConflictDoNothing();

await db
  .insert(attendees)
  .values([
    {
      id: "48e2e5fb-c82e-47e9-b1ca-37eaf17123c1",
      groupId: firstGroupId,
      displayName: "Maria Gonzalez",
      phone: "+595981000001",
    },
    {
      id: "2d61cf91-f83d-4be9-9d85-476d099a4a43",
      groupId: firstGroupId,
      displayName: "Ana Martinez",
      phone: "+595981000002",
    },
    {
      id: "f4e90aa1-c43e-4f3d-b42a-c537a49148fc",
      groupId: secondGroupId,
      displayName: "Rosa Benitez",
      phone: "+595981000003",
    },
  ])
  .onConflictDoNothing();

console.log("Seeded Diaconia foundation demo data.");
