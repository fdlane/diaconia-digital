import type { LocalGroup, LocalMember } from "./types";

export const adminUserId = "55faf062-c862-4449-85a8-a97e14886b1d";
export const facilitatorUserId = "87bb00ed-6a12-451d-93b5-77ab36bded73";
export const chaplainUserId = "fc96a375-777c-4613-8d35-f2b0e9bd2d25";

export const seedGroups: LocalGroup[] = [
  {
    id: "2a86f82b-5f8a-405e-9074-9dc8e4cd32db",
    name: "Grupo Mujeres Emprendedoras",
    community: "Caaguazú",
    facilitatorId: facilitatorUserId,
    chaplainUserId,
  },
  {
    id: "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb",
    name: "Comité San Miguel",
    community: "Itapúa",
    facilitatorId: facilitatorUserId,
    chaplainUserId,
  },
];

export const defaultGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
export const secondaryGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";

export const seedMembers: LocalMember[] = [
  {
    id: facilitatorUserId,
    groupId: defaultGroupId,
    displayName: "Facilitadora Demo",
    email: "facilitadora@diaconia.local",
    phone: "+595****0000",
    role: "facilitator",
  },
  {
    id: "48e2e5fb-c82e-47e9-b1ca-37eaf17123c1",
    groupId: defaultGroupId,
    displayName: "María González",
    email: "maria.gonzalez@diaconia.local",
    phone: "+595****0001",
    role: "member",
    position: "president",
  },
  {
    id: "2d61cf91-f83d-4be9-9d85-476d099a4a43",
    groupId: defaultGroupId,
    displayName: "Ana Martínez",
    email: "ana.martinez@diaconia.local",
    phone: "+595****0002",
    role: "member",
    position: "secretary",
  },
  {
    id: "03d0bb46-0e6a-442e-bf43-e3909a34dff1",
    groupId: defaultGroupId,
    displayName: "Lidia Franco",
    email: "lidia.franco@diaconia.local",
    phone: "+595****0004",
    role: "member",
  },
  {
    id: facilitatorUserId,
    groupId: secondaryGroupId,
    displayName: "Facilitadora Demo",
    email: "facilitadora@diaconia.local",
    phone: "+595****0000",
    role: "facilitator",
  },
  {
    id: "f4e90aa1-c43e-4f3d-b42a-c537a49148fc",
    groupId: secondaryGroupId,
    displayName: "Rosa Benítez",
    email: "rosa.benitez@diaconia.local",
    phone: "+595****0003",
    role: "member",
    position: "treasurer",
  },
];
