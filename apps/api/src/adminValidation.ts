import { z } from "zod";

export const adminUserRoleSchema = z.enum(["facilitator", "admin", "chaplain"]);
export type AdminUserRole = z.infer<typeof adminUserRoleSchema>;

export const createUserSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(4).nullable().optional(),
  role: adminUserRoleSchema.default("facilitator"),
  cognitoSub: z.string().optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(4).nullable().optional(),
  role: adminUserRoleSchema.optional(),
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
