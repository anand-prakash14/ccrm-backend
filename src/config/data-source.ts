// 1. Node built-ins
// (none)

// 2. Third-party
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// 3. Internal
import { env } from '@/config/env';
import { ActivityLog } from '@/entities/ActivityLog.entity';
import { AppUser } from '@/entities/AppUser.entity';
import { Conclusion } from '@/entities/Conclusion.entity';
import { Lead } from '@/entities/Lead.entity';
import { Role } from '@/entities/Role.entity';
import { SiteVisit } from '@/entities/SiteVisit.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  poolSize: env.DB_POOL_MAX,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [Role, AppUser, Lead, SiteVisit, Conclusion, ActivityLog],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
