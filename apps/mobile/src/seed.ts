import type { LocalAttendee, LocalGroup } from "./types";

export const adminUserId = "55faf062-c862-4449-85a8-a97e14886b1d";
export const facilitatorUserId = "1bd2ccb3-8225-4e91-92fe-ec1cb711c215";

export const seedGroups: LocalGroup[] = [
  {
    id: "2a86f82b-5f8a-405e-9074-9dc8e4cd32db",
    name: "Grupo Mujeres Emprendedoras",
    community: "Caaguazú",
    facilitatorId: facilitatorUserId,
  },
  {
    id: "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb",
    name: "Comité San Miguel",
    community: "Itapúa",
    facilitatorId: facilitatorUserId,
  },
];

export const defaultGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
export const secondaryGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";

export const seedAttendees: LocalAttendee[] = [
  {
    id: "48e2e5fb-c82e-47e9-b1ca-37eaf17123c1",
    groupId: defaultGroupId,
    displayName: "María González",
    phone: "+595****0001",
    isFacilitator: true,
  },
  {
    id: "2d61cf91-f83d-4be9-9d85-476d099a4a43",
    groupId: defaultGroupId,
    displayName: "Ana Martínez",
    phone: "+595****0002",
  },
  {
    id: "03d0bb46-0e6a-442e-bf43-e3909a34dff1",
    groupId: defaultGroupId,
    displayName: "Lidia Franco",
    phone: "+595****0004",
  },
  {
    id: "f4e90aa1-c43e-4f3d-b42a-c537a49148fc",
    groupId: secondaryGroupId,
    displayName: "Rosa Benítez",
    phone: "+595****0003",
    isFacilitator: true,
  },
];
