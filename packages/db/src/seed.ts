import { createDatabase } from "./client";
import { attendees, groups, users } from "./schema";

const db = createDatabase();

const facilitatorId = "55faf062-c862-4449-85a8-a97e14886b1d";
const firstGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
const secondGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";
const staffGroupId = "c4f8e2a1-3b7d-4e9f-a2c5-8d1e6b3f7a90";

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
    {
      id: staffGroupId,
      name: "Equipo Diaconía",
      community: "Asunción",
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
    { id: "a1e3c5b7-d9f2-4a8c-b6e0-2f4d8a0c6e2b", groupId: staffGroupId, displayName: "Judah Mooney" },
    { id: "b2f4d6c8-e0a3-5b9d-c7f1-3a5e9b1d7f3c", groupId: staffGroupId, displayName: "Alexis Aquino" },
    { id: "c3a5e7d9-f1b4-6c0e-d8a2-4b6f0c2e8a4d", groupId: staffGroupId, displayName: "Angel Ayala" },
    { id: "d4b6f8e0-a2c5-7d1f-e9b3-5c7a1d3f9b5e", groupId: staffGroupId, displayName: "Javier Romero" },
    { id: "e5c7a9f1-b3d6-8e2a-f0c4-6d8b2e4a0c6f", groupId: staffGroupId, displayName: "Matias Fariña" },
    { id: "f6d8b0a2-c4e7-9f3b-a1d5-7e9c3f5b1d7a", groupId: staffGroupId, displayName: "Gissela Trevison" },
    { id: "a7e9c1b3-d5f8-0a4c-b2e6-8f0d4a6c2e8b", groupId: staffGroupId, displayName: "Catherine Gadda" },
    { id: "b8f0d2c4-e6a9-1b5d-c3f7-9a1e5b7d3f9c", groupId: staffGroupId, displayName: "Gustavo Colmán" },
    { id: "c9a1e3d5-f7b0-2c6e-d4a8-0b2f6c8e4a0d", groupId: staffGroupId, displayName: "Américo Fiori" },
    { id: "d0b2f4e6-a8c1-3d7f-e5b9-1c3a7d9f5b1e", groupId: staffGroupId, displayName: "Kelsie Morgan Jeon" },
    { id: "e1c3a5f7-b9d2-4e8a-f6c0-2d4b8e0a6c2f", groupId: staffGroupId, displayName: "DeWayne Lane" },
  ])
  .onConflictDoNothing();

console.log("Seeded Diaconia foundation demo data.");
