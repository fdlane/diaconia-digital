import { describe, expect, it } from "vitest";
import {
  createUserSchema,
  isRole,
  updateUserSchema,
  validateRole,
} from "./adminValidation.js";

describe("admin user validation", () => {
  it("allows creating and updating chaplain users", () => {
    expect(
      createUserSchema.parse({
        displayName: "Chaplain Maria",
        phone: "+595981000000",
        role: "chaplain",
      }).role,
    ).toBe("chaplain");

    expect(updateUserSchema.parse({ role: "chaplain" }).role).toBe("chaplain");
  });

  it("normalizes Paraguay phone numbers and allows optional email", () => {
    const created = createUserSchema.parse({
      displayName: "Maria",
      phone: "0981 000 000",
    });

    expect(created.email).toBeUndefined();
    expect(created.phone).toBe("+595981000000");

    expect(updateUserSchema.parse({ email: null, phone: "595981000001" })).toMatchObject({
      email: null,
      phone: "+595981000001",
    });
  });
});

describe("role validation", () => {
  it("requires facilitators and chaplains to have the expected roles", () => {
    expect(isRole({ role: "facilitator" }, "facilitator")).toBe(true);
    expect(isRole({ role: "admin" }, "facilitator")).toBe(false);
    expect(isRole({ role: "chaplain" }, "chaplain")).toBe(true);
    expect(isRole({ role: "facilitator" }, "chaplain")).toBe(false);
  });

  it("returns a useful error when a user has the wrong role", () => {
    expect(validateRole({ role: "admin" }, "facilitator", "Facilitator")).toEqual(
      "Facilitator must have facilitator role",
    );
    expect(validateRole({ role: "facilitator" }, "chaplain", "Chaplain")).toEqual(
      "Chaplain must have chaplain role",
    );
    expect(validateRole({ role: "chaplain" }, "chaplain", "Chaplain")).toBeNull();
  });
});
