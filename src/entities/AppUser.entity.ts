// 2. Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 3. Internal
import { ActivityLog } from '@/entities/ActivityLog.entity';
import { Lead } from '@/entities/Lead.entity';
import { Role } from '@/entities/Role.entity';
import { SiteVisit } from '@/entities/SiteVisit.entity';

/**
 * System users (SalesMan, Admin) who log in and act on leads.
 * `email` is CITEXT at the DB level for case-insensitive uniqueness; the
 * TypeScript type stays `string` — case handling is a Postgres column
 * concern, not an entity-layer one.
 */
@Entity('app_user')
export class AppUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'email', type: 'citext', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'role_id', type: 'uuid' })
  @Index('idx_app_user_role_id')
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Lead, (lead) => lead.assignedSaleman)
  assignedLeads!: Lead[];

  @OneToMany(() => Lead, (lead) => lead.createdBy)
  createdLeads!: Lead[];

  @OneToMany(() => SiteVisit, (siteVisit) => siteVisit.accompanyingSaleman)
  accompaniedSiteVisits!: SiteVisit[];

  @OneToMany(() => ActivityLog, (activityLog) => activityLog.actorUser)
  activityLogEntries!: ActivityLog[];
}
