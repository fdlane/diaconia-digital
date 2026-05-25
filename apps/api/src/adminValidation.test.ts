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
        email: "maria@example.com",
        role: "chaplain",
      }).role,
    ).toBe("chaplain");

    expect(updateUserSchema.parse({ role: "chaplain" }).role).toBe("chaplain");
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
