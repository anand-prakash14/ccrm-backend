// 1. Node built-ins
// (none)

// 2. Third-party
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// 3. Internal
import { env } from '@/config/env';
import { ActivityLog } from '@/entities/ActivityLog.entity';
import { AppUser } from '@/entities/AppUser.entity';
import { BhkType } from '@/entities/BhkType.entity';
import { Conclusion } from '@/entities/Conclusion.entity';
import { Lead } from '@/entities/Lead.entity';
import { Property } from '@/entities/Property.entity';
import { Role } from '@/entities/Role.entity';
import { SiteVisit } from '@/entities/SiteVisit.entity';
import { SiteVisitProperty } from '@/entities/SiteVisitProperty.entity';
import { InitSchema1758096000000 } from '../../migrations/1758096000000-InitSchema';
import { SeedRoles1758096000001 } from '../../migrations/1758096000001-SeedRoles';
import { SeedBootstrapAdmin1758096000002 } from '../../migrations/1758096000002-SeedBootstrapAdmin';
import { PropertyMasterData1758096000003 } from '../../migrations/1758096000003-PropertyMasterData';

// Migrations are imported directly rather than referenced via a glob
// string ('migrations/*.ts') — a glob resolves relative to process.cwd()
// at runtime, which works under the ts-node-backed CLI (dev, tests) but
// breaks under the compiled production build (dist/), where no .ts files
// exist to match. Explicit imports resolve correctly either way.
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  poolSize: env.DB_POOL_MAX,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [
    Role,
    AppUser,
    Lead,
    SiteVisit,
    Conclusion,
    ActivityLog,
    BhkType,
    Property,
    SiteVisitProperty,
  ],
  migrations: [
    InitSchema1758096000000,
    SeedRoles1758096000001,
    SeedBootstrapAdmin1758096000002,
    PropertyMasterData1758096000003,
  ],
  migrationsTableName: 'typeorm_migrations',
});
