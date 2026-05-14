import type { LocalAttendee, LocalGroup } from "./types";

export const seedGroups: LocalGroup[] = [
  {
    id: "2a86f82b-5f8a-405e-9074-9dc8e4cd32db",
    name: "Grupo Mujeres Emprendedoras",
    community: "Caaguazu",
  },
  {
    id: "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb",
    name: "Comite San Miguel",
    community: "Itapua",
  },
];

export const defaultGroupId = "2a86f82b-5f8a-405e-9074-9dc8e4cd32db";
export const secondaryGroupId = "9f34b54d-3d61-4cd6-b308-6a933e2ee2fb";

export const seedAttendees: LocalAttendee[] = [
  {
    id: "48e2e5fb-c82e-47e9-b1ca-37eaf17123c1",
    groupId: defaultGroupId,
    displayName: "Maria Gonzalez",
    phone: "+595981000001",
  },
  {
    id: "2d61cf91-f83d-4be9-9d85-476d099a4a43",
    groupId: defaultGroupId,
    displayName: "Ana Martinez",
    phone: "+595981000002",
  },
  {
    id: "f4e90aa1-c43e-4f3d-b42a-c537a49148fc",
    groupId: secondaryGroupId,
    displayName: "Rosa Benitez",
    phone: "+595981000003",
  },
];
