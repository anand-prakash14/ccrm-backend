// 2. Third-party
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

// 3. Internal
import { env } from '@/config/env';
import { UnauthorizedError } from '@/errors/app.errors';
import { UserRepository } from '@/repositories/user.repository';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Validates email/password against app_user.password_hash and is_active,
   * then issues a JWT (CA-138). Unknown email, wrong password, and an
   * inactive account all fail with the same message/status — no signal is
   * given that distinguishes them, to avoid user enumeration.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = jwt.sign({ sub: user.id, role: user.role.name }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    };
  }
}
