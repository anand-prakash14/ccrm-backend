// 2. Third-party
import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export const CreateUserResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    roleId: z.string().uuid(),
    role: z.string(),
    isActive: z.boolean(),
    // Shown exactly once — the credential-provisioning step referenced by
    // CA-122's Technical Notes; no separate invite/reset flow exists yet.
    temporaryPassword: z.string(),
  }),
});

export const UserListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      role: z.string(),
      isActive: z.boolean(),
    }),
  ),
});

export const UpdateUserRequestSchema = z.object({
  isActive: z.boolean(),
});

export const UpdateUserResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    isActive: z.boolean(),
  }),
});

export const UserIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
