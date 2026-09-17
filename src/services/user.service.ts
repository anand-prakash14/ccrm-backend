// 1. Node built-ins
import { randomBytes } from 'node:crypto';

// 2. Third-party
import bcrypt from 'bcryptjs';

// 3. Internal
import { AppUser } from '@/entities/AppUser.entity';
import { BadRequestError, ConflictError, NotFoundError } from '@/errors/app.errors';
import { RoleRepository } from '@/repositories/role.repository';
import { UserRepository } from '@/repositories/user.repository';

const TEMPORARY_PASSWORD_BYTES = 12;
const BCRYPT_SALT_ROUNDS = 10;

export interface CreateUserResult {
  user: AppUser;
  temporaryPassword: string;
}

function generateTemporaryPassword(): string {
  return randomBytes(TEMPORARY_PASSWORD_BYTES).toString('base64url');
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  /** Any authenticated user — populates SalesMan pickers and lead filters. */
  async listUsers(): Promise<AppUser[]> {
    return this.userRepository.findAll();
  }

  /**
   * Admin-only (enforced by requireRole at the route level — CA-122).
   * `password_hash` is not client-supplied; a temporary password is
   * generated and returned once, per the HLD's "separate
   * credential-provisioning step" note — no invite/reset story exists yet
   * to hand this off differently.
   */
  async createUser(name: string, email: string, roleId: string): Promise<CreateUserResult> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new BadRequestError(`Role ${roleId} does not exist`);
    }

    if (await this.userRepository.existsByEmail(email)) {
      throw new ConflictError(`A user with email ${email} already exists`);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    const user = await this.userRepository.create({
      name,
      email,
      passwordHash,
      roleId,
      isActive: true,
    });
    user.role = role;

    return { user, temporaryPassword };
  }

  /**
   * Admin-only (enforced by requireRole at the route level — CA-123).
   * Soft-delete only: flips is_active, never cascades to historical
   * lead/activity_log/site_visit rows the user created or acted on.
   */
  async setActive(userId: string, isActive: boolean): Promise<AppUser> {
    const user = await this.userRepository.setActive(userId, isActive);
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`);
    }
    return user;
  }
}
