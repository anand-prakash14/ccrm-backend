// 3. Internal
import { AppDataSource } from '@/config/data-source';
import { RoleRepository } from '@/repositories/role.repository';
import { UserRepository } from '@/repositories/user.repository';
import { AuthService } from '@/services/auth.service';

export const userRepository = new UserRepository(AppDataSource);
export const roleRepository = new RoleRepository(AppDataSource);

export const authService = new AuthService(userRepository);
