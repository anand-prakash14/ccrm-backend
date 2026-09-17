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
} from 'typeorm';

// 3. Internal
import { AppUser } from '@/entities/AppUser.entity';
import { Lead } from '@/entities/Lead.entity';
import { SiteVisitProperty } from '@/entities/SiteVisitProperty.entity';

export enum SiteVisitStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  NO_SHOW = 'No-show',
  RESCHEDULED = 'Rescheduled',
}

/**
 * One or more scheduled/completed site visits under a lead. `visitFeedback`
 * is nullable at the DB level; the application layer (Site Visit service,
 * see later stories) enforces it as required when status = Completed.
 */
@Entity('site_visit')
export class SiteVisit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  @Index('idx_site_visit_lead_id')
  leadId!: string;

  @ManyToOne(() => Lead, (lead) => lead.siteVisits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ name: 'accompanying_saleman_id', type: 'uuid', nullable: true })
  accompanyingSalemanId!: string | null;

  @ManyToOne(() => AppUser, (user) => user.accompaniedSiteVisits, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'accompanying_saleman_id' })
  accompanyingSaleman!: AppUser | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SiteVisitStatus,
    default: SiteVisitStatus.SCHEDULED,
  })
  status!: SiteVisitStatus;

  @Column({ name: 'visit_feedback', type: 'text', nullable: true })
  visitFeedback!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => SiteVisitProperty, (siteVisitProperty) => siteVisitProperty.siteVisit)
  attachedProperties!: SiteVisitProperty[];
}
