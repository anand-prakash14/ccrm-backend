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
import { BhkType } from '@/entities/BhkType.entity';
import { decimalTransformer } from '@/entities/transformers/decimal.transformer';
import { SiteVisitProperty } from '@/entities/SiteVisitProperty.entity';

export enum PropertyStatus {
  AVAILABLE = 'Available',
  SOLD = 'Sold',
  BLOCKED = 'Blocked',
  ON_HOLD = 'On-hold',
}

/**
 * Property master data (CA-151/CA-152) — real inventory a Site Visit
 * attaches to, replacing the free-text propertyProject/units fields that
 * used to live directly on site_visit.
 */
@Entity('property')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'project_name', type: 'varchar', length: 255 })
  projectName!: string;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  @Index('idx_property_city')
  city!: string;

  @Column({ name: 'locality', type: 'varchar', length: 255 })
  @Index('idx_property_locality')
  locality!: string;

  @Column({ name: 'bhk_type_id', type: 'uuid' })
  @Index('idx_property_bhk_type_id')
  bhkTypeId!: string;

  @ManyToOne(() => BhkType, (bhkType) => bhkType.properties, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bhk_type_id' })
  bhkType!: BhkType;

  @Column({
    name: 'area_sqft',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  areaSqft!: number | null;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 19,
    scale: 4,
    transformer: decimalTransformer,
  })
  price!: number;

  @Column({ name: 'status', type: 'enum', enum: PropertyStatus, default: PropertyStatus.AVAILABLE })
  @Index('idx_property_status')
  status!: PropertyStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => SiteVisitProperty, (siteVisitProperty) => siteVisitProperty.property)
  siteVisitAttachments!: SiteVisitProperty[];
}
