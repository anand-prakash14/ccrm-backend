// 3. Internal
import { AppDataSource } from '@/config/data-source';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { ConclusionRepository } from '@/repositories/conclusion.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { RoleRepository } from '@/repositories/role.repository';
import { SiteVisitRepository } from '@/repositories/site-visit.repository';
import { UserRepository } from '@/repositories/user.repository';
import { ActivityLogService } from '@/services/activity-log.service';
import { AuthService } from '@/services/auth.service';
import { ConclusionService } from '@/services/conclusion.service';
import { LeadService } from '@/services/lead.service';
import { SiteVisitService } from '@/services/site-visit.service';
import { UserService } from '@/services/user.service';

export const userRepository = new UserRepository(AppDataSource);
export const roleRepository = new RoleRepository(AppDataSource);
export const leadRepository = new LeadRepository(AppDataSource);
export const activityLogRepository = new ActivityLogRepository(AppDataSource);
export const siteVisitRepository = new SiteVisitRepository(AppDataSource);
export const conclusionRepository = new ConclusionRepository(AppDataSource);

export const authService = new AuthService(userRepository);
export const userService = new UserService(userRepository, roleRepository);
export const leadService = new LeadService(leadRepository, activityLogRepository, userRepository);
export const siteVisitService = new SiteVisitService(
  leadRepository,
  siteVisitRepository,
  activityLogRepository,
  userRepository,
);
export const conclusionService = new ConclusionService(
  leadRepository,
  conclusionRepository,
  activityLogRepository,
);
export const activityLogService = new ActivityLogService(leadRepository, activityLogRepository);
