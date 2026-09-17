// 2. Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 3. Internal
import { decimalTransformer } from '@/entities/transformers/decimal.transformer';
import { ActivityLog } from '@/entities/ActivityLog.entity';
import { AppUser } from '@/entities/AppUser.entity';
import { Conclusion } from '@/entities/Conclusion.entity';
import { SiteVisit } from '@/entities/SiteVisit.entity';

export enum LeadSource {
  WALK_IN = 'Walk-in',
  WEBSITE = 'Website',
  PROPERTY_PORTAL = 'Property Portal',
  REFERRAL = 'Referral',
  COLD_CALL = 'Cold Call',
  SOCIAL = 'Social',
}

export enum LeadStage {
  ENQUIRY = 'Enquiry',
  LEAD = 'Lead',
  OPPORTUNITY = 'Opportunity',
  SITE_VISIT = 'Site Visit',
  CONCLUSION = 'Conclusion',
}

/**
 * The single shared record for a buyer moving through the 5-stage pipeline
 * (Enquiry -> Lead -> Opportunity -> Site Visit -> Conclusion). Fields
 * accumulate as the lead advances stages, per HLD Datamodel/ERD.
 */
@Entity('lead')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternatePhone!: string | null;

  @Column({ name: 'email', type: 'citext', nullable: true })
  email!: string | null;

  @Column({ name: 'source', type: 'enum', enum: LeadSource })
  @Index('idx_lead_source')
  source!: LeadSource;

  @Column({ name: 'stage', type: 'enum', enum: LeadStage, default: LeadStage.ENQUIRY })
  @Index('idx_lead_stage')
  stage!: LeadStage;

  @Column({ name: 'property_type', type: 'varchar', length: 50, nullable: true })
  propertyType!: string | null;

  @Column({ name: 'preferred_locations', type: 'varchar', length: 255, nullable: true })
  preferredLocations!: string | null;

  @Column({ name: 'lead_temperature', type: 'varchar', length: 20, nullable: true })
  leadTemperature!: string | null;

  @Column({ name: 'assigned_saleman_id', type: 'uuid', nullable: true })
  @Index('idx_lead_assigned_saleman_id')
  assignedSalemanId!: string | null;

  @ManyToOne(() => AppUser, (user) => user.assignedLeads, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_saleman_id' })
  assignedSaleman!: AppUser | null;

  @Column({
    name: 'budget_min',
    type: 'numeric',
    precision: 19,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  budgetMin!: number | null;

  @Column({
    name: 'budget_max',
    type: 'numeric',
    precision: 19,
    scale: 4,
    nullable: true,
    transformer: decimalTransformer,
  })
  budgetMax!: number | null;

  @Column({ name: 'purpose', type: 'varchar', length: 100, nullable: true })
  purpose!: string | null;

  @Column({ name: 'financing_status', type: 'varchar', length: 50, nullable: true })
  financingStatus!: string | null;

  @Column({ name: 'purchase_timeline', type: 'varchar', length: 50, nullable: true })
  purchaseTimeline!: string | null;

  @Column({ name: 'requirement_notes', type: 'text', nullable: true })
  requirementNotes!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => AppUser, (user) => user.createdLeads, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => SiteVisit, (siteVisit) => siteVisit.lead)
  siteVisits!: SiteVisit[];

  @OneToOne(() => Conclusion, (conclusion) => conclusion.lead)
  conclusion!: Conclusion | null;

  @OneToMany(() => ActivityLog, (activityLog) => activityLog.lead)
  activityLog!: ActivityLog[];
}
