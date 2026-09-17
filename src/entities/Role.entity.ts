// 2. Third-party
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

// 3. Internal
import { AppUser } from '@/entities/AppUser.entity';

export enum RoleName {
  SALES_MAN = 'SalesMan',
  ADMIN = 'Admin',
}

/**
 * Roles are modeled as data (CA-42), not a hardcoded enum, so additional
 * roles can be added later without a schema migration. `RoleName` above is
 * used only for the two launch roles seeded by the SeedRoles migration —
 * role membership checks at runtime resolve against this table, not the enum.
 */
@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => AppUser, (user) => user.role)
  users!: AppUser[];
}
