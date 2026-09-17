// 3. Internal
import { AppDataSource } from '@/config/data-source';
import { ActivityLogRepository } from '@/repositories/activity-log.repository';
import { BhkTypeRepository } from '@/repositories/bhk-type.repository';
import { ConclusionRepository } from '@/repositories/conclusion.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { PropertyRepository } from '@/repositories/property.repository';
import { RoleRepository } from '@/repositories/role.repository';
import { SiteVisitPropertyRepository } from '@/repositories/site-visit-property.repository';
import { SiteVisitRepository } from '@/repositories/site-visit.repository';
import { UserRepository } from '@/repositories/user.repository';
import { ActivityLogService } from '@/services/activity-log.service';
import { AuthService } from '@/services/auth.service';
import { BhkTypeService } from '@/services/bhk-type.service';
import { ConclusionService } from '@/services/conclusion.service';
import { LeadService } from '@/services/lead.service';
import { PropertyService } from '@/services/property.service';
import { SiteVisitService } from '@/services/site-visit.service';
import { UserService } from '@/services/user.service';

export const userRepository = new UserRepository(AppDataSource);
export const roleRepository = new RoleRepository(AppDataSource);
export const leadRepository = new LeadRepository(AppDataSource);
export const activityLogRepository = new ActivityLogRepository(AppDataSource);
export const siteVisitRepository = new SiteVisitRepository(AppDataSource);
export const conclusionRepository = new ConclusionRepository(AppDataSource);
export const bhkTypeRepository = new BhkTypeRepository(AppDataSource);
export const propertyRepository = new PropertyRepository(AppDataSource);
export const siteVisitPropertyRepository = new SiteVisitPropertyRepository(AppDataSource);

export const authService = new AuthService(userRepository);
export const userService = new UserService(userRepository, roleRepository);
export const leadService = new LeadService(leadRepository, activityLogRepository, userRepository);
export const siteVisitService = new SiteVisitService(
  leadRepository,
  siteVisitRepository,
  siteVisitPropertyRepository,
  propertyRepository,
  activityLogRepository,
  userRepository,
);
export const conclusionService = new ConclusionService(
  leadRepository,
  conclusionRepository,
  activityLogRepository,
);
export const activityLogService = new ActivityLogService(leadRepository, activityLogRepository);
export const bhkTypeService = new BhkTypeService(bhkTypeRepository);
export const propertyService = new PropertyService(propertyRepository, bhkTypeRepository);
