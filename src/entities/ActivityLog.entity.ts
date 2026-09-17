// 2. Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 3. Internal
import { AppUser } from '@/entities/AppUser.entity';
import { Lead } from '@/entities/Lead.entity';

export enum ActivityLogEntryType {
  NOTE = 'note',
  CALL_LOG = 'call_log',
  STAGE_CHANGE = 'stage_change',
  SITE_VISIT_FEEDBACK = 'site_visit_feedback',
}

/**
 * Append-only history of every note, call log, stage transition, and Site
 * Visit feedback entry for a lead, independent of its current stage.
 * `isAgentInitiated` distinguishes conversational-agent writes from Web
 * Frontend writes without a separate audit system (FR-35).
 */
@Entity('activity_log')
@Index('idx_activity_log_lead_id_created_at', ['leadId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId!: string;

  @ManyToOne(() => Lead, (lead) => lead.activityLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @Column({ name: 'entry_type', type: 'enum', enum: ActivityLogEntryType })
  entryType!: ActivityLogEntryType;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @ManyToOne(() => AppUser, (user) => user.activityLogEntries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: AppUser;

  @Column({ name: 'is_agent_initiated', type: 'boolean', default: false })
  isAgentInitiated!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
