// 2. Third-party
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

// 3. Internal
import { Property } from '@/entities/Property.entity';
import { SiteVisit } from '@/entities/SiteVisit.entity';

export enum SiteVisitPropertyStatus {
  SCHEDULED = 'Scheduled',
  SEEN = 'Seen',
  SHORTLISTED = 'Shortlisted',
  REJECTED = 'Rejected',
  BOOKED = 'Booked',
}

/**
 * Join table (CA-153/CA-154): one Site Visit can show a buyer several
 * candidate Properties, each tracked independently — distinct from the
 * Site Visit's own overall status (SiteVisitStatus, CA-25).
 */
@Entity('site_visit_property')
@Unique('uq_site_visit_property', ['siteVisitId', 'propertyId'])
export class SiteVisitProperty {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'site_visit_id', type: 'uuid' })
  @Index('idx_site_visit_property_site_visit_id')
  siteVisitId!: string;

  @ManyToOne(() => SiteVisit, (siteVisit) => siteVisit.attachedProperties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_visit_id' })
  siteVisit!: SiteVisit;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @ManyToOne(() => Property, (property) => property.siteVisitAttachments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SiteVisitPropertyStatus,
    default: SiteVisitPropertyStatus.SCHEDULED,
  })
  status!: SiteVisitPropertyStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
