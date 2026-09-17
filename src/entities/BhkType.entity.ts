// 2. Third-party
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

// 3. Internal
import { Property } from '@/entities/Property.entity';

/**
 * Data-driven, like `role` (CA-42) — BHK types are seeded (1BHK/2BHK/3BHK/
 * 4BHK/Studio) but not a hardcoded application enum, so new types can be
 * added later without a migration.
 */
@Entity('bhk_type')
export class BhkType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 20, unique: true })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => Property, (property) => property.bhkType)
  properties!: Property[];
}
