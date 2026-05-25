import { z } from "zod";

export const adminUserRoleSchema = z.enum(["facilitator", "admin", "chaplain"]);
export const userRoleSchema = z.enum(["admin", "facilitator", "chaplain", "member"]);
export type AdminUserRole = z.infer<typeof adminUserRoleSchema>;

export const createUserSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(4).nullable().optional(),
  role: userRoleSchema.default("member"),
  status: z.enum(["invited", "active", "disabled"]).default("invited"),
  authSubject: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(4).nullable().optional(),
  role: userRoleSchema.optional(),
  status: z.enum(["invited", "active", "disabled"]).optional(),
  authSubject: z.string().nullable().optional(),
});

export function isRole(user: { role: string } | null | undefined, expectedRole: AdminUserRole): boolean {
  return user?.role === expectedRole;
}

export function validateRole(
  user: { role: string } | null | undefined,
  expectedRole: AdminUserRole,
  label: string,
): string | null {
  return isRole(user, expectedRole) ? null : `${label} must have ${expectedRole} role`;
}
