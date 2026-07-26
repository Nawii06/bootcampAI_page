import { z } from "zod";
import { RoleCodeSchema } from "./common";

export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  loginId: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(RoleCodeSchema).min(1),
});

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

export const SessionResponseSchema = z.object({
  user: AuthenticatedUserSchema.extend({
    studentId: z.string().uuid().optional(),
    departmentCode: z.string().optional(),
    grade: z.string().optional(),
  }),
});
