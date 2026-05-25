import type { LocalGroup, LocalMember } from "./types";

export const adminUserId = "019e606b-ce98-7134-b1d1-958703c36595";
export const facilitatorUserId = "019e606b-ce9a-7217-a2af-b3aff656a78b";
export const chaplainUserId = "019e606b-ce9a-7217-a2af-b6db0b3fa660";

export const seedGroups: LocalGroup[] = [
  {
    id: "019e606b-ce9a-7217-a2af-c8c18b19c27e",
    name: "Grupo Mujeres Emprendedoras",
    community: "Caaguazú",
    facilitatorId: facilitatorUserId,
    chaplainUserId,
  },
  {
    id: "019e606b-ce9a-7217-a2af-cd113443806a",
    name: "Comité San Miguel",
    community: "Itapúa",
    facilitatorId: facilitatorUserId,
    chaplainUserId,
  },
];

export const defaultGroupId = "019e606b-ce9a-7217-a2af-c8c18b19c27e";
export const secondaryGroupId = "019e606b-ce9a-7217-a2af-cd113443806a";

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
    id: "019e606b-ce9a-7217-a2af-bb021acfe955",
    groupId: defaultGroupId,
    displayName: "María González",
    email: "maria.gonzalez@diaconia.local",
    phone: "+595****0001",
    role: "member",
    position: "president",
  },
  {
    id: "019e606b-ce9a-7217-a2af-bd89eb528287",
    groupId: defaultGroupId,
    displayName: "Ana Martínez",
    email: "ana.martinez@diaconia.local",
    phone: "+595****0002",
    role: "member",
    position: "secretary",
  },
  {
    id: "019e606b-ce9a-7217-a2af-c7fcf604a791",
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
    id: "019e606b-ce9a-7217-a2af-c16b10a2e4f0",
    groupId: secondaryGroupId,
    displayName: "Rosa Benítez",
    email: "rosa.benitez@diaconia.local",
    phone: "+595****0003",
    role: "member",
    position: "treasurer",
  },
];
